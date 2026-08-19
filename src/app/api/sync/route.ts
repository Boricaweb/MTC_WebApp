import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/auth';

// This acts as a proxy to avoid CORS issues in the browser
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, data } = body;

    if (!url) {
      return NextResponse.json({ error: 'Missing Web App URL' }, { status: 400 });
    }

    // Prepare data to sync
    let payload = data;
    if (!payload) {
      // If no specific data is sent, fetch everything to sync
      const repairs = await prisma.repair.findMany({ orderBy: { id: 'asc' } });
      const weekly = await prisma.weeklyData.findMany({ orderBy: { id: 'asc' } });
      const analysis = await prisma.analysisData.findMany({ orderBy: { id: 'asc' } });
      
      let total = repairs.length;
      let completed = 0;
      let inProgress = 0;
      let pending = 0;
      let transferred = 0;
      const statusCounts: Record<string, number> = {};

      repairs.forEach(repair => {
        const status = repair.status;
        if (!statusCounts[status]) statusCounts[status] = 0;
        statusCounts[status]++;

        if (status === 'เรียบร้อย') completed++;
        else if (status === 'กำลังดำเนินการ') inProgress++;
        else if (status === 'รอดำเนินการ') pending++;
        else if (status === 'โอนย้าย') transferred++;
      });

      payload = {
        repairs,
        summary: {
          total,
          completed,
          pending,
          inProgress,
          transferred,
          statusCounts
        },
        weekly,
        analysis
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to sync to Google Sheets:', error);
    return NextResponse.json({ error: 'Failed to sync to Google Sheets', details: error.message }, { status: 500 });
  }
}
