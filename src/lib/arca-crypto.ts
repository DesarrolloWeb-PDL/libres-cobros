/**
 * ARCA credential encryption at rest.
 *
 * Private keys are encrypted with AES-256-GCM. The wrapping key is derived from
 * ARCA_STORAGE_SECRET via HKDF-SHA256. Certificates are public material and are
 * stored in clear text, so they are not encrypted.
 *
 * ARCA_STORAGE_SECRET falls back to NEXTAUTH_SECRET when absent (the auth secret
 * is already required to be a strong random value). Both must be kept server-only.
 */

import crypto from 'crypto';

const CIPHER = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const CURRENT_VERSION = 'v1';
const INFO = Buffer.from('arca-storage-key-v1', 'utf8');

function resolveStorageSecret(): string {
  const secret = process.env.ARCA_STORAGE_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('ARCA_STORAGE_SECRET (or NEXTAUTH_SECRET fallback) is not configured');
  }
  return secret;
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  const derived = crypto.hkdfSync('sha256', Buffer.from(secret, 'utf8'), salt, INFO, 32);
  return Buffer.from(derived);
}

/**
 * Encrypt a private key for storage. Returns a compact colon-delimited string:
 *   v1:<base64(salt)>:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>
 *
 * Empty values pass through unchanged (no-op) so callers can decide whether to
 * store an empty string as "not configured".
 */
export function encryptArcaKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const secret = resolveStorageSecret();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(secret, salt);

  const cipher = crypto.createCipheriv(CIPHER, key, iv);
  const ciphertext = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const b64 = (buf: Buffer) => buf.toString('base64');
  return [CURRENT_VERSION, b64(salt), b64(iv), b64(authTag), b64(ciphertext)].join(':');
}

/**
 * Decrypt a value previously encrypted with `encryptArcaKey`. Returns the
 * original UTF-8 string, or an empty string if the input is empty.
 *
 * Throws on unsupported format, tampered ciphertext, or wrong key.
 */
export function decryptArcaKey(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const parts = trimmed.split(':');
  if (parts.length !== 5 || parts[0] !== CURRENT_VERSION) {
    throw new Error('Unsupported ARCA key encryption format');
  }

  const [version, saltB64, ivB64, authTagB64, ciphertextB64] = parts;
  if (version !== CURRENT_VERSION) {
    throw new Error('Unsupported ARCA key encryption version');
  }

  const secret = resolveStorageSecret();
  const salt = Buffer.from(saltB64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const key = deriveKey(secret, salt);

  const decipher = crypto.createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Returns true if the value looks like an encrypted ARCA key. Used by APIs to
 * avoid echoing secrets back to the UI.
 */
export function isEncryptedArcaKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(':');
  return parts.length === 5 && parts[0] === CURRENT_VERSION;
}
