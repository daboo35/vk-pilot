/**
 * VK Mini Apps API — обёртка над vk-bridge для удобства
 * 
 * Этот модуль использует функции из vk-bridge.ts
 * и предоставляет дополнительный уровень абстракции
 */

import * as vkBridge from './vk-bridge';
import { logger } from '@/utils/logger';

const MODULE = 'VK-MINI-APPS';

export type { VKUser, VKGroup, VKPostResult, VKPhotoUploadResult } from './vk-bridge';

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
  return vkBridge.isRunningInVK();
}

/**
 * Инициализировать VK Bridge
 */
export async function initVKBridge(): Promise<boolean> {
  const result = await vkBridge.init();
  logger.info(MODULE, `VK Bridge инициализирован: ${result}`);
  return result;
}

/**
 * Получить данные инициализации
 */
export function getVKInitData() {
  return vkBridge.getVKInitData();
}

/**
 * Полный flow авторизации через VK Mini Apps
 */
export async function authorizeVKMiniApps(scope = 'wall,photos,groups,offline'): Promise<{
  ok: boolean;
  accessToken?: string;
  user?: vkBridge.VKUser;
  error?: string;
}> {
  logger.info(MODULE, 'Начало авторизации...');

  // Шаг 1: Инициализация
  const isVK = await initVKBridge();
  if (!isVK) {
    return { ok: false, error: 'Приложение запущено вне VK' };
  }

  // Шаг 2: Получаем токен
  const token = await vkBridge.getAuthToken(scope);
  if (!token) {
    return { ok: false, error: 'Не удалось получить токен доступа' };
  }

  // Шаг 3: Получаем информацию о пользователе
  const user = await vkBridge.getUserInfo();
  if (!user) {
    return { ok: false, error: 'Не удалось получить информацию о пользователе' };
  }

  logger.info(MODULE, 'Авторизация успешна', { userId: user.id });

  return {
    ok: true,
    accessToken: token.accessToken,
    user,
  };
}

/**
 * Опубликовать пост с фото
 */
export async function publishPostWithPhoto(
  file: File,
  message: string,
  groupId?: string
): Promise<vkBridge.VKPostResult | null> {
  logger.info(MODULE, 'Публикация поста с фото...');

  // Загружаем фото
  const photoData = await vkBridge.uploadPhoto(file);
  if (!photoData) {
    logger.error(MODULE, 'Не удалось загрузить фото');
    return null;
  }

  // Формируем attachment
  const attachment = `photo${photoData.server}_${photoData.hash}`;

  // Публикуем пост
  const result = await vkBridge.postToWall(message, attachment, groupId);
  if (!result) {
    logger.error(MODULE, 'Не удалось опубликовать пост');
    return null;
  }

  logger.info(MODULE, 'Пост с фото опубликован', { postId: result.post_id });
  return result;
}

/**
 * Запланировать пост с фото
 */
export async function schedulePostWithPhoto(
  file: File,
  message: string,
  publishDate: Date,
  groupId?: string
): Promise<vkBridge.VKPostResult | null> {
  logger.info(MODULE, 'Планирование поста с фото...');

  const photoData = await vkBridge.uploadPhoto(file);
  if (!photoData) {
    return null;
  }

  const attachment = `photo${photoData.server}_${photoData.hash}`;
  const timestamp = Math.floor(publishDate.getTime() / 1000);

  const result = await vkBridge.schedulePost(message, timestamp, attachment, groupId);
  if (!result) {
    logger.error(MODULE, 'Не удалось запланировать пост');
    return null;
  }

  logger.info(MODULE, 'Пост с фото запланирован', { postId: result.post_id, date: publishDate });
  return result;
}

/**
 * Получить список групп пользователя
 */
export async function getUserGroups(): Promise<vkBridge.VKGroup[] | null> {
  return vkBridge.getGroups();
}

/**
 * Проверить, является ли пользователь администратором группы
 */
export function isGroupAdmin(groupId: number | string): boolean {
  const currentGroupId = vkBridge.getGroupId();
  return currentGroupId === Number(groupId);
}

// Экспортируем все функции из vk-bridge для прямого доступа
export * from './vk-bridge';
