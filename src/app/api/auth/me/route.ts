import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  return NextResponse.json({ isAdmin: isAuth });
}
