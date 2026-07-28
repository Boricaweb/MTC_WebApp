import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const analysisData = await prisma.analysisData.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json(analysisData);
  } catch (error) {
    console.error('Failed to fetch analysis data:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis data' }, { status: 500 });
  }
}
