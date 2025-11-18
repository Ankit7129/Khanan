// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import LayoutClient from './LayoutClient';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KhananNetra - Mining Monitoring System',
  description: 'Government platform for mining activity monitoring and compliance',
  icons: {
    icon: [
      { url: '/logo.png' },
      { url: '/icon.png', sizes: '500x500', type: 'image/png' }
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </head>
      <LayoutClient>{children}</LayoutClient>
    </html>
  );
}