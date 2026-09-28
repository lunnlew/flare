/**
 * Encrypted Persist Middleware - Zzustand middleware for encrypted storage
 *
 * Automatically encrypts specified fields when persisting to localStorage
 * and decrypts them when reading
 */

import { StateStorage } from 'zustand/middleware';
import { encrypt, decrypt, isEncrypted } from './crypto';

const ENCRYPTION_KEY_STORAGE = 'flare_encryption_key';

/**
 * Get or create the master encryption key
 */
function getMasterKey(): string {
  let key = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    key = btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, key);
  }
  return key;
}

/**
 * Create an encrypted state storage for zustand persist
 * @param storageKey - The key to encrypt/decrypt
 */
export function createEncryptedStorage(
  storageKey: string,
  _fieldsToEncrypt: string[]
): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const stored = localStorage.getItem(name);
      if (!stored) return null;

      // Check if this is the encrypted storage key
      if (name === storageKey) {
        // This is the encrypted data storage
        try {
          if (!isEncrypted(stored)) {
            // Legacy plain text - return as-is
            return stored;
          }
          const masterKey = getMasterKey();
          const decrypted = await decrypt(stored, masterKey);
          return decrypted;
        } catch {
          // Decryption failed - might be corrupted or legacy
          return stored;
        }
      }

      return stored;
    },

    setItem: async (name: string, value: string): Promise<void> => {
      if (name === storageKey) {
        // Encrypt before storing
        const masterKey = getMasterKey();
        const encrypted = await encrypt(value, masterKey);
        localStorage.setItem(name, encrypted);
      } else {
        // Store as-is
        localStorage.setItem(name, value);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      localStorage.removeItem(name);
    },
  };
}

/**
 * Simple encrypted storage that encrypts all JSON data
 */
export const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const stored = localStorage.getItem(name);
    if (!stored) return null;

    try {
      if (!isEncrypted(stored)) {
        return stored;
      }
      const masterKey = getMasterKey();
      const decrypted = await decrypt(stored, masterKey);
      return decrypted;
    } catch {
      return stored;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const masterKey = getMasterKey();
    const encrypted = await encrypt(value, masterKey);
    localStorage.setItem(name, encrypted);
  },

  removeItem: async (name: string): Promise<void> => {
    localStorage.removeItem(name);
  },
};

export { encrypt, decrypt, isEncrypted } from './crypto';