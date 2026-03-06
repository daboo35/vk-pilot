/**
 * VK Mini Apps API - работа через VK Bridge без бэкенда
 */

import vkBridge from '@vkontakte/vk-bridge';
import { logger } from '@/utils/logger';

const MODULE = 'VK-MINI-APPS';

export interface VKUser {
  id: number;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

export interface VKPost {
  id: number;
  text: string;
  attachments?: string;
  groupId?: string;
  scheduledAt?: number;
}

/**
 * Проверить, запущены ли внутри VK
 */
export function isRunningInVK(): boolean {
  return vkBridge.isWebView();
}

/**
 * Инициализировать VK Bridge
 */
export async function initVKBridge(): Promise<boolean> {
  if (!isRunningInVK()) {
    logger.warn(MODULE, 'Запуск вне VK, инициализация пропущена');
    return false;
  }

  try {
    await vkBridge.send('VKWebAppInit');
    logger.info(MODULE, 'VK Bridge инициализирован');
    return true;
  } catch (error) {
    logger.error(MODULE, 'Ошибка инициализации VK Bridge', error);
    return false;
  }
}

/**
 * Получить токен доступа через VK Bridge
 */
export async function getVKAuthToken(scope: string = 'wall,photos,groups,offline'): Promise<string | null> {
  try {
    const result = await vkBridge.send('VKWebAppGetAuthToken', {
      app_id: 54473005,
      scope,
    });

    return (result as { access_token: string }).access_token || null;
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения токена', error);
    return null;
  }
}

/**
 * Получить информацию о пользователе
 */
export async function getVKUserInfo(): Promise<VKUser | null> {
  try {
    const result = await vkBridge.send('VKWebAppGetUserInfo');
    const user = result as {
      id: number;
      first_name: string;
      last_name: string;
      photo_100?: string;
      photo_200?: string;
    };

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      photoUrl: user.photo_100 || user.photo_200,
    };
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения информации о пользователе', error);
    return null;
  }
}

/**
 * Опубликовать пост на стене через VK Bridge
 */
export async function publishPostToWall(
  message: string,
  groupId?: string,
  attachments?: string
): Promise<{ postId: number } | null> {
  try {
    const params: Record<string, string | number> = {
      message,
    };

    if (groupId) {
      params.owner_id = -parseInt(groupId);
      params.from_group = 1;
    }

    if (attachments) {
      params.attachments = attachments;
    }

    const result = await vkBridge.send('VKWebAppShowWallPost', params);
    const data = result as { post_id: number };

    logger.info(MODULE, 'Пост опубликован', data);
    return { postId: data.post_id };
  } catch (error) {
    logger.error(MODULE, 'Ошибка публикации поста', error);
    return null;
  }
}

/**
 * Запланировать пост через VK Bridge
 */
export async function schedulePost(
  message: string,
  publishDate: number, // Unix timestamp
  groupId?: string,
  attachments?: string
): Promise<{ postId: number } | null> {
  try {
    const params: Record<string, string | number> = {
      message,
      publish_date: publishDate,
    };

    if (groupId) {
      params.owner_id = -parseInt(groupId);
      params.from_group = 1;
    }

    if (attachments) {
      params.attachments = attachments;
    }

    const result = await vkBridge.send('VKWebAppShowWallPost', params);
    const data = result as { post_id: number };

    logger.info(MODULE, 'Пост запланирован', data);
    return { postId: data.post_id };
  } catch (error) {
    logger.error(MODULE, 'Ошибка планирования поста', error);
    return null;
  }
}

/**
 * Получить список групп пользователя
 */
export async function getVKGroups(): Promise<Array<{ id: number; name: string; photoUrl?: string }> | null> {
  try {
    const result = await vkBridge.send('VKWebAppGetGroups', {
      extended: 1,
      count: 100,
    });

    const data = result as { groups: Array<{ id: number; name: string; photo_100?: string }> };
    return data.groups.map(g => ({
      id: g.id,
      name: g.name,
      photoUrl: g.photo_100,
    }));
  } catch (error) {
    logger.error(MODULE, 'Ошибка получения групп', error);
    return null;
  }
}

/**
 * Загрузить фото через VK Bridge
 */
export async function uploadPhotoToVK(file: File): Promise<{
  photo: string;
  server: number;
  hash: string;
} | null> {
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

    const result = await vkBridge.send('VKWebAppUploadPhoto', {
      photo: cleanBase64,
    });

    const data = result as {
      photo: string;
      server: number;
      hash: string;
    };

    logger.info(MODULE, 'Фото загружено', data);
    return data;
  } catch (error) {
    logger.error(MODULE, 'Ошибка загрузки фото', error);
    return null;
  }
}

/**
 * Сохранить загруженное фото на стене
 */
export async function saveWallPhoto(
  photo: string,
  server: number,
  hash: string,
  groupId?: string
): Promise<Array<{ id: number; owner_id: number }> | null> {
  try {
    // Для сохранения фото нужен серверный вызов API
    // В VK Mini Apps это можно сделать через vkBridge.send с методом VKWallPost
    // или использовать прямой вызов API с токеном
    logger.warn(MODULE, 'saveWallPhoto требует серверного вызова API');
    return null;
  } catch (error) {
    logger.error(MODULE, 'Ошибка сохранения фото', error);
    return null;
  }
}

/**
 * Полный flow авторизации через VK Mini Apps
 */
export async function authorizeVKMiniApps(): Promise<{
  ok: boolean;
  accessToken?: string;
  user?: VKUser;
  error?: string;
}> {
  // Шаг 1: Получаем токен
  const token = await getVKAuthToken('wall,photos,groups,offline');
  if (!token) {
    return { ok: false, error: 'Не удалось получить токен доступа' };
  }

  // Шаг 2: Получаем информацию о пользователе
  const user = await getVKUserInfo();
  if (!user) {
    return { ok: false, error: 'Не удалось получить информацию о пользователе' };
  }

  return {
    ok: true,
    accessToken: token,
    user,
  };
}
