/**
 * VK Bridge инициализация и утилиты
 * 
 * Документация: https://vkcom.github.io/vk-bridge/
 * GitHub: https://github.com/VKCOM/vk-bridge
 * 
 * Использование:
 * 1. Вызвать init() при старте приложения
 * 2. Проверить isAvailable() перед использованием методов
 * 3. Использовать send() для вызова методов VK
 */

import vkBridge from '@vkontakte/vk-bridge';

// VK App ID (из настроек VK приложения)
const VK_APP_ID = 54473005;

// Типы для результатов
export interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  photo_200?: string;
}

export interface VKAuthResult {
  accessToken: string;
  expiresIn: number;
  userId: number;
}

export interface VKPostResult {
  post_id: number;
}

export interface VKPhotoUploadResult {
  photo: string;
  server: number;
  hash: string;
}

// Состояние инициализации
let isInitialized = false;
let isVKClient = false;

/**
 * Инициализировать VK Bridge
 * Вызывать при старте приложения
 * Не блокирует, если VK недоступен
 */
export async function init(): Promise<boolean> {
  if (isInitialized) {
    return isVKClient;
  }

  try {
    // Проверяем, запущено ли приложение внутри VK
    isVKClient = vkBridge.isWebView();

    if (!isVKClient) {
      // Не инициализируем VK Bridge если не в VK клиенте
      console.log('[VK Bridge] Запуск вне VK — инициализация пропущена');
      isInitialized = true;
      return false;
    }

    // Инициализируем VK Bridge с timeout
    const initPromise = vkBridge.send('VKWebAppInit');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('VK Bridge timeout')), 3000)
    );

    await Promise.race([initPromise, timeoutPromise]);

    isInitialized = true;
    console.log('[VK Bridge] Инициализация успешна');

    return true;
  } catch (error) {
    console.warn('[VK Bridge] Ошибка инициализации (возможно запуск вне VK):', error);
    isInitialized = true;
    isVKClient = false;
    return false;
  }
}

/**
 * Проверить, доступен ли VK Bridge
 */
export function isAvailable(): boolean {
  return isInitialized && isVKClient;
}

/**
 * Проверить, запущено ли приложение внутри VK
 * Работает БЕЗ инициализации — использует vkBridge напрямую
 */
export function isRunningInVK(): boolean {
  try {
    return vkBridge.isWebView();
  } catch {
    return false;
  }
}

/**
 * Получить токен доступа
 * 
 * @param scope - Права доступа (например: 'wall,photos,groups')
 * @returns Токен или null если ошибка
 */
export async function getAuthToken(scope: string = 'wall,photos,groups'): Promise<VKAuthResult | null> {
  if (!isInitialized) {
    await init();
  }

  try {
    const result = await vkBridge.send('VKWebAppGetAuthToken', {
      app_id: VK_APP_ID,
      scope: scope,
    });

    // Приводим типы вручную, так как типы VK Bridge неполные
    const typedResult = result as unknown as {
      access_token: string;
      expires: number;
      user_id?: number;
    };

    return {
      accessToken: typedResult.access_token,
      expiresIn: typedResult.expires,
      userId: typedResult.user_id || 0,
    };
  } catch (error) {
    console.error('[VK Bridge] Ошибка получения токена:', error);
    return null;
  }
}

/**
 * Опубликовать пост на стене
 * 
 * @param message - Текст поста
 * @param attachments - Вложения (например: 'photo123_456')
 * @param groupId - ID группы (опционально, для публикации в группе)
 * @returns Результат или null если ошибка
 */
export async function postToWall(
  message: string,
  attachments?: string,
  groupId?: string
): Promise<VKPostResult | null> {
  if (!isInitialized) {
    await init();
  }

  try {
    // Формируем параметры
    const params: Record<string, string | number> = {
      message: message,
    };

    if (attachments) {
      params.attachments = attachments;
    }

    if (groupId) {
      params.owner_id = -parseInt(groupId); // Отрицательный ID для групп
      params.from_group = 1;
    }

    // Используем type assertion для вызова
    const result = await (vkBridge.send as unknown as (method: string, params?: Record<string, string | number>) => Promise<unknown>)('VKWebAppShowWallPost', params);
    
    // Приводим результат к ожидаемому типу
    const typedResult = result as unknown as { post_id: number };

    return {
      post_id: typedResult.post_id,
    };
  } catch (error) {
    console.error('[VK Bridge] Ошибка публикации поста:', error);
    return null;
  }
}

/**
 * Загрузить фотографию
 * 
 * @param file - Файл изображения
 * @returns Данные загруженного фото или null если ошибка
 */
export async function uploadPhoto(file: File): Promise<VKPhotoUploadResult | null> {
  if (!isInitialized) {
    await init();
  }

  try {
    // Конвертируем файл в base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Удаляем префикс data:image/...;base64,
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    // Используем type assertion для вызова
    const result = await (vkBridge.send as unknown as (method: string, params?: Record<string, string>) => Promise<unknown>)('VKWebAppUploadPhoto', {
      photo: cleanBase64,
    });
    
    // Приводим результат к ожидаемому типу
    const typedResult = result as unknown as {
      photo: string;
      server: number;
      hash: string;
    };

    return {
      photo: typedResult.photo,
      server: typedResult.server,
      hash: typedResult.hash,
    };
  } catch (error) {
    console.error('[VK Bridge] Ошибка загрузки фото:', error);
    return null;
  }
}

/**
 * Получить информацию о пользователе
 */
export async function getUserInfo(): Promise<VKUser | null> {
  if (!isInitialized) {
    await init();
  }

  try {
    const result = await vkBridge.send('VKWebAppGetUserInfo');
    
    // Приводим к известному типу
    const typedResult = result as unknown as {
      id: number;
      first_name: string;
      last_name: string;
      photo_100?: string;
      photo_200?: string;
    };

    return {
      id: typedResult.id,
      first_name: typedResult.first_name,
      last_name: typedResult.last_name,
      photo_100: typedResult.photo_100,
      photo_200: typedResult.photo_200,
    };
  } catch (error) {
    console.error('[VK Bridge] Ошибка получения информации о пользователе:', error);
    return null;
  }
}

/**
 * Подписаться на события VK Bridge
 */
export function subscribe(handler: (event: { type: string; detail: Record<string, unknown> }) => void): void {
  vkBridge.subscribe(handler as never);
}

/**
 * Проверить поддержку метода
 */
export function supports(method: string): boolean {
  try {
    return vkBridge.supports(method as never);
  } catch {
    return false;
  }
}

// Экспортируем сам vkBridge для расширенного использования
export { vkBridge };
