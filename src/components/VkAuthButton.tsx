import { LogIn } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { getVkOAuthUrl } from '@/api/auth';

interface VkAuthButtonProps {
  disabled?: boolean;
  clientId?: string;
}

export function VkAuthButton({ disabled, clientId }: VkAuthButtonProps) {
  const { addToast } = useToast();

  const handleOpenOAuth = () => {
    if (disabled || !clientId) return;

    const oauthUrl = getVkOAuthUrl(clientId);
    
    // Открываем в том же окне - VK ID перенаправит обратно на наш callback
    window.location.href = oauthUrl;
    
    addToast('После авторизации вы будете перенаправлены обратно', 'info');
  };

  return (
    <button
      onClick={handleOpenOAuth}
      disabled={disabled || !clientId}
      className="w-full px-4 py-3 rounded-xl bg-[#0077FF] text-white text-sm font-semibold hover:bg-[#0066DD] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
    >
      <LogIn className="w-5 h-5" />
      Войти через VK
    </button>
  );
}
