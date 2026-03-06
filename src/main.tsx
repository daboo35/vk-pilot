import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import vkBridge from '@vkontakte/vk-bridge';
import './index.css';
import { App } from './App';

// Компонент для инициализации VK Bridge
function VKBridgeInit({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Инициализируем VK Bridge только если запущены внутри VK
    if (vkBridge.isWebView()) {
      console.log('[VK Bridge] Запуск внутри VK, инициализация...');
      vkBridge.send('VKWebAppInit')
        .then(() => console.log('[VK Bridge] Инициализация успешна'))
        .catch((err) => console.warn('[VK Bridge] Ошибка инициализации:', err));
    } else {
      console.log('[VK Bridge] Запуск вне VK, инициализация пропущена');
    }
  }, []);

  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <VKBridgeInit>
        <App />
      </VKBridgeInit>
    </HashRouter>
  </StrictMode>
);
