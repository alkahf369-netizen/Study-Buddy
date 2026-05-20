import crypto from 'crypto';

/**
 * Generates a cryptographically secure, URL-safe token
 * with at least 32 bytes of entropy.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
