import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';
import { encrypt } from '@/lib/encryption';

// PUT — Update a public API key (toggle enabled, set active, update limit, rotate key)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const key = await prisma.apiKey.findFirst({
    where: { id, isPublic: true }
  });

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  const updateData: any = {};

  // Toggle enabled/disabled
  if (typeof body.isEnabled === 'boolean') {
    updateData.isEnabled = body.isEnabled;
  }

  // Set as active (deactivate others first)
  if (body.setActive === true) {
    await prisma.apiKey.updateMany({
      where: { isPublic: true },
      data: { isActive: false }
    });
    updateData.isActive = true;
  }

  // Update token limit
  if (body.tokenLimit !== undefined) {
    updateData.tokenLimit = body.tokenLimit === null || body.tokenLimit === ''
      ? null
      : parseInt(body.tokenLimit);
  }

  // Update name
  if (typeof body.name === 'string' && body.name.trim()) {
    updateData.name = body.name.trim();
  }

  // Update endpoint
  if (typeof body.endpoint === 'string' && body.endpoint.trim()) {
    let finalEndpoint = body.endpoint.trim();
    if (
      !finalEndpoint.endsWith('/chat/completions') &&
      !finalEndpoint.endsWith('/messages') &&
      !finalEndpoint.endsWith('/generate')
    ) {
      finalEndpoint = finalEndpoint.replace(/\/$/, '') + '/chat/completions';
    }
    updateData.endpoint = finalEndpoint;
  }

  // Rotate / replace the key value (re-encrypts new value)
  if (typeof body.key === 'string' && body.key.trim()) {
    updateData.key = encrypt(body.key.trim());
    // Reset usage counter when rotating since it's effectively a new key
    if (body.resetUsageOnRotate !== false) {
      updateData.tokenUsed = 0;
    }
  }

  // Reset token usage explicitly
  if (body.resetUsage === true) {
    updateData.tokenUsed = 0;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await prisma.apiKey.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    key: {
      id: updated.id,
      name: updated.name,
      endpoint: updated.endpoint,
      isActive: updated.isActive,
      isEnabled: updated.isEnabled,
      tokenLimit: updated.tokenLimit,
      tokenUsed: updated.tokenUsed,
    }
  });
}

// DELETE — Remove a public API key
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  const key = await prisma.apiKey.findFirst({
    where: { id, isPublic: true }
  });

  if (!key) {
    return NextResponse.json({ error: 'Key not found' }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });

  // If deleted key was active, activate the next available one
  if (key.isActive) {
    const fallback = await prisma.apiKey.findFirst({
      where: { isPublic: true, isEnabled: true },
      orderBy: { createdAt: 'desc' }
    });
    if (fallback) {
      await prisma.apiKey.update({
        where: { id: fallback.id },
        data: { isActive: true }
      });
    }
  }

  return NextResponse.json({ success: true });
}
