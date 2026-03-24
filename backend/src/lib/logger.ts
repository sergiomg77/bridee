const timestamp = () => new Date().toISOString();

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.info(`[${timestamp()}] INFO: ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
  },
};
