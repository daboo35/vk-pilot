/**
 * VK Bridge — единый центр инициализации и работы с VK Mini Apps
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
import { logger } from '@/utils/logger';

const MODULE = 'VK-BRIDGE';
const VK_APP_ID = 54473005;

// ==================== Типы ====================

export interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  photo_200?: string;
  photo_max_orig?: string;
  city?: { id: number; name: string };
  country?: { id: number; name: string };
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

export interface VKGroup {
  id: number;
  name: string;
  photo_50?: string;
  photo_100?: string;
  photo_200?: string;
}

export interface VKInitData {
  isVK: boolean;
  userId?: number;
  groupId?: number;
  platform?: string;
  appId?: number;
}

// ==================== Состояние ====================

let isInitialized = false;
let isVKClient = false;
let initPromise: Promise<boolean> | null = null;
let vkInitData: VKInitData | null = null;

// ==================== Инициализация ====================

/**
 * Получить данные инициализации VK Mini Apps
 */
export function getVKInitData(): VKInitData | null {
  return vkInitData;
}

/**
 * Проверить, запущено ли приложение внутри VK
 */
export function isRunningInVK(): boolean {
  try {
    return vkBridge.isWebView();
  } catch {
    return false;
  }
}

/**
 * Инициализировать VK Bridge
 * Вызывать один раз при старте приложения
 */
export async function init(): Promise<boolean> {
  if (isInitialized) {
    return isVKClient;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      isVKClient = vkBridge.isWebView();

      if (!isVKClient) {
        logger.warn(MODULE, 'Запуск вне VK — инициализация пропущена');
        isInitialized = true;
        vkInitData = { isVK: false };
        return false;
      }

      logger.info(MODULE, 'Запуск внутри VK, инициализация...');

      // Инициализация с timeout
      const initCall = vkBridge.send('VKWebAppInit');
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('VK Bridge timeout (5s)')), 5000)
      );

      await Promise.race([initCall, timeout]);

      // Получаем данные о среде выполнения
      try {
        const initData = vkBridge.getWebviewData() as Record<string, unknown>;
        vkInitData = {
          isVK: true,
          userId: initData?.['user_id'] as number | undefined,
          groupId: initData?.['group_id'] as number | undefined,
          platform: initData?.['platform'] as string | undefined,
          appId: initData?.['app_id'] as number | undefined,
        };
        logger.info(MODULE, 'VK Init Data', vkInitData);
      } catch (e) {
        logger.warn(MODULE, 'Не удалось получить webview data', e);
        vkInitData = { isVK: true };
      }

      isInitialized = true;
      logger.info(MODULE, 'Инициализация успешна');
      return true;
    } catch (error) {
      logger.error(MODULE, 'Ошибка инициализации', error);
      isInitialized = true;
      isVKClient = false;
      vkInitData = { isVK: false };
      return false;
    }
  })();

  return initPromise;
}

/**
 * Проверить, доступен ли VK Bridge
 */
export function isAvailable(): boolean {
  return isInitialized && isVKClient;
}

/**
 * Проверить, запущено ли приложение в сообществе VK
 */
export function isRunningInGroup(): boolean {
  return isVKClient && (vkInitData?.groupId ?? 0) > 0;
}

/**
 * Получить ID текущего сообщества
 */
export function getGroupId(): number | undefined {
  return vkInitData?.groupId;
}

// ==================== Авторизация ====================

/**
 * Получить токен доступа
 * @param scope - Права доступа (например: 'wall,photos,groups')
 */
export async function getAuthToken(scope = 'wall,photos,groups'): Promise<VKAuthResult | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.warn(MODULE, 'Получение токена вне VK невозможно');
    return null;
  }

  try {
    const result = await vkBridge.send('VKWebAppGetAuthToken', {
      app_id: VK_APP_ID,
      scope,
    });

    const typed = result as { access_token: string; expires: number; user_id?: number };

    return {
      accessToken: typed.access_token,
      expiresIn: typed.expires,
      userId: typed.user_id || 0,
    };
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения токена', error);
    return null;
  }
}

// ==================== Пользователь ====================

/**
 * Получить информацию о пользователе
 */
export async function getUserInfo(): Promise<VKUser | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.warn(MODULE, 'Получение инфо о пользователе вне VK невозможно');
    return null;
  }

  try {
    const result = await vkBridge.send('VKWebAppGetUserInfo');
    const typed = result as VKUser;
    logger.info(MODULE, 'Пользователь получен', { id: typed.id, name: `${typed.first_name} ${typed.last_name}` });
    return typed;
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения информации о пользователе', error);
    return null;
  }
}

// ==================== Группы ====================

/**
 * Получить список групп пользователя
 */
export async function getGroups(): Promise<VKGroup[] | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.warn(MODULE, 'Получение групп вне VK невозможно');
    return null;
  }

  try {
    const result = await vkBridge.send('VKWebAppGetGroups', {
      extended: 1,
      count: 100,
    });

    const typed = result as { groups: VKGroup[] };
    logger.info(MODULE, `Получено групп: ${typed.groups.length}`);
    return typed.groups;
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения групп', error);
    return null;
  }
}

// ==================== Публикация постов ====================

/**
 * Опубликовать пост на стене
 * @param message - Текст поста
 * @param attachments - Вложения (например: 'photo123_456')
 * @param groupId - ID группы (опционально, для публикации в группе)
 */
export async function postToWall(
  message: string,
  attachments?: string,
  groupId?: string
): Promise<VKPostResult | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.error(MODULE, 'Публикация вне VK невозможна');
    return null;
  }

  try {
    const params: Record<string, string | number> = { message };

    if (attachments) params.attachments = attachments;
    if (groupId) {
      params.owner_id = -parseInt(groupId);
      params.from_group = 1;
    }

    const result = await vkBridge.send('VKWebAppShowWallPost', params);
    const typed = result as { post_id: number };

    logger.info(MODULE, 'Пост опубликован', { postId: typed.post_id });
    return { post_id: typed.post_id };
  } catch (error) {
    logger.error(MODULE, 'Ошибка публикации поста', error);
    return null;
  }
}

/**
 * Запланировать пост
 * @param message - Текст поста
 * @param publishDate - Unix timestamp даты публикации
 * @param attachments - Вложения
 * @param groupId - ID группы
 */
export async function schedulePost(
  message: string,
  publishDate: number,
  attachments?: string,
  groupId?: string
): Promise<VKPostResult | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.error(MODULE, 'Планирование вне VK невозможно');
    return null;
  }

  try {
    const params: Record<string, string | number> = {
      message,
      publish_date: publishDate,
    };

    if (attachments) params.attachments = attachments;
    if (groupId) {
      params.owner_id = -parseInt(groupId);
      params.from_group = 1;
    }

    const result = await vkBridge.send('VKWebAppShowWallPost', params);
    const typed = result as { post_id: number };

    logger.info(MODULE, 'Пост запланирован', { postId: typed.post_id, date: new Date(publishDate * 1000) });
    return { post_id: typed.post_id };
  } catch (error) {
    logger.error(MODULE, 'Ошибка планирования поста', error);
    return null;
  }
}

// ==================== Фотографии ====================

/**
 * Загрузить фотографию
 * @param file - Файл изображения
 */
export async function uploadPhoto(file: File): Promise<VKPhotoUploadResult | null> {
  if (!isInitialized) {
    await init();
  }

  if (!isVKClient) {
    logger.error(MODULE, 'Загрузка фото вне VK невозможна');
    return null;
  }

  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');

    const result = await vkBridge.send('VKWebAppUploadPhoto', { photo: cleanBase64 });
    const typed = result as VKPhotoUploadResult;

    logger.info(MODULE, 'Фото загружено', { server: typed.server, hash: typed.hash });
    return typed;
  } catch (error) {
    logger.error(MODULE, 'Ошибка загрузки фото', error);
    return null;
  }
}

// ==================== Подписки ====================

/**
 * Подписаться на события VK Bridge
 */
export function subscribe(
  handler: (event: { type: string; detail: Record<string, unknown> }) => void
): void {
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

// ==================== Навигация ====================

/**
 * Закрыть приложение
 */
export async function closeApp(): Promise<void> {
  if (isVKClient) {
    try {
      await vkBridge.send('VKWebAppClose');
      logger.info(MODULE, 'Приложение закрыто');
    } catch (error) {
      logger.warn(MODULE, 'Не удалось закрыть приложение', error);
    }
  }
}

/**
 * Открыть ссылку в VK
 */
export async function openLink(url: string): Promise<void> {
  if (isVKClient) {
    try {
      await vkBridge.send('VKWebAppOpenLink', { url });
      logger.info(MODULE, 'Ссылка открыта', { url });
    } catch (error) {
      logger.warn(MODULE, 'Не удалось открыть ссылку', error);
    }
  } else {
    window.open(url, '_blank');
  }
}

/**
 * Показать нативную рекламу VK
 */
export async function showNativeAds(): Promise<void> {
  if (!isVKClient) {
    logger.warn(MODULE, 'Показ рекламы вне VK невозможен');
    return;
  }

  try {
    await vkBridge.send('VKWebAppShowNativeAds');
    logger.info(MODULE, 'Реклама показана');
  } catch (error) {
    logger.warn(MODULE, 'Не удалось показать рекламу', error);
  }
}

// ==================== Уведомления ====================

/**
 * Запросить разрешение на отправку push-уведомлений
 */
export async function requestPushPermissions(): Promise<boolean> {
  if (!isVKClient) {
    logger.warn(MODULE, 'Push уведомления вне VK невозможны');
    return false;
  }

  try {
    const result = await vkBridge.send('VKWebAppSubscribeStoriesApp');
    logger.info(MODULE, 'Разрешение на уведомления получено');
    return true;
  } catch (error) {
    logger.warn(MODULE, 'Пользователь отклонил уведомления', error);
    return false;
  }
}

// ==================== Экспорт vkBridge ====================

export { vkBridge };
