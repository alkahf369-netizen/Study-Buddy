import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Checks if the current session user is an admin.
 * Returns the user object if admin, null otherwise.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, email: true, name: true }
  });

  if (!user || user.role !== 'admin') return null;
  return user;
}

/**
 * Gets the active public API key for users who don't have their own key.
 * Returns the first enabled public key, or null.
 */
export async function getPublicApiKey() {
  const publicKey = await prisma.apiKey.findFirst({
    where: {
      isPublic: true,
      isEnabled: true,
      isActive: true,
    },
    select: { id: true, key: true, endpoint: true, tokenLimit: true, tokenUsed: true }
  });
  return publicKey;
}
