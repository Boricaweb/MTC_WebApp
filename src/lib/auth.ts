import { cookies } from 'next/headers';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('mtc_admin_session')?.value;
  // Token is a 64-char hex string from crypto.randomBytes(32)
  return typeof session === 'string' && /^[0-9a-f]{64}$/.test(session);
}
