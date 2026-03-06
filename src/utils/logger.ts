type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_PREFIX = '🚀 [VK Pilot]';

function formatMsg(level: LogLevel, module: string, message: string): string {
  const ts = new Date().toLocaleTimeString('ru-RU');
  return `${ts} ${LOG_PREFIX} [${level.toUpperCase()}] [${module}] ${message}`;
}

export const logger = {
  info(module: string, message: string, ...args: unknown[]) {
    console.log(formatMsg('info', module, message), ...args);
  },
  warn(module: string, message: string, ...args: unknown[]) {
    console.warn(formatMsg('warn', module, message), ...args);
  },
  error(module: string, message: string, ...args: unknown[]) {
    console.error(formatMsg('error', module, message), ...args);
  },
  debug(module: string, message: string, ...args: unknown[]) {
    console.debug(formatMsg('debug', module, message), ...args);
  },
};
