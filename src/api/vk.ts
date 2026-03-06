import { logger } from '@/utils/logger';
import { checkRateLimit } from '@/utils/security';

const API_VERSION = '5.199';
const MODULE = 'VK-API';

interface VkResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic for better resilience
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const resp = await fetch(url, options);
      
      // Parse JSON response
      let json: unknown;
      try {
        json = await resp.json();
      } catch {
        json = null;
      }
      
      if (!resp.ok) {
        logger.warn(MODULE, `Attempt ${attempt}/${maxRetries} failed with status ${resp.status}`);
        lastError = new Error(`HTTP ${resp.status}`);
        
        // Don't retry on client errors (4xx)
        if (resp.status >= 400 && resp.status < 500) {
          return { ok: false, status: resp.status, data: json, error: `HTTP ${resp.status}` };
        }
        
        // Retry on server errors (5xx) or network errors
        if (attempt < maxRetries) {
          await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
          continue;
        }
        
        return { ok: false, status: resp.status, data: json, error: `HTTP ${resp.status}` };
      }
      
      return { ok: true, status: resp.status, data: json };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      logger.warn(MODULE, `Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
    }
  }
  
  return { 
    ok: false, 
    status: 0, 
    error: lastError?.message || 'Unknown error' 
  };
}

async function vkRequest<T = unknown>(
  method: string,
  params: Record<string, string>
): Promise<VkResult<T>> {
  if (!checkRateLimit('vk', 30, 60000)) {
    return { ok: false, error: 'Лимит запросов VK API (30/мин). Подождите.' };
  }

  const query = new URLSearchParams({ ...params, v: API_VERSION });

  // Use local proxy only (direct requests blocked by CORS)
  const proxyUrl = `/api/vk/${method}?${query}`;
  
  const result = await fetchWithRetry(proxyUrl, { 
    signal: AbortSignal.timeout(15000) 
  });

  if (!result.ok) {
    logger.error(MODULE, `Proxy request failed: ${result.error}`);
    
    // Check if backend is down
    if (result.status === 0 || result.error?.includes('Failed to fetch')) {
      return {
        ok: false,
        error: 'Бекенд-сервер недоступен. Запустите: node server.js',
      };
    }
    
    return {
      ok: false,
      error: `Ошибка прокси: ${result.error}. Убедитесь, что сервер запущен.`,
    };
  }

  const json = result.data as { error?: { error_msg: string }; response?: T };
  
  if (json?.error) {
    logger.error(MODULE, `VK error: ${json.error.error_msg}`);
    return { ok: false, error: json.error.error_msg || 'Ошибка VK API' };
  }
  
  return { ok: true, data: json?.response as T };
}

export interface VkUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
}

export async function verifyToken(token: string): Promise<VkResult<VkUser[]>> {
  return vkRequest<VkUser[]>('users.get', {
    access_token: token,
    fields: 'photo_100',
  });
}

export async function publishPost(params: {
  token: string;
  text: string;
  target: 'wall' | 'group';
  groupId?: string;
  scheduledAt?: string;
  attachments?: string;
}): Promise<VkResult<{ post_id: number }>> {
  const reqParams: Record<string, string> = {
    access_token: params.token,
    message: params.text,
  };

  if (params.target === 'group' && params.groupId) {
    reqParams.owner_id = `-${params.groupId}`;
    reqParams.from_group = '1';
  }

  if (params.scheduledAt) {
    const ts = Math.floor(new Date(params.scheduledAt).getTime() / 1000);
    reqParams.publish_date = ts.toString();
  }

  if (params.attachments) {
    reqParams.attachments = params.attachments;
  }

  return vkRequest<{ post_id: number }>('wall.post', reqParams);
}

export interface VkGroup {
  id: number;
  name: string;
  photo_100?: string;
}

export async function getGroups(token: string): Promise<VkResult<{ items: VkGroup[] }>> {
  return vkRequest<{ items: VkGroup[] }>('groups.get', {
    access_token: token,
    filter: 'admin,editor',
    extended: '1',
    count: '100',
  });
}

export async function getWallUploadServer(
  token: string,
  groupId?: string
): Promise<VkResult<{ upload_url: string }>> {
  const params: Record<string, string> = { access_token: token };
  if (groupId) params.group_id = groupId;
  return vkRequest<{ upload_url: string }>('photos.getWallUploadServer', params);
}

export async function saveWallPhoto(
  token: string,
  server: string,
  photo: string,
  hash: string,
  groupId?: string
): Promise<VkResult<Array<{ id: number; owner_id: number }>>> {
  const params: Record<string, string> = {
    access_token: token,
    server,
    photo,
    hash,
  };
  if (groupId) params.group_id = groupId;
  return vkRequest<Array<{ id: number; owner_id: number }>>('photos.saveWallPhoto', params);
}

export async function uploadPhotoViaProxy(
  uploadUrl: string,
  base64Data: string
): Promise<VkResult<{ server: string; photo: string; hash: string }>> {
  try {
    const resp = await fetch('/api/vk/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Upload-URL': uploadUrl,
      },
      body: JSON.stringify({ photo: base64Data }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({ error: 'Upload failed' }));
      logger.error(MODULE, 'Photo upload HTTP error', resp.status, errBody);
      return { ok: false, error: `Ошибка загрузки: ${errBody.error || resp.statusText}` };
    }

    const data = await resp.json();

    // VK returns server, photo, hash after upload
    if (data.server !== undefined && data.photo !== undefined && data.hash !== undefined) {
      return {
        ok: true,
        data: {
          server: String(data.server),
          photo: data.photo,
          hash: data.hash,
        },
      };
    }

    logger.error(MODULE, 'Unexpected upload response', data);
    return { ok: false, error: 'Неожиданный ответ от VK при загрузке фото' };
  } catch (e) {
    logger.error(MODULE, 'Photo upload failed', e);
    return { ok: false, error: 'Загрузка фото не удалась. Проверьте, запущен ли бекенд-сервер.' };
  }
}

// ─── File to Base64 helper ───────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

// ─── Upload multiple photos and return attachment string ──
export async function uploadPhotosForPost(params: {
  token: string;
  files: File[];
  groupId?: string;
  onProgress?: (current: number, total: number, status: string) => void;
}): Promise<VkResult<string>> {
  const { token, files, groupId, onProgress } = params;
  const attachments: string[] = [];

  logger.info(MODULE, `Starting upload of ${files.length} photo(s)`);

  // Check if backend is available
  try {
    const healthResp = await fetch('/api/health', {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthResp.ok) {
      return {
        ok: false,
        error: 'Бекенд-сервер недоступен. Запустите: node server.js',
      };
    }
  } catch {
    return {
      ok: false,
      error: 'Бекенд-сервер не отвечает. Запустите: node server.js',
    };
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const num = i + 1;

    // Step 1: Get upload URL from VK
    onProgress?.(num, files.length, `Получение URL загрузки для фото ${num}...`);
    logger.info(MODULE, `[${num}/${files.length}] Getting upload URL`);

    const serverResult = await getWallUploadServer(token, groupId);
    if (!serverResult.ok || !serverResult.data) {
      logger.error(MODULE, `Failed to get upload URL for photo ${num}`, serverResult.error);
      return {
        ok: false,
        error: `Фото ${num}: ошибка получения URL загрузки — ${serverResult.error}`,
      };
    }

    const uploadUrl = serverResult.data.upload_url;
    logger.info(MODULE, `[${num}/${files.length}] Upload URL received`);

    // Step 2: Convert file to base64
    onProgress?.(num, files.length, `Конвертация фото ${num}...`);
    let base64: string;
    try {
      base64 = await fileToBase64(file);
      logger.info(MODULE, `[${num}/${files.length}] Converted to base64: ${(base64.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      logger.error(MODULE, `Failed to read file ${num}`, e);
      return { ok: false, error: `Фото ${num}: ошибка чтения файла` };
    }

    // Step 3: Upload via proxy
    onProgress?.(num, files.length, `Загрузка фото ${num} на сервер VK...`);
    logger.info(MODULE, `[${num}/${files.length}] Uploading via proxy`);

    const uploadResult = await uploadPhotoViaProxy(uploadUrl, base64);
    if (!uploadResult.ok || !uploadResult.data) {
      logger.error(MODULE, `Upload failed for photo ${num}`, uploadResult.error);
      return {
        ok: false,
        error: `Фото ${num}: ${uploadResult.error || 'ошибка загрузки'}`,
      };
    }

    logger.info(MODULE, `[${num}/${files.length}] Uploaded, saving to VK`);

    // Step 4: Save wall photo
    onProgress?.(num, files.length, `Сохранение фото ${num} в VK...`);

    const saveResult = await saveWallPhoto(
      token,
      uploadResult.data.server,
      uploadResult.data.photo,
      uploadResult.data.hash,
      groupId
    );

    if (!saveResult.ok || !saveResult.data || saveResult.data.length === 0) {
      logger.error(MODULE, `Save failed for photo ${num}`, saveResult.error);
      return {
        ok: false,
        error: `Фото ${num}: ошибка сохранения — ${saveResult.error || 'нет данных'}`,
      };
    }

    const savedPhoto = saveResult.data[0];
    const attachment = `photo${savedPhoto.owner_id}_${savedPhoto.id}`;
    attachments.push(attachment);

    logger.info(MODULE, `[${num}/${files.length}] ✓ Saved: ${attachment}`);

    // Rate limiting delay between uploads (VK has 3 req/sec limit)
    if (i < files.length - 1) {
      onProgress?.(num, files.length, `Ожидание перед следующим фото...`);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  const result = attachments.join(',');
  logger.info(MODULE, `All photos uploaded. Attachments: ${result}`);
  return { ok: true, data: result };
}

// ─── Backend health check with retry ────────────────────────────────
const HEALTH_CHECK_RETRIES = 2;

export async function checkBackendHealth(): Promise<boolean> {
  for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return true;
      }
    } catch {
      logger.warn(MODULE, `Health check attempt ${attempt}/${HEALTH_CHECK_RETRIES} failed`);
      if (attempt < HEALTH_CHECK_RETRIES) {
        await new Promise(r => setTimeout(r, 500 * attempt));
      }
    }
  }
  return false;
}
