/**
 * Crypto Utilities - AES-GCM encryption for sensitive data
 *
 * Provides client-side encryption for storing sensitive data
 * (tokens, secrets, passwords) in localStorage
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for AES-GCM
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Derive a key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-GCM
 * Returns base64 encoded string: salt + iv + ciphertext
 */
export async function encrypt(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    data
  );

  // Combine: salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Encode as base64
  return btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
}

/**
 * Decrypt data with AES-GCM
 * Input: base64 encoded string: salt + iv + ciphertext
 */
export async function decrypt(encrypted: string, password: string): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encrypted), (c: string) => c.charCodeAt(0));

  // Extract salt, iv, ciphertext
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    ciphertext
  );

  // Decode result
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a random encryption key (for key generation)
 */
export function generateRandomKey(length: number = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}

/**
 * Check if a string is encrypted (has valid base64 + expected length)
 */
export function isEncrypted(data: string): boolean {
  try {
    const decoded = Uint8Array.from(atob(data), (c: string) => c.charCodeAt(0));
    // Minimum length: salt(16) + iv(12) + at least 1 byte ciphertext
    return decoded.length >= SALT_LENGTH + IV_LENGTH + 1;
  } catch {
    return false;
  }
}