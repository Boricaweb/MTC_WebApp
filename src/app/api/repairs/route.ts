import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const sort = searchParams.get('sort') || 'desc';

    const repairs = await prisma.repair.findMany({
      orderBy: {
        id: sort === 'desc' ? 'desc' : 'asc'
      },
      take: limit
    });
    
    return NextResponse.json(repairs);
  } catch (error) {
    console.error('Failed to fetch repairs:', error);
    return NextResponse.json({ error: 'Failed to fetch repairs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Auto-generate order if not provided
    if (!body.order) {
      const lastRepair = await prisma.repair.findFirst({
        orderBy: { id: 'desc' }
      });
      const nextOrder = lastRepair && lastRepair.order ? (parseInt(lastRepair.order) + 1).toString() : '1';
      body.order = nextOrder;
    }

    const newRepair = await prisma.repair.create({
      data: {
        order: body.order,
        reporter: body.reporter,
        department: body.department,
        channel: body.channel,
        subject: body.subject,
        floor: body.floor,
        type: body.type,
        dateReported: body.dateReported,
        location: body.location,
        status: body.status,
        dateFixed: body.dateFixed || '',
        photos: body.photos || []
      }
    });

    return NextResponse.json(newRepair, { status: 201 });
  } catch (error) {
    console.error('Failed to create repair:', error);
    return NextResponse.json({ error: 'Failed to create repair' }, { status: 500 });
  }
}
