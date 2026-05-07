import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// GET — return current user session info
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({
      user: {
        id: (session.user as any).id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
    });
  } catch {
    return NextResponse.json({ user: null });
  }
}
