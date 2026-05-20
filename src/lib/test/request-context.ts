import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { computeTakerIdentifier } from './taker-identifier';
import { auth } from '@/auth';

const COOKIE_NAME = 'sb_fp';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours
const COOKIE_PATH = '/'; // Must be accessible from both /test and /api routes

/**
 * Extracts the client IP from request headers.
 * Falls back to '127.0.0.1' if no forwarding headers are present.
 */
export async function getRequestIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || h.get('x-real-ip')
    || '127.0.0.1';
}

/**
 * Reads the fingerprint cookie or mints a new one if absent.
 * The cookie is httpOnly, scoped to /test, and lasts 24 hours.
 */
export async function readOrMintFingerprint(): Promise<{ value: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME);
  if (existing?.value) {
    return { value: existing.value, isNew: false };
  }
  const newValue = crypto.randomBytes(32).toString('base64url');
  cookieStore.set(COOKIE_NAME, newValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: COOKIE_PATH,
    maxAge: COOKIE_MAX_AGE,
  });
  return { value: newValue, isNew: true };
}

/**
 * Resolves the full test context for the current request:
 * takerIdentifier, userId, IP, and fingerprint.
 */
export async function resolveTestContext(): Promise<{
  takerIdentifier: string;
  userId: string | null;
  ip: string;
  fingerprint: string;
}> {
  const session = await auth();
  const userId = session?.user?.id || null;
  const ip = await getRequestIp();
  const { value: fingerprint } = await readOrMintFingerprint();
  const takerIdentifier = computeTakerIdentifier({ ip, fingerprintCookie: fingerprint, userId });
  return { takerIdentifier, userId, ip, fingerprint };
}
