import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import AppLayout from '@/components/AppLayout';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto' });

export const metadata: Metadata = {
  title: 'MTC | ระบบจัดการงานซ่อมบำรุง',
  description: 'ระบบจัดการงานซ่อมบำรุง MTC - ติดตามและจัดการงานซ่อมอาคารอย่างมีประสิทธิภาพ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} ${notoSansThai.variable}`}>
        <ToastProvider>
          <AuthProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
