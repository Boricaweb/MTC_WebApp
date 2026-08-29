import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const adminUser = process.env.ADMIN_USERNAME || '';
    const adminPass = process.env.ADMIN_PASSWORD || '';

    if (!adminUser || !adminPass) {
      return NextResponse.json(
        { message: 'Admin credentials not configured on server' },
        { status: 500 }
      );
    }

    if (username === adminUser && password === adminPass) {
      const response = NextResponse.json({ success: true, role: 'admin' });
      
      // Generate a cryptographically random session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Set secure HTTP-only cookie
      response.cookies.set({
        name: 'mtc_admin_session',
        value: sessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      });
      
      return response;
    }

    return NextResponse.json(
      { message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Invalid request' },
      { status: 400 }
    );
  }
}
