import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * GET /api/user/active-source
 * Returns which API source the user is currently using:
 * - "inbuilt" if using the public/system key
 * - "personal" if using their own key
 * Also returns whether a public key is available.
 */
export async function GET() {
  try {
    const session = await auth();

    // Check if a public key exists and is active
    const publicKeyExists = await prisma.apiKey.findFirst({
      where: { isPublic: true, isEnabled: true, isActive: true },
      select: { id: true, name: true }
    });

    let userActiveKey: any = null;
    if (session?.user?.id) {
      userActiveKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id, isActive: true, isPublic: false },
        select: { id: true, name: true }
      });
    }

    return NextResponse.json({
      hasPublicKey: !!publicKeyExists,
      publicKeyName: publicKeyExists?.name || 'Inbuilt API',
      activeSource: userActiveKey ? 'personal' : 'inbuilt',
      activeKeyName: userActiveKey?.name || null,
    });
  } catch (error: any) {
    return NextResponse.json({ hasPublicKey: false, activeSource: 'inbuilt', activeKeyName: null }, { status: 200 });
  }
}

/**
 * PUT /api/user/active-source
 * Switch between "inbuilt" and "personal" API source.
 * When switching to "inbuilt", deactivates all user keys.
 * When switching to "personal", activates the most recent user key.
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { source } = await req.json();

    if (source === 'inbuilt') {
      // Deactivate all user's personal keys
      await prisma.apiKey.updateMany({
        where: { userId: session.user.id, isPublic: false },
        data: { isActive: false }
      });
    } else if (source === 'personal') {
      // Activate the most recent user key
      const latestKey = await prisma.apiKey.findFirst({
        where: { userId: session.user.id, isPublic: false },
        orderBy: { createdAt: 'desc' }
      });
      if (latestKey) {
        await prisma.apiKey.updateMany({
          where: { userId: session.user.id, isPublic: false },
          data: { isActive: false }
        });
        await prisma.apiKey.update({
          where: { id: latestKey.id },
          data: { isActive: true }
        });
      } else {
        return NextResponse.json({ error: 'No personal API key found' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, activeSource: source });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
