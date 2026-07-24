import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const weeklyData = await prisma.weeklyData.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(weeklyData);
  } catch (error) {
    console.error('Failed to fetch weekly data:', error);
    return NextResponse.json({ error: 'Failed to fetch weekly data' }, { status: 500 });
  }
}
