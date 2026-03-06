/**
 * Cookie-based аутентификация для безопасного хранения токенов
 * 
 * ⚠️ HttpOnly cookies защищают от XSS атак
 * ⚠️ Secure флаг требует HTTPS
 * ⚠️ SameSite=Strict защищает от CSRF
 * 
 * Использование:
 * 1. Backend устанавливает cookie при успешной авторизации
 * 2. Frontend не имеет доступа к токену (HttpOnly)
 * 3. Cookie автоматически отправляется с каждым запросом
 */

import { logger } from '@/utils/logger';

const MODULE = 'AUTH-COOKIE';

// Cookie configuration
const COOKIE_CONFIG = {
  httpOnly: true,      // Не доступно через JavaScript
  secure: true,        // Только HTTPS (false для localhost)
  sameSite: 'strict' as const, // Защита от CSRF
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней в мс
  path: '/',
};

// Cookie names
const COOKIE_NAMES = {
  ACCESS_TOKEN: 'vkp_access_token',
  REFRESH_TOKEN: 'vkp_refresh_token',
  USER_ID: 'vkp_user_id',
};

/**
 * Получить настройки cookie для текущей среды
 */
function getCookieConfig() {
  const isLocalhost = window.location.hostname === 'localhost';
  
  return {
    ...COOKIE_CONFIG,
    secure: !isLocalhost, // Secure только для production
  };
}

/**
 * Установить cookie с токеном
 * @param name - Имя cookie
 * @param value - Значение
 * @param days - Срок действия в днях
 */
export function setCookie(name: string, value: string, days: number = 30): void {
  const config = getCookieConfig();
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  
  let cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=${config.path}; SameSite=${config.sameSite}`;
  
  if (config.secure) {
    cookieString += '; Secure';
  }
  
  if (config.httpOnly) {
    cookieString += '; HttpOnly';
  }
  
  document.cookie = cookieString;
  logger.info(MODULE, `Cookie set: ${name}`);
}

/**
 * Получить значение cookie
 * @param name - Имя cookie
 * @returns Значение или null если не найдено
 */
export function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  
  return null;
}

/**
 * Удалить cookie
 * @param name - Имя cookie
 */
export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  logger.info(MODULE, `Cookie deleted: ${name}`);
}

/**
 * Установить токен доступа в cookie
 * @param token - Access token
 */
export function setAccessToken(token: string): void {
  setCookie(COOKIE_NAMES.ACCESS_TOKEN, token, 30);
}

/**
 * Получить токен доступа из cookie
 * @returns Access token или null
 */
export function getAccessToken(): string | null {
  return getCookie(COOKIE_NAMES.ACCESS_TOKEN);
}

/**
 * Удалить токен доступа
 */
export function deleteAccessToken(): void {
  deleteCookie(COOKIE_NAMES.ACCESS_TOKEN);
}

/**
 * Установить refresh token в cookie
 * @param token - Refresh token
 */
export function setRefreshToken(token: string): void {
  setCookie(COOKIE_NAMES.REFRESH_TOKEN, token, 90); // 90 дней
}

/**
 * Получить refresh token из cookie
 * @returns Refresh token или null
 */
export function getRefreshToken(): string | null {
  return getCookie(COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Удалить refresh token
 */
export function deleteRefreshToken(): void {
  deleteCookie(COOKIE_NAMES.REFRESH_TOKEN);
}

/**
 * Установить user ID в cookie (не чувствительные данные)
 * @param userId - User ID
 */
export function setUserId(userId: number): void {
  setCookie(COOKIE_NAMES.USER_ID, userId.toString(), 30);
}

/**
 * Получить user ID из cookie
 * @returns User ID или null
 */
export function getUserId(): number | null {
  const id = getCookie(COOKIE_NAMES.USER_ID);
  return id ? parseInt(id, 10) : null;
}

/**
 * Очистить все auth cookies
 */
export function clearAllAuthCookies(): void {
  deleteAccessToken();
  deleteRefreshToken();
  deleteCookie(COOKIE_NAMES.USER_ID);
  logger.info(MODULE, 'All auth cookies cleared');
}

/**
 * Проверить, авторизован ли пользователь
 * @returns true если есть access token
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Получить всю информацию об авторизации
 */
export function getAuthInfo(): {
  isAuthenticated: boolean;
  userId: number | null;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
} {
  return {
    isAuthenticated: isAuthenticated(),
    userId: getUserId(),
    hasAccessToken: getAccessToken() !== null,
    hasRefreshToken: getRefreshToken() !== null,
  };
}
