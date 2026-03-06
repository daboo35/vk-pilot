import { LogIn } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { authorizeVKMiniApps, isRunningInVK } from '@/api/vk-mini-apps';
import { getVkOAuthUrl } from '@/api/auth';

interface VkAuthButtonProps {
  disabled?: boolean;
  clientId?: string;
  onAuthSuccess?: (token: string, user: { id: number; firstName: string; lastName: string; photoUrl?: string }) => void;
}

export function VkAuthButton({ disabled, clientId, onAuthSuccess }: VkAuthButtonProps) {
  const { addToast } = useToast();

  const handleAuth = async () => {
    if (disabled) return;

    // Проверяем, запущены ли внутри VK
    if (isRunningInVK()) {
      // Используем VK Bridge
      addToast('Авторизация через VK Bridge...', 'info');
      const result = await authorizeVKMiniApps();
      
      if (result.ok && result.accessToken && result.user) {
        addToast(`Добро пожаловать, ${result.user.firstName}!`, 'success');
        onAuthSuccess?.(result.accessToken, result.user);
      } else {
        addToast(result.error || 'Ошибка авторизации', 'error');
      }
    } else {
      // Используем OAuth через веб
      if (!clientId) {
        addToast('VK Client ID не настроен', 'error');
        return;
      }

      const oauthUrl = getVkOAuthUrl(clientId);
      window.location.href = oauthUrl;
      addToast('После авторизации вы будете перенаправлены обратно', 'info');
    }
  };

  return (
    <button
      onClick={handleAuth}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl bg-[#0077FF] text-white text-sm font-semibold hover:bg-[#0066DD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
    >
      <LogIn className="w-5 h-5" />
      {isRunningInVK() ? 'Войти через VK Bridge' : 'Войти через VK'}
    </button>
  );
}
