/**
 * Debug utility - Conditional logging based on debug mode
 */

// Global debug state (will be controlled by DebugContext)
let isDebugMode = false;

/**
 * Set debug mode state
 */
export function setDebugMode(enabled: boolean): void {
  isDebugMode = enabled;
}

/**
 * Get current debug mode state
 */
export function getDebugMode(): boolean {
  return isDebugMode;
}

/**
 * Debug logger - only logs when debug mode is enabled
 */
export const debug = {
  log: (...args: unknown[]) => {
    if (isDebugMode) {
      console.log('[DEBUG]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebugMode) {
      console.warn('[DEBUG]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDebugMode) {
      console.error('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDebugMode) {
      console.info('[DEBUG]', ...args);
    }
  },
};

/**
 * Create a scoped debug logger with a prefix
 */
export function createScopedLogger(scope: string) {
  return {
    log: (...args: unknown[]) => {
      if (isDebugMode) {
        console.log(`[DEBUG:${scope}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (isDebugMode) {
        console.warn(`[DEBUG:${scope}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      if (isDebugMode) {
        console.error(`[DEBUG:${scope}]`, ...args);
      }
    },
    info: (...args: unknown[]) => {
      if (isDebugMode) {
        console.info(`[DEBUG:${scope}]`, ...args);
      }
    },
  };
}
