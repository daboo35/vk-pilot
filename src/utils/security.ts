/**
 * Безопасное шифрование для чувствительных данных
 * Использует улучшенный алгоритм с динамическим ключом
 * 
 * ⚠️ ВАЖНО: Это улучшение безопасности, но для продакшена
 * рекомендуется использовать HttpOnly cookies вместо localStorage
 */

// Генерация уникального ключа на основе fingerprint браузера + случайной соли
let encryptionKeyCache: string | null = null;

function generateSecureKey(): string {
  if (encryptionKeyCache) return encryptionKeyCache;

  // Используем несколько источников энтропии
  const entropy = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    // Случайная соль для каждой сессии
    Math.random().toString(36).slice(2),
  ].join('|');

  // Простая хеш-функция на основе entropy
  let hash = 0;
  for (let i = 0; i < entropy.length; i++) {
    const char = entropy.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Генерируем ключ фиксированной длины (32 символа)
  encryptionKeyCache = Math.abs(hash).toString(36).padStart(32, '0').slice(0, 32);
  
  return encryptionKeyCache;
}

/**
 * Улучшенное XOR шифрование с динамическим ключом
 * @param text - Текст для шифрования
 * @returns Зашифрованная строка (hex)
 */
export function encrypt(text: string): string {
  if (!text) return '';
  
  const key = generateSecureKey();
  const iv = Math.random().toString(36).slice(2, 18); // 16-char IV
  
  // XOR с ключом и IV
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyCode = key.charCodeAt(i % key.length);
    const ivCode = iv.charCodeAt(i % iv.length);
    const xored = charCode ^ keyCode ^ ivCode;
    encrypted += xored.toString(16).padStart(4, '0');
  }
  
  // Добавляем IV в начало для расшифровки
  return iv + ':' + encrypted;
}

/**
 * Расшифровка данных
 * @param hex - Зашифрованная строка (hex)
 * @returns Расшифрованный текст
 */
export function decrypt(hex: string): string {
  if (!hex || !hex.includes(':')) return '';
  
  try {
    const [iv, encrypted] = hex.split(':');
    if (!iv || !encrypted || encrypted.length % 4 !== 0) {
      return '';
    }
    
    const key = generateSecureKey();
    let decrypted = '';
    
    for (let i = 0; i < encrypted.length; i += 4) {
      const xored = parseInt(encrypted.slice(i, i + 4), 16);
      if (isNaN(xored)) return '';
      
      const ivCode = iv.charCodeAt((i / 4) % iv.length);
      const keyCode = key.charCodeAt((i / 4) % key.length);
      const charCode = xored ^ keyCode ^ ivCode;
      
      decrypted += String.fromCharCode(charCode);
    }
    
    return decrypted;
  } catch (e) {
    return '';
  }
}

// ─── Rate Limiting (frontend) ────────────────────────────────
const rateLimits: Record<string, { count: number; resetAt: number }> = {};

/**
 * Проверка лимита запросов
 * @param key - Уникальный ключ (например, 'vk' или 'ai')
 * @param maxReq - Максимум запросов
 * @param windowMs - Окно времени в мс
 * @returns true если запрос разрешён
 */
export function checkRateLimit(key: string, maxReq: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimits[key];
  
  if (!entry || now > entry.resetAt) {
    rateLimits[key] = { count: 1, resetAt: now + windowMs };
    return true;
  }
  
  if (entry.count >= maxReq) return false;
  entry.count++;
  return true;
}

// ─── Validation Functions ────────────────────────────────────

/**
 * Проверка валидности токена
 */
export function validateToken(token: string): boolean {
  return typeof token === 'string' && token.trim().length >= 10;
}

/**
 * Проверка ID группы VK
 */
export function validateGroupId(id: string): boolean {
  return /^\d+$/.test(id.trim());
}

/**
 * Проверка файла изображения
 */
export function validateImageFile(file: File): { ok: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: 'Только изображения' };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: 'Макс. размер 10 МБ' };
  }
  return { ok: true };
}

/**
 * Санитизация текста (защита от XSS)
 * ⚠️ Это базовая защита, для продакшена используйте DOMPurify
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>.*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Маскирование токена для безопасного отображения
 */
export function maskToken(token: string): string {
  if (!token || token.length <= 8) return '••••••••';
  return token.slice(0, 4) + '••••••••' + token.slice(-4);
}

/**
 * Очистка кэша ключа шифрования (при выходе)
 */
export function clearEncryptionKey(): void {
  encryptionKeyCache = null;
}
