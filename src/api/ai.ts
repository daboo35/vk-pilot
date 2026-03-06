import { logger } from '@/utils/logger';
import { checkRateLimit } from '@/utils/security';

const MODULE = 'AI';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

interface AiResult {
  ok: boolean;
  content: string;
  demo?: boolean;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry for AI calls
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok) return resp;
      
      // Don't retry on auth errors
      if (resp.status === 401 || resp.status === 403) {
        return resp;
      }
      
      logger.warn(MODULE, `AI attempt ${attempt}/${maxRetries} failed with status ${resp.status}`);
      
      if (attempt < maxRetries && resp.status >= 500) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    } catch (e) {
      logger.warn(MODULE, `AI attempt ${attempt}/${maxRetries} failed:`, e instanceof Error ? e.message : String(e));
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  return null;
}

const DEMO_POSTS: Record<string, string> = {
  default: '🌟 Привет, друзья!\n\nСегодня хочу поделиться с вами чем-то интересным. Каждый день — это возможность сделать что-то новое и удивительное.\n\nРасскажите в комментариях, что нового вы узнали сегодня? 👇\n\n#мотивация #развитие #каждыйденьважен',
  tech: '💻 Технологии будущего уже здесь!\n\nИскусственный интеллект меняет мир быстрее, чем мы думали. Вот 3 тренда, за которыми стоит следить:\n\n1️⃣ Генеративный AI\n2️⃣ Автоматизация процессов\n3️⃣ Персонализация контента\n\nА какие технологии вас впечатляют больше всего? 🤔\n\n#технологии #AI #будущее #инновации',
  business: '📈 5 привычек успешных предпринимателей:\n\n✅ Ранний подъём и утренние ритуалы\n✅ Постоянное обучение и чтение\n✅ Нетворкинг и коммуникации\n✅ Фокус на приоритетах\n✅ Забота о здоровье\n\nКакая привычка у вас уже есть? Пишите в комментах! 💪\n\n#бизнес #успех #предпринимательство',
};

function getDemoPost(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes('техно') || lower.includes('it') || lower.includes('программ')) {
    return DEMO_POSTS.tech;
  }
  if (lower.includes('бизнес') || lower.includes('работ') || lower.includes('успех')) {
    return DEMO_POSTS.business;
  }
  return `📝 ${topic}\n\n${DEMO_POSTS.default}`;
}

function getDemoImprovement(text: string): string {
  return `✨ ${text}\n\n💬 Поделитесь своим мнением в комментариях!\n\n#контент #вовлечённость`;
}

function getDemoHashtags(text: string): string {
  const words = text
    .replace(/[^\wа-яА-ЯёЁ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 6);
  const tags = words.length > 0
    ? words.map(w => `#${w.toLowerCase()}`).join(' ')
    : '#vkpilot #контент #пост #публикация';
  return tags;
}

async function callOpenAI(apiKey: string, prompt: string, systemPrompt: string): Promise<AiResult> {
  if (!checkRateLimit('ai', 10, 60000)) {
    return { ok: false, content: 'Лимит запросов AI (10/мин). Подождите.' };
  }

  // Try via proxy first with retry
  try {
    const proxyResp = await fetchWithRetry('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, systemPrompt, apiKey }),
      signal: AbortSignal.timeout(30000),
    });

    if (proxyResp?.ok) {
      const data = await proxyResp.json();
      if (data.success) {
        return { ok: true, content: data.content, demo: data.demo };
      }
    }
  } catch (e) {
    logger.warn(MODULE, 'Proxy unavailable for AI', e);
  }

  // Try direct OpenAI call with retry
  try {
    const resp = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (resp?.ok) {
      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      return { ok: true, content };
    }

    if (resp) {
      const errData = await resp.json().catch(() => null);
      logger.error(MODULE, 'OpenAI error', errData);
    }
  } catch (e) {
    logger.warn(MODULE, 'Direct OpenAI call failed', e);
  }

  return { ok: false, content: '' };
}

export async function generatePost(topic: string, apiKey: string): Promise<AiResult> {
  if (!apiKey) {
    return { ok: true, content: getDemoPost(topic), demo: true };
  }

  const system = 'Ты — опытный SMM-менеджер. Создавай вовлекающие посты для ВКонтакте на русском языке. Используй эмодзи, структуру, и призыв к действию. Добавь 3-5 хэштегов.';
  const result = await callOpenAI(apiKey, `Напиши пост на тему: ${topic}`, system);

  if (!result.ok) {
    return { ok: true, content: getDemoPost(topic), demo: true };
  }
  return result;
}

export async function improveText(text: string, apiKey: string): Promise<AiResult> {
  if (!apiKey) {
    return { ok: true, content: getDemoImprovement(text), demo: true };
  }

  const system = 'Ты — редактор контента для ВКонтакте. Улучши текст: сделай его более вовлекающим, добавь структуру, эмодзи и призыв к действию. Сохрани смысл.';
  const result = await callOpenAI(apiKey, `Улучши этот пост:\n\n${text}`, system);

  if (!result.ok) {
    return { ok: true, content: getDemoImprovement(text), demo: true };
  }
  return result;
}

export async function generateHashtags(text: string, apiKey: string): Promise<AiResult> {
  if (!apiKey) {
    return { ok: true, content: getDemoHashtags(text), demo: true };
  }

  const system = 'Сгенерируй 5-10 релевантных хэштегов для ВКонтакте на русском и английском. Только хэштеги, каждый через пробел.';
  const result = await callOpenAI(apiKey, `Хэштеги для текста:\n\n${text}`, system);

  if (!result.ok) {
    return { ok: true, content: getDemoHashtags(text), demo: true };
  }
  return result;
}
