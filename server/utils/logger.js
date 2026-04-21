const createLogMethod = (level, consoleMethod) => {
  return (...args) => {
    const timestamp = new Date().toISOString();
    consoleMethod(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
  };
};

export const logger = {
  info: createLogMethod("info", console.info),
  warn: createLogMethod("warn", console.warn),
  error: createLogMethod("error", console.error),
  debug: createLogMethod("debug", console.debug)
};
