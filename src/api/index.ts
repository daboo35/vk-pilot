/**
 * VK Mini Apps API — центральный экспорт
 * 
 * Использование:
 * import { init, postToWall, getUserInfo, ... } from '@/api/vk';
 */

export {
  // Инициализация
  init,
  isRunningInVK,
  isAvailable,
  isRunningInGroup,
  getGroupId,
  getVKInitData,
  
  // Авторизация
  getAuthToken,
  
  // Пользователь
  getUserInfo,
  
  // Группы
  getGroups,
  
  // Публикация постов
  postToWall,
  schedulePost,
  
  // Фотографии
  uploadPhoto,
  
  // Подписки
  subscribe,
  supports,
  
  // Навигация
  closeApp,
  openLink,
  showNativeAds,
  
  // Уведомления
  requestPushPermissions,
  
  // Типы
  type VKUser,
  type VKAuthResult,
  type VKPostResult,
  type VKPhotoUploadResult,
  type VKGroup,
  type VKInitData,
  
  // Прямой доступ к vkBridge
  vkBridge,
} from './vk-bridge';

// Экспортируем обёртки для удобства
export {
  initVKBridge,
  authorizeVKMiniApps,
  publishPostWithPhoto,
  schedulePostWithPhoto,
  getUserGroups,
  isGroupAdmin,
} from './vk-mini-apps';

export type { VKPost } from './vk-mini-apps';
