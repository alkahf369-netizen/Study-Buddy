import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// We ensure the key is exactly 32 bytes (256 bits)
function getEncryptionKey() {
  const keyStr = process.env.ENCRYPTION_KEY || 'default_fallback_development_key_do_not_use_in_prod';
  // Pad or truncate to 32 bytes
  const buffer = Buffer.alloc(32);
  buffer.write(keyStr, 0, 32, 'utf-8');
  return buffer;
}

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedContent
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("[encryption] Encryption failed:", err);
    throw new Error("Encryption failed");
  }
}

export function decrypt(text: string): string {
  try {
    // If it doesn't look like an encrypted string (missing our standard colon format),
    // we assume it's a legacy plain-text key from before encryption was added.
    if (!text || !text.includes(':')) {
      return text;
    }

    const parts = text.split(':');
    if (parts.length !== 3) {
      return text;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error("[encryption] Decryption failed:", err);
    // If decryption fails, it might be a legacy key that happened to contain colons.
    return text;
  }
}
