import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const repairId = parseInt(id, 10);
    if (isNaN(repairId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const updatedRepair = await prisma.repair.update({
      where: { id: repairId },
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
        photos: body.photos
      }
    });

    return NextResponse.json(updatedRepair);
  } catch (error) {
    console.error('Failed to update repair:', error);
    return NextResponse.json({ error: 'Failed to update repair' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const repairId = parseInt(id, 10);
    if (isNaN(repairId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await prisma.repair.delete({
      where: { id: repairId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete repair:', error);
    return NextResponse.json({ error: 'Failed to delete repair' }, { status: 500 });
  }
}
