import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the secure cookie
  response.cookies.delete('mtc_admin_session');
  
  return response;
}
