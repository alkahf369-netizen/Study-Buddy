import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET — List users with pagination, search, and filters
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search')?.trim() || '';
  const filter = url.searchParams.get('filter') || 'all'; // all | admins | banned
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get('pageSize') || '25')));

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (filter === 'admins') where.role = 'admin';
  if (filter === 'banned') where.isBanned = true;
  if (filter === 'users') where.role = 'user';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isBanned: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
            quizzes: true,
            apiKeys: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Aggregate token usage per user (best-effort, may be 0 for users with no public-key activity)
  const userIds = users.map((u) => u.id);
  let usageMap = new Map<string, number>();
  if (userIds.length > 0) {
    const usage = await prisma.tokenUsage.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { totalTokens: true },
    });
    usageMap = new Map(usage.map((u) => [u.userId!, u._sum.totalTokens || 0]));
  }

  const items = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    isBanned: u.isBanned,
    createdAt: u.createdAt,
    counts: u._count,
    totalTokens: usageMap.get(u.id) || 0,
  }));

  return NextResponse.json({
    users: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
