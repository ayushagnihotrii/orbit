import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/Navbar';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SafeSpace — safety-first student community (prototype)',
  description: '13+ prototype social platform with safety-by-design and AI moderation. Test data only.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
          <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
            SafeSpace is a 13+ prototype using synthetic test data only.{' '}
            <a href="/privacy" className="underline hover:text-slate-700">
              Privacy
            </a>{' '}
            ·{' '}
            <a href="/terms" className="underline hover:text-slate-700">
              Terms
            </a>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
