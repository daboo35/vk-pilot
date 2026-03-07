import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { init as initVKBridge } from './api/vk-bridge';
import './index.css';
import { App } from './App';

/**
 * Инициализация приложения перед рендером
 */
async function bootstrap() {
  try {
    // Инициализируем VK Bridge до рендера приложения
    await initVKBridge();
  } catch (error) {
    console.error('[Bootstrap] Ошибка инициализации:', error);
  }

  // Рендерим приложение
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>
  );
}

bootstrap();
