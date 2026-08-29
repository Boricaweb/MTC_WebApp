'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode } = useAuth();
  const isLoginPage = pathname === '/login';

  // If user hasn't chosen a mode yet and isn't on login page, redirect to login
  // Note: the AuthContext now verifies auth with the server on mount,
  // so we rely on its hydrated state rather than trusting localStorage directly.
  React.useEffect(() => {
    if (!isLoginPage && !mode) {
      router.push('/login');
    }
  }, [isLoginPage, mode, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div id="app" className="app-container" style={{ display: 'flex' }}>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
