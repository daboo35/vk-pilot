import { useState, useEffect } from 'react';
import {
  Key,
  Sparkles,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  User,
  Server,
  RefreshCw,
  LogOut,
  LogIn,
} from 'lucide-react';
import {
  setVkToken,
  getAiKey,
  setAiKey,
  clearAllData,
} from '@/api/storage';
import { checkBackendHealth } from '@/api/vk';
import { validateToken, maskToken } from '@/utils/security';
import { useToast } from '@/components/ToastProvider';
import {
  isRunningInVK,
  getAuthToken,
  getUserInfo,
  type VKUser,
} from '@/api/vk-bridge';

export default function Settings() {
  const { addToast } = useToast();

  const [aiKeyInput, setAiKeyInput] = useState('');
  const [showAiKey, setShowAiKey] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'ok'>('idle');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [backendChecking, setBackendChecking] = useState(false);
  
  // VK Bridge state
  const [vkUser, setVkUser] = useState<VKUser | null>(null);
  const [vkLoading, setVkLoading] = useState(false);
  const [vkRunningInVK, setVkRunningInVK] = useState(false);

  useEffect(() => {
    // Инициализация VK Bridge и проверка статуса
    const initVK = async () => {
      const runningInVK = isRunningInVK();
      setVkRunningInVK(runningInVK);
      
      if (runningInVK) {
        // Если запущено внутри VK, пробуем получить информацию о пользователе
        const userInfo = await getUserInfo();
        if (userInfo) {
          setVkUser(userInfo);
          addToast(`Вход выполнен как ${userInfo.first_name} ${userInfo.last_name}`, 'success');
        }
      }
    };
    
    initVK();
    
    // Загрузка AI ключа
    const savedAi = getAiKey();
    if (savedAi) {
      setAiKeyInput(savedAi);
      setAiStatus('ok');
    }
    
    // Проверка backend
    checkBackendHealth().then(setBackendOnline);
  }, []);

  /**
   * Авторизация через VK Bridge
   */
  const handleVkLogin = async () => {
    setVkLoading(true);
    
    try {
      // Получаем токен через VK Bridge
      const authResult = await getAuthToken('wall,photos,groups,offline');
      
      if (!authResult) {
        addToast('Ошибка авторизации', 'error');
        setVkLoading(false);
        return;
      }
      
      // Сохраняем токен
      setVkToken(authResult.accessToken);
      
      // Получаем информацию о пользователе
      const userInfo = await getUserInfo();
      
      if (userInfo) {
        setVkUser(userInfo);
        addToast(`Вход выполнен как ${userInfo.first_name} ${userInfo.last_name}`, 'success');
      } else {
        addToast('Вход выполнен (не удалось получить данные профиля)', 'warning');
      }
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Ошибка авторизации', 'error');
    } finally {
      setVkLoading(false);
    }
  };

  /**
   * Выход из аккаунта VK
   */
  const handleVkLogout = () => {
    setVkToken('');
    setVkUser(null);
    addToast('Выход выполнен', 'info');
  };

  const handleSaveAiKey = () => {
    const key = aiKeyInput.trim();
    if (!validateToken(key)) {
      addToast('Ключ слишком короткий (мин. 10 символов)', 'error');
      return;
    }
    setAiKey(key);
    setAiStatus('ok');
    addToast('OpenAI API ключ сохранён', 'success');
  };

  const handleClearAi = () => {
    setAiKey('');
    setAiKeyInput('');
    setAiStatus('idle');
    addToast('AI ключ удалён', 'info');
  };

  const handleResetAll = () => {
    if (confirm('Удалить все данные? Это действие необратимо.')) {
      clearAllData();
      setVkUser(null);
      setAiKeyInput('');
      setAiStatus('idle');
      addToast('Все данные удалены', 'success');
    }
  };

  const displayToken = (value: string, show: boolean) => {
    if (!value) return '';
    return show ? value : maskToken(value);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold">Настройки</h1>
        <p className="text-white/40 mt-1">API ключи и конфигурация</p>
      </div>

      {/* VK Bridge Авторизация */}
      <div className="glass rounded-2xl p-6 animate-slide-up space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077FF] to-[#0055CC] flex items-center justify-center">
            <Key className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">VK Авторизация</h2>
            <p className="text-xs text-white/30">Для публикации постов ВКонтакте</p>
          </div>
          {vkUser && <CheckCircle className="w-5 h-5 text-emerald-400" />}
        </div>

        {/* VK User Info */}
        {vkUser ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              {vkUser.photo_100 ? (
                <img
                  src={vkUser.photo_100}
                  alt={vkUser.first_name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-300">
                  {vkUser.first_name} {vkUser.last_name}
                </p>
                <p className="text-xs text-emerald-400/50">ID: {vkUser.id}</p>
              </div>
              <button
                onClick={handleVkLogout}
                className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* VK Bridge Login Button */}
            <button
              onClick={handleVkLogin}
              disabled={vkLoading}
              className="w-full px-4 py-3 rounded-xl bg-[#0077FF] text-white text-sm font-semibold hover:bg-[#0066DD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {vkLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Авторизация...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Войти через VK
                </>
              )}
            </button>

            {!vkRunningInVK && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs text-amber-300 font-medium mb-1">
                  ⚠️ Приложение запущено вне VK
                </p>
                <p className="text-xs text-white/40">
                  Для авторизации откройте приложение внутри VK (как Mini App)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Key */}
      <div className="glass rounded-2xl p-6 animate-slide-up space-y-4" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">OpenAI API Ключ</h2>
            <p className="text-xs text-white/30">Для AI генерации контента</p>
          </div>
          {aiStatus === 'ok' && <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />}
        </div>

        <div className="relative">
          <input
            type={showAiKey ? 'text' : 'password'}
            value={showAiKey ? aiKeyInput : displayToken(aiKeyInput, false)}
            onChange={e => {
              setAiKeyInput(e.target.value);
              setAiStatus('idle');
            }}
            placeholder="sk-..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-20 text-sm font-mono focus:outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/20"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => setShowAiKey(!showAiKey)}
              className="p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors"
            >
              {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {aiKeyInput && (
              <button
                onClick={handleClearAi}
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <button
          onClick={handleSaveAiKey}
          disabled={!aiKeyInput.trim()}
          className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Сохранить ключ
        </button>

        <p className="text-xs text-white/20 leading-relaxed">
          Без ключа работает демо-режим AI. Получите ключ на{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400/70 hover:text-purple-400 underline"
          >
            platform.openai.com
          </a>
        </p>
      </div>

      {/* Backend Status */}
      <div className="glass rounded-2xl p-6 animate-slide-up space-y-4" style={{ animationDelay: '150ms' }}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            backendOnline ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-gray-600 to-gray-700'
          }`}>
            <Server className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold">Прокси-сервер</h2>
            <p className="text-xs text-white/30">Для загрузки фото в VK (обход CORS)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              backendOnline === true
                ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse'
                : backendOnline === false
                  ? 'bg-red-400 shadow-md shadow-red-400/50'
                  : 'bg-white/20'
            }`} />
            <span className={`text-sm font-medium ${
              backendOnline === true ? 'text-emerald-400' :
              backendOnline === false ? 'text-red-400' : 'text-white/30'
            }`}>
              {backendOnline === true ? 'Online' :
               backendOnline === false ? 'Offline' : '...'}
            </span>
          </div>
        </div>

        <button
          onClick={async () => {
            setBackendChecking(true);
            const ok = await checkBackendHealth();
            setBackendOnline(ok);
            setBackendChecking(false);
            addToast(ok ? 'Бекенд-сервер подключён ✓' : 'Бекенд-сервер недоступен', ok ? 'success' : 'error');
          }}
          disabled={backendChecking}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.08] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${backendChecking ? 'animate-spin' : ''}`} />
          Проверить подключение
        </button>

        {backendOnline === false && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2 animate-fade-in">
            <p className="text-xs text-amber-300 font-medium">Как запустить прокси-сервер:</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Установите зависимости:</span>
                <code className="font-mono text-amber-400/70 bg-white/5 px-2 py-0.5 rounded">npm install</code>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Запустите сервер:</span>
                <code className="font-mono text-amber-400/70 bg-white/5 px-2 py-0.5 rounded">node server.js</code>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Сервер будет доступен на</span>
                <code className="font-mono text-amber-400/70 bg-white/5 px-2 py-0.5 rounded">localhost:3001</code>
              </div>
            </div>
          </div>
        )}

        {backendOnline === true && (
          <div className="text-xs text-white/20 space-y-1 animate-fade-in">
            <p>✅ Прокси VK API — загрузка фото без CORS ошибок</p>
            <p>✅ Прокси OpenAI API — генерация контента</p>
            <p>✅ Health check — <code className="font-mono text-white/30">GET /api/health</code></p>
          </div>
        )}
      </div>

      {/* Security info */}
      <div className="glass rounded-2xl p-6 animate-slide-up space-y-3" style={{ animationDelay: '250ms' }}>
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-white/40" />
          <h2 className="font-semibold">Безопасность</h2>
        </div>
        <div className="space-y-2 text-xs text-white/30">
          <p>🔐 Токены шифруются XOR-алгоритмом и хранятся в localStorage</p>
          <p>🚫 Данные никуда не отправляются — всё работает локально</p>
          <p>⏱ Встроен rate-limiter: VK 30 запр/мин, AI 10 запр/мин</p>
        </div>
      </div>

      {/* Reset */}
      <div className="animate-slide-up" style={{ animationDelay: '350ms' }}>
        <button
          onClick={handleResetAll}
          className="w-full glass rounded-2xl p-4 flex items-center justify-center gap-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/5 transition-all text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Сбросить все данные
        </button>
      </div>
    </div>
  );
}
