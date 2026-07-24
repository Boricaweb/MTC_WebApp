import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const repairs = await prisma.repair.findMany();
    
    let total = repairs.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let transferred = 0;
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    repairs.forEach(repair => {
      const status = repair.status;
      if (!statusCounts[status]) statusCounts[status] = 0;
      statusCounts[status]++;
      
      const type = repair.type || 'อื่นๆ';
      if (!typeCounts[type]) typeCounts[type] = 0;
      typeCounts[type]++;

      if (status === 'เรียบร้อย') completed++;
      else if (status === 'กำลังดำเนินการ') inProgress++;
      else if (status === 'รอดำเนินการ') pending++;
      else if (status === 'โอนย้าย') transferred++;
    });

    return NextResponse.json({
      total,
      completed,
      pending,
      inProgress,
      transferred,
      statusCounts,
      typeCounts
    });
  } catch (error) {
    console.error('Failed to calculate summary:', error);
    return NextResponse.json({ error: 'Failed to calculate summary' }, { status: 500 });
  }
}
