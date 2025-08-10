// frontend/config/env.ts
interface EnvironmentConfig {
  API_URL: string;
  WS_URL: string;
  NODE_ENV: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
  APP_VERSION: string;
  ENABLE_ANALYTICS: boolean;
  ENABLE_DEBUG: boolean;
}

function validateRequiredEnvVars() {
  const required = ['NEXT_PUBLIC_API_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function createConfig(): EnvironmentConfig {
  validateRequiredEnvVars();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';

  return {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
    NODE_ENV: nodeEnv,
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
    APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    ENABLE_DEBUG: isDevelopment || process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true'
  };
}

export const env = createConfig();

// Utility functions
export const getApiUrl = (endpoint: string): string => {
  return `${env.API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export const getWebSocketUrl = (): string => {
  return env.WS_URL;
};

export const isServerSide = (): boolean => {
  return typeof window === 'undefined';
};

export const isBrowser = (): boolean => {
  return !isServerSide();
};

// Debug logging utility
export const debugLog = (...args: any[]): void => {
  if (env.ENABLE_DEBUG) {
    console.log('[SilentVideoSynth Debug]:', ...args);
  }
};

export default env;