import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin';

// GET — Get usage stats for all public keys or a specific key
export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(req.url);
  const keyId = url.searchParams.get('keyId');
  const days = parseInt(url.searchParams.get('days') || '30');

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Build where clause
  const where: any = { createdAt: { gte: since } };
  if (keyId) {
    where.apiKeyId = keyId;
  } else {
    // Only show usage for public keys
    where.apiKey = { isPublic: true };
  }

  // Get aggregated stats
  const usageLogs = await prisma.tokenUsage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      endpoint: true,
      userId: true,
      createdAt: true,
      apiKey: { select: { name: true, id: true } }
    }
  });

  // Aggregate totals
  const totals = await prisma.tokenUsage.aggregate({
    where,
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
    },
    _count: true,
  });

  // Per-key breakdown
  const perKeyStats = await prisma.tokenUsage.groupBy({
    by: ['apiKeyId'],
    where,
    _sum: {
      totalTokens: true,
    },
    _count: true,
  });

  return NextResponse.json({
    logs: usageLogs,
    totals: {
      inputTokens: totals._sum.inputTokens || 0,
      outputTokens: totals._sum.outputTokens || 0,
      totalTokens: totals._sum.totalTokens || 0,
      totalRequests: totals._count || 0,
    },
    perKey: perKeyStats,
    period: { days, since: since.toISOString() },
  });
}
