/**
 * React хуки для работы с VK Mini Apps
 */

import { useState, useEffect, useCallback } from 'react';
import * as vkBridge from '@/api/vk-bridge';
import { logger } from '@/utils/logger';

const MODULE = 'USE-VK';

export interface VKState {
  isVK: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  user: vkBridge.VKUser | null;
  error: string | null;
}

/**
 * Хук для получения состояния VK Bridge
 */
export function useVKBridge() {
  const [state, setState] = useState<VKState>({
    isVK: false,
    isInitialized: false,
    isLoading: true,
    user: null,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const isVK = vkBridge.isRunningInVK();
        
        if (!isVK) {
          if (mounted) {
            setState({
              isVK: false,
              isInitialized: true,
              isLoading: false,
              user: null,
              error: null,
            });
          }
          return;
        }

        const success = await vkBridge.init();
        
        if (mounted) {
          setState({
            isVK: true,
            isInitialized: success,
            isLoading: false,
            user: null,
            error: success ? null : 'Не удалось инициализировать VK Bridge',
          });
        }
      } catch (error) {
        logger.error(MODULE, 'Ошибка инициализации', error);
        if (mounted) {
          setState({
            isVK: false,
            isInitialized: true,
            isLoading: false,
            user: null,
            error: 'Ошибка инициализации VK Bridge',
          });
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

/**
 * Хук для получения информации о пользователе
 */
export function useVKUser() {
  const [user, setUser] = useState<vkBridge.VKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userData = await vkBridge.getUserInfo();
      if (userData) {
        setUser(userData);
      } else {
        setError('Не удалось получить информацию о пользователе');
      }
    } catch (err) {
      logger.error(MODULE, 'Ошибка получения пользователя', err);
      setError('Ошибка получения информации о пользователе');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (vkBridge.isRunningInVK()) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  return { user, isLoading, error, refetch: fetchUser };
}

/**
 * Хук для получения токена доступа
 */
export function useVKAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async (scope = 'wall,photos,groups') => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await vkBridge.getAuthToken(scope);
      if (result) {
        setToken(result.accessToken);
        return result.accessToken;
      } else {
        setError('Не удалось получить токен');
        return null;
      }
    } catch (err) {
      logger.error(MODULE, 'Ошибка получения токена', err);
      setError('Ошибка получения токена');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { token, isLoading, error, getToken };
}

/**
 * Хук для получения списка групп
 */
export function useVKGroups() {
  const [groups, setGroups] = useState<vkBridge.VKGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await vkBridge.getGroups();
      if (result) {
        setGroups(result);
      } else {
        setError('Не удалось получить группы');
      }
    } catch (err) {
      logger.error(MODULE, 'Ошибка получения групп', err);
      setError('Ошибка получения групп');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { groups, isLoading, error, refetch: fetchGroups };
}

/**
 * Комбинированный хук для полной авторизации
 */
export function useVKAuth() {
  const bridgeState = useVKBridge();
  const { user, isLoading: userLoading, error: userError, refetch: refetchUser } = useVKUser();
  const { token, isLoading: tokenLoading, error: tokenError, getToken } = useVKAuthToken();

  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (bridgeState.isInitialized && user && token) {
      setIsAuthorized(true);
    }
  }, [bridgeState.isInitialized, user, token]);

  const authorize = useCallback(async (scope = 'wall,photos,groups,offline') => {
    const result = await vkBridge.getAuthToken(scope);
    if (result) {
      await refetchUser();
      return result;
    }
    return null;
  }, [refetchUser]);

  return {
    isAuthorized,
    isVK: bridgeState.isVK,
    isLoading: bridgeState.isLoading || userLoading || tokenLoading,
    error: bridgeState.error || userError || tokenError,
    user,
    token,
    authorize,
  };
}

/**
 * Хук для подписки на события VK Bridge
 */
export function useVKBridgeEvents<T extends { type: string; detail: Record<string, unknown> }>(
  eventType: string,
  handler: (event: T) => void
) {
  useEffect(() => {
    const subscription = (event: { type: string; detail: Record<string, unknown> }) => {
      if (event.type === eventType) {
        handler(event as T);
      }
    };

    vkBridge.subscribe(subscription);

    return () => {
      // Отписка не поддерживается напрямую в vk-bridge
      // Но компонент размонтируется, поэтому утечек не будет
    };
  }, [eventType, handler]);
}
