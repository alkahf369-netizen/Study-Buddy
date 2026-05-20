import crypto from 'crypto';

/**
 * Computes a deterministic Taker_Identifier from the requester's
 * IP address, fingerprint cookie, and optional userId.
 * Returns lowercase hex of sha256(ip + '|' + fingerprintCookie + '|' + (userId ?? ''))
 */
export function computeTakerIdentifier({
  ip,
  fingerprintCookie,
  userId,
}: {
  ip: string;
  fingerprintCookie: string;
  userId?: string | null;
}): string {
  const input = ip + '|' + fingerprintCookie + '|' + (userId ?? '');
  return crypto.createHash('sha256').update(input).digest('hex');
}
