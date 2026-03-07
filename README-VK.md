# VK Pilot — VK Mini Apps

Автопостинг ВКонтакте в формате VK Mini Apps.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка VK приложения

1. Перейдите в [VK Developers](https://vk.com/editapp?app=54473005)
2. Создайте приложение типа **Mini App**
3. Укажите App ID: `54473005`
4. Настройте URL:
   - **Production**: `https://your-domain.com/`
   - **Local development**: `https://your-local-url.ngrok.io/`

### 3. Запуск разработки

```bash
npm run dev
```

Для доступа из VK используйте туннель (например, ngrok):

```bash
ngrok http 5173
```

Полученный URL укажите в настройках VK приложения.

### 4. Сборка для продакшена

```bash
npm run build
```

Файлы будут в папке `dist/`.

## 📋 Структура API

### Инициализация

```tsx
import { init, isRunningInVK } from '@/api/vk-bridge';

// Проверка запуска в VK
const inVK = isRunningInVK();

// Инициализация (вызывается автоматически в main.tsx)
await init();
```

### React хуки

```tsx
import { useVKAuth, useVKUser, useVKGroups } from '@/hooks';

// Полная авторизация
const { isAuthorized, user, token, authorize } = useVKAuth();

// Информация о пользователе
const { user, isLoading, error } = useVKUser();

// Список групп
const { groups, refetch } = useVKGroups();
```

### Публикация постов

```tsx
import { postToWall, uploadPhoto, schedulePost } from '@/api/vk-bridge';

// Публикация текста
const result = await postToWall('Привет, VK!', undefined, '123456');

// Загрузка фото
const photo = await uploadPhoto(file);

// Публикация с фото
const attachment = `photo${photo.server}_${photo.hash}`;
await postToWall('Текст поста', attachment);

// Планирование поста
const date = new Date('2025-03-08 10:00:00');
await schedulePost('Текст', Math.floor(date.getTime() / 1000));
```

## 🔑 Права доступа (scope)

Необходимые права для работы приложения:

- `wall` — публикация постов
- `photos` — загрузка фотографий
- `groups` — управление сообществами
- `offline` — долгосрочный доступ

## 🧪 Тестирование вне VK

Приложение работает и вне VK (в браузере). В этом случае:
- VK Bridge не инициализируется
- Функции возвращают `null`
- Логи показывают предупреждения

## 📱 Адаптация под VK

### Темизация

VK Mini Apps автоматически применяет системную тему. Для поддержки:

```tsx
import { useVKBridgeEvents } from '@/hooks';

useVKBridgeEvents('VKWebAppUpdateConfig', (event) => {
  // Обновление темы
  const { scheme } = event.detail;
  document.documentElement.dataset.theme = scheme;
});
```

### Нативная шапка

```tsx
import { vkBridge } from '@/api/vk-bridge';

// Скрыть нативную шапку
vkBridge.send('VKWebAppDisableSwipeBack');
```

## 🐛 Отладка

Включите логи в консоли:

```bash
# В режиме разработки логи включены автоматически
npm run dev
```

Проверьте консоль браузера в VK (для отладки Mini Apps используйте [vConsole](https://github.com/Tencent/vConsole)).

## 📚 Документация

- [VK Bridge Docs](https://vkcom.github.io/vk-bridge/)
- [VK Mini Apps](https://dev.vk.com/mini-apps/)
- [VK API](https://dev.vk.com/method/)

## 🛠 Технологии

- **React 19** + **TypeScript**
- **Vite** — сборка
- **VK Bridge** — интеграция с VK
- **React Router** — навигация
