import { encrypt, decrypt } from '@/utils/security';
import { logger } from '@/utils/logger';

const KEYS = {
  POSTS: 'vkp_posts',
  TEMPLATES: 'vkp_templates',
  VK_TOKEN: 'vkp_vk_token',
  AI_KEY: 'vkp_ai_key',
} as const;

export interface Post {
  id: string;
  text: string;
  target: 'wall' | 'group';
  groupId?: string;
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'error';
  createdAt: string;
  publishedAt?: string;
  error?: string;
  imageCount?: number;
}

export interface Template {
  id: string;
  name: string;
  text: string;
  createdAt: string;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// --- Posts ---
export function getPosts(): Post[] {
  try {
    const raw = localStorage.getItem(KEYS.POSTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    logger.error('Storage', 'getPosts failed', e);
    return [];
  }
}

export function savePosts(posts: Post[]) {
  try {
    localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
  } catch (e) {
    logger.error('Storage', 'savePosts failed', e);
  }
}

export function addPost(data: Omit<Post, 'id' | 'createdAt'>): Post {
  const post: Post = { ...data, id: uid(), createdAt: new Date().toISOString() };
  const posts = getPosts();
  posts.unshift(post);
  savePosts(posts);
  return post;
}

export function updatePost(id: string, patch: Partial<Post>) {
  const posts = getPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx !== -1) {
    posts[idx] = { ...posts[idx], ...patch };
    savePosts(posts);
  }
}

export function deletePost(id: string) {
  savePosts(getPosts().filter(p => p.id !== id));
}

// --- Templates ---
export function getTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(KEYS.TEMPLATES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    logger.error('Storage', 'getTemplates failed', e);
    return [];
  }
}

export function saveTemplates(templates: Template[]) {
  try {
    localStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    logger.error('Storage', 'saveTemplates failed', e);
  }
}

export function addTemplate(name: string, text: string): Template {
  const t: Template = { id: uid(), name, text, createdAt: new Date().toISOString() };
  const all = getTemplates();
  all.unshift(t);
  saveTemplates(all);
  return t;
}

export function updateTemplate(id: string, patch: Partial<Template>) {
  const all = getTemplates();
  const idx = all.findIndex(t => t.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...patch };
    saveTemplates(all);
  }
}

export function deleteTemplate(id: string) {
  saveTemplates(getTemplates().filter(t => t.id !== id));
}

// --- Encrypted Settings (localStorage) ---
// ⚠️ Для продакшена рекомендуется использовать HttpOnly cookies (auth-cookie.ts)

/**
 * Получить VK токен из localStorage
 * @deprecated Для продакшена используйте auth-cookie.ts
 */
export function getVkToken(): string {
  try {
    const enc = localStorage.getItem(KEYS.VK_TOKEN);
    return enc ? decrypt(enc) : '';
  } catch (e) {
    logger.error('Storage', 'getVkToken failed', e);
    return '';
  }
}

/**
 * Сохранить VK токен в localStorage
 * @deprecated Для продакшена используйте auth-cookie.ts
 */
export function setVkToken(token: string) {
  try {
    if (!token) {
      localStorage.removeItem(KEYS.VK_TOKEN);
    } else {
      localStorage.setItem(KEYS.VK_TOKEN, encrypt(token));
    }
    logger.info('Storage', 'VK token saved');
  } catch (e) {
    logger.error('Storage', 'setVkToken failed', e);
  }
}

/**
 * Получить OpenAI ключ из localStorage
 */
export function getAiKey(): string {
  try {
    const enc = localStorage.getItem(KEYS.AI_KEY);
    return enc ? decrypt(enc) : '';
  } catch (e) {
    logger.error('Storage', 'getAiKey failed', e);
    return '';
  }
}

/**
 * Сохранить OpenAI ключ в localStorage
 */
export function setAiKey(key: string) {
  try {
    if (!key) {
      localStorage.removeItem(KEYS.AI_KEY);
    } else {
      localStorage.setItem(KEYS.AI_KEY, encrypt(key));
    }
    logger.info('Storage', 'AI key saved');
  } catch (e) {
    logger.error('Storage', 'setAiKey failed', e);
  }
}

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  logger.info('Storage', 'All data cleared');
}
