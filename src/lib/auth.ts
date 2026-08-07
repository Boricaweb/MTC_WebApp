import { cookies } from 'next/headers';

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('mtc_admin_session')?.value;
  return session === 'authenticated';
}
