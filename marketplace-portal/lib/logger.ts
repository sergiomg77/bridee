const logger = {
  info: (message: string, context?: object): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`, context ?? '');
    }
  },
  warn: (message: string, context?: object): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, context ?? '');
    }
  },
  error: (message: string, error?: unknown): void => {
    console.error(`[ERROR] ${message}`, error ?? '');
  },
};

export default logger;
