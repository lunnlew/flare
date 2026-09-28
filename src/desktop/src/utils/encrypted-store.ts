/**
 * Encrypted Storage - Secure storage wrapper for sensitive data
 *
 * Wraps zustand persist to encrypt sensitive fields before storage
 */

import { encrypt, decrypt, isEncrypted } from './crypto';

const ENCRYPTION_KEY_STORAGE = 'flare_encryption_key';

/**
 * Get or create the master encryption key
 * In a full implementation, this would be derived from user password
 * For now, we generate and store a random key
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
 * Store sensitive value encrypted
 */
export async function setSecure(key: string, value: unknown): Promise<void> {
  const masterKey = getMasterKey();
  const jsonStr = JSON.stringify(value);
  const encrypted = await encrypt(jsonStr, masterKey);
  localStorage.setItem(key, encrypted);
}

/**
 * Retrieve and decrypt sensitive value
 */
export async function getSecure<T>(key: string, defaultValue: T): Promise<T> {
  const stored = localStorage.getItem(key);
  if (!stored) return defaultValue;

  try {
    // Check if this is actually encrypted (may be legacy plain text)
    if (!isEncrypted(stored)) {
      // Legacy plain text - parse and re-encrypt on next write
      try {
        return JSON.parse(stored) as T;
      } catch {
        return defaultValue;
      }
    }

    const masterKey = getMasterKey();
    const decrypted = await decrypt(stored, masterKey);
    return JSON.parse(decrypted) as T;
  } catch {
    // Decryption failed - return default
    return defaultValue;
  }
}

/**
 * Remove secure value
 */
export function removeSecure(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Check if a key exists in secure storage
 */
export function hasSecure(key: string): boolean {
  return localStorage.getItem(key) !== null;
}

/**
 * Migrate existing plain text data to encrypted storage
 * Returns true if migration was needed and performed
 */
export async function migrateToSecure<T>(
  plainKey: string,
  secureKey: string,
  _defaultValue: T
): Promise<boolean> {
  const plainValue = localStorage.getItem(plainKey);
  if (!plainValue) return false;

  try {
    // Check if already encrypted
    if (isEncrypted(plainValue)) return false;

    // Parse plain value
    const parsed = JSON.parse(plainValue) as T;

    // Encrypt and store with new key
    await setSecure(secureKey, parsed);

    // Remove old key
    localStorage.removeItem(plainKey);

    return true;
  } catch {
    return false;
  }
}