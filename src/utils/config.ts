/**
 * Configuration Management
 * Centralized environment variable handling for flare-api-spec
 */

export interface FlareConfig {
  basePath: string;
  embeddingProvider: 'openai' | 'local' | 'stub';
  openaiApiKey: string | undefined;
  requestTimeout: number;
  embeddingCacheTtl: number;
}

const CONFIG_DEFAULTS: Omit<FlareConfig, 'openaiApiKey'> = {
  basePath: process.cwd(),
  embeddingProvider: 'stub',
  requestTimeout: 30000,
  embeddingCacheTtl: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

let cachedConfig: FlareConfig | null = null;

/**
 * Load and cache configuration from environment variables
 */
export function loadConfig(): FlareConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = {
    basePath: process.env.FLARE_BASE_PATH || CONFIG_DEFAULTS.basePath,
    embeddingProvider: (process.env.EMBEDDING_PROVIDER as any) || CONFIG_DEFAULTS.embeddingProvider,
    openaiApiKey: process.env.OPENAI_API_KEY,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '', 10) || CONFIG_DEFAULTS.requestTimeout,
    embeddingCacheTtl: parseInt(process.env.EMBEDDING_CACHE_TTL || '', 10) || CONFIG_DEFAULTS.embeddingCacheTtl,
  };

  return cachedConfig;
}

/**
 * Get embedding provider config
 */
export function getEmbeddingConfig() {
  const config = loadConfig();
  return {
    provider: config.embeddingProvider,
    apiKey: config.openaiApiKey,
  };
}

/**
 * Get request timeout in milliseconds
 */
export function getRequestTimeout(): number {
  return loadConfig().requestTimeout;
}

/**
 * Validate required config (throws if missing)
 */
export function validateEmbeddingConfig(): void {
  const config = getEmbeddingConfig();
  if (config.provider === 'openai' && !config.apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required when EMBEDDING_PROVIDER=openai');
  }
}

/**
 * Reset config cache (mainly for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}