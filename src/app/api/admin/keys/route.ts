import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { encrypt, decrypt } from '@/lib/encryption';

// GET — List all public API keys (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { usageLogs: true } }
    }
  });

  // Mask the actual key values
  const maskedKeys = keys.map(k => {
    const rawKey = decrypt(k.key);
    const masked = rawKey && rawKey.length > 8
      ? `${rawKey.slice(0, 4)}••••••••${rawKey.slice(-4)}`
      : '••••••••';
    return {
      id: k.id,
      name: k.name,
      key: masked,
      endpoint: k.endpoint,
      isActive: k.isActive,
      isEnabled: k.isEnabled,
      tokenLimit: k.tokenLimit,
      tokenUsed: k.tokenUsed,
      totalRequests: k._count.usageLogs,
      createdAt: k.createdAt,
    };
  });

  return NextResponse.json({ keys: maskedKeys });
}

// POST — Add a new public API key
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { name, key, endpoint, tokenLimit } = await req.json();

  if (!key || !key.trim()) {
    return NextResponse.json({ error: 'API key is required' }, { status: 400 });
  }
  if (!endpoint || !endpoint.trim()) {
    return NextResponse.json({ error: 'Endpoint URL is required' }, { status: 400 });
  }

  // Auto-correct endpoint
  let finalEndpoint = endpoint.trim();
  if (!finalEndpoint.endsWith('/chat/completions') &&
      !finalEndpoint.endsWith('/messages') &&
      !finalEndpoint.endsWith('/generate')) {
    finalEndpoint = finalEndpoint.replace(/\/$/, '') + '/chat/completions';
  }

  const encryptedKey = encrypt(key.trim());

  // Check if there are any existing active public keys
  const existingActive = await prisma.apiKey.count({
    where: { isPublic: true, isActive: true }
  });

  const newKey = await prisma.apiKey.create({
    data: {
      name: name || 'Public API Key',
      key: encryptedKey,
      endpoint: finalEndpoint,
      isPublic: true,
      isEnabled: true,
      isActive: existingActive === 0, // First public key becomes active
      tokenLimit: tokenLimit ? parseInt(tokenLimit) : null,
      tokenUsed: 0,
      userId: admin.id, // Admin owns public keys
    }
  });

  return NextResponse.json({
    success: true,
    key: {
      id: newKey.id,
      name: newKey.name,
      endpoint: newKey.endpoint,
      isActive: newKey.isActive,
      isEnabled: newKey.isEnabled,
      tokenLimit: newKey.tokenLimit,
      tokenUsed: 0,
      createdAt: newKey.createdAt,
    }
  });
}
