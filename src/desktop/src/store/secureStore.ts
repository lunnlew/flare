/**
 * Secure Store - Separate storage for sensitive data
 *
 * Stores OAuth tokens and secrets using encryption
 * This is separate from the main zustand stores to avoid complexity
 */

import { create } from 'zustand';
import { setSecure, getSecure, removeSecure } from '../utils/encrypted-store';

const SECURE_STORAGE_PREFIX = 'flare_secure_';

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresAt?: number;
}

interface SecureState {
  // OAuth tokens per endpoint
  oauthTokens: Record<string, OAuthTokens>;
  // API keys and secrets
  apiKeys: Record<string, string>;
  // Basic auth credentials
  basicAuth: Record<string, { username: string; password: string }>;
}

interface SecureActions {
  saveOAuthToken: (endpointId: string, tokens: OAuthTokens) => Promise<void>;
  getOAuthToken: (endpointId: string) => Promise<OAuthTokens | null>;
  clearOAuthToken: (endpointId: string) => Promise<void>;

  saveApiKey: (name: string, key: string) => Promise<void>;
  getApiKey: (name: string) => Promise<string | null>;
  clearApiKey: (name: string) => Promise<void>;

  saveBasicAuth: (name: string, credentials: { username: string; password: string }) => Promise<void>;
  getBasicAuth: (name: string) => Promise<{ username: string; password: string } | null>;
  clearBasicAuth: (name: string) => Promise<void>;

  // Clear all secure data
  clearAll: () => Promise<void>;
}

type SecureStore = SecureState & SecureActions;

export const useSecureStore = create<SecureStore>((set) => ({
  oauthTokens: {},
  apiKeys: {},
  basicAuth: {},

  saveOAuthToken: async (endpointId: string, tokens: OAuthTokens) => {
    const key = `${SECURE_STORAGE_PREFIX}oauth_${endpointId}`;
    await setSecure(key, tokens);
    set((state) => ({
      oauthTokens: { ...state.oauthTokens, [endpointId]: tokens },
    }));
  },

  getOAuthToken: async (endpointId: string) => {
    const key = `${SECURE_STORAGE_PREFIX}oauth_${endpointId}`;
    return getSecure<OAuthTokens | null>(key, null);
  },

  clearOAuthToken: async (endpointId: string) => {
    const key = `${SECURE_STORAGE_PREFIX}oauth_${endpointId}`;
    removeSecure(key);
    set((state) => {
      const { [endpointId]: _, ...rest } = state.oauthTokens;
      return { oauthTokens: rest };
    });
  },

  saveApiKey: async (name: string, key: string) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}apikey_${name}`;
    await setSecure(storageKey, key);
    set((state) => ({
      apiKeys: { ...state.apiKeys, [name]: key },
    }));
  },

  getApiKey: async (name: string) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}apikey_${name}`;
    return getSecure<string | null>(storageKey, null);
  },

  clearApiKey: async (name: string) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}apikey_${name}`;
    removeSecure(storageKey);
    set((state) => {
      const { [name]: _, ...rest } = state.apiKeys;
      return { apiKeys: rest };
    });
  },

  saveBasicAuth: async (name: string, credentials: { username: string; password: string }) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}basicauth_${name}`;
    await setSecure(storageKey, credentials);
    set((state) => ({
      basicAuth: { ...state.basicAuth, [name]: credentials },
    }));
  },

  getBasicAuth: async (name: string) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}basicauth_${name}`;
    return getSecure<{ username: string; password: string } | null>(storageKey, null);
  },

  clearBasicAuth: async (name: string) => {
    const storageKey = `${SECURE_STORAGE_PREFIX}basicauth_${name}`;
    removeSecure(storageKey);
    set((state) => {
      const { [name]: _, ...rest } = state.basicAuth;
      return { basicAuth: rest };
    });
  },

  clearAll: async () => {
    // Clear all secure storage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SECURE_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    set({
      oauthTokens: {},
      apiKeys: {},
      basicAuth: {},
    });
  },
}));

/**
 * Helper to generate endpoint ID from method + URL
 */
export function getEndpointId(method: string, url: string): string {
  // Create a simple hash from method + url
  const str = `${method}:${url}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Helper to generate OAuth config ID from clientId + accessTokenUrl
 * This uniquely identifies an OAuth configuration
 */
export function getOAuthConfigId(clientId: string, accessTokenUrl: string): string {
  return `oauth_${hashString(`oauth:${clientId}:${accessTokenUrl}`)}`;
}

/**
 * Hash a string to a 36-character lowercase alphanumeric value
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}