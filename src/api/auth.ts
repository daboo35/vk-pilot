import { logger } from '@/utils/logger';

const MODULE = 'AUTH';

// VK OAuth Configuration - используем тот же redirect_uri что и server.js
// Для публичного домена: https://post35.ru/auth/vk/callback
export const VK_CLIENT_ID = '54449717';
export const VK_REDIRECT_URI = 'https://post35.ru/auth/vk/callback';
export const VK_OAUTH_SCOPE = 'wall,photos,groups,offline';

/**
 * Получить URL для OAuth авторизации VK (VK ID)
 */
export function getVkOAuthUrl(clientId: string): string {
  const state = Math.random().toString(36).slice(2); // CSRF protection
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: VK_REDIRECT_URI,
    response_type: 'code',
    scope: VK_OAUTH_SCOPE,
    state: state,
    display: 'page', // Показываем полную страницу авторизации
  });

  return `https://id.vk.ru/authorize?${params.toString()}`;
}

/**
 * Открыть OAuth окно VK (устарело - используется в VkAuthButton)
 */
export function openVkOAuthWindow(clientId: string = VK_CLIENT_ID): Promise<{ code: string; state: string } | null> {
  return new Promise((resolve) => {
    const oauthUrl = getVkOAuthUrl(clientId);
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      oauthUrl,
      'vk_oauth',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (!popup) {
      logger.error(MODULE, 'Failed to open OAuth popup - popup blocker?');
      resolve(null);
      return;
    }

    // Listen for message from popup (callback page will send this)
    const handleMessage = (event: MessageEvent) => {
      // Verify origin (security)
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === 'VK_OAUTH_CALLBACK') {
        window.removeEventListener('message', handleMessage);
        popup.close();

        if (event.data.error) {
          logger.error(MODULE, 'OAuth error', event.data.error);
          resolve(null);
        } else {
          logger.info(MODULE, 'OAuth code received');
          resolve({ code: event.data.code, state: event.data.state });
        }
      }
    };

    window.addEventListener('message', handleMessage, false);

    // Check if popup was closed
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        resolve(null);
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      popup.close();
      clearInterval(checkClosed);
      window.removeEventListener('message', handleMessage);
      resolve(null);
    }, 300000);
  });
}

/**
 * Обменять authorization code на access token через backend
 */
export async function exchangeCodeForToken(code: string): Promise<{
  ok: boolean;
  accessToken?: string;
  expiresIn?: number;
  userId?: number;
  email?: string | null;
  error?: string;
}> {
  try {
    const response = await fetch(`/api/auth/vk/callback?code=${encodeURIComponent(code)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        ok: true,
        accessToken: data.data.accessToken,
        expiresIn: data.data.expiresIn,
        userId: data.data.userId,
        email: data.data.email,
      };
    }

    return {
      ok: false,
      error: data.error || 'Failed to exchange code for token',
    };
  } catch (error) {
    logger.error(MODULE, 'Token exchange failed', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Проверить валидность токена и получить информацию о пользователе
 */
export async function verifyToken(accessToken: string): Promise<{
  ok: boolean;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch('/api/auth/vk/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        ok: true,
        user: data.data,
      };
    }

    return {
      ok: false,
      error: data.error || 'Token verification failed',
    };
  } catch (error) {
    logger.error(MODULE, 'Token verification failed', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Полный flow авторизации
 */
export async function authorizeWithVk(): Promise<{
  ok: boolean;
  accessToken?: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  };
  error?: string;
}> {
  // Step 1: Open OAuth popup and get code
  const oauthResult = await openVkOAuthWindow();

  if (!oauthResult) {
    return {
      ok: false,
      error: 'Authorization cancelled or failed',
    };
  }

  // Step 2: Exchange code for token
  const tokenResult = await exchangeCodeForToken(oauthResult.code);

  if (!tokenResult.ok || !tokenResult.accessToken) {
    return {
      ok: false,
      error: tokenResult.error || 'Failed to get access token',
    };
  }

  // Step 3: Verify token and get user info
  const verifyResult = await verifyToken(tokenResult.accessToken);

  if (!verifyResult.ok || !verifyResult.user) {
    return {
      ok: false,
      error: verifyResult.error || 'Token verification failed',
    };
  }

  return {
    ok: true,
    accessToken: tokenResult.accessToken,
    user: verifyResult.user,
  };
}
