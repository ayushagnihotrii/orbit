'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const navLink = 'px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100';
const activeNavLink = 'px-3 py-2 rounded-md text-sm font-medium bg-slate-900 text-white';

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav
        aria-label="Primary"
        className="w-full max-w-5xl mx-auto px-4 h-14 flex items-center justify-between"
      >
        <Link href="/" className="font-semibold text-slate-900">
          SafeSpace
        </Link>

        {!loading && user && (
          <div className="flex items-center gap-1">
            <Link href="/communities" className={isActive('/communities') ? activeNavLink : navLink}>
              Communities
            </Link>
            <Link href="/connections" className={isActive('/connections') ? activeNavLink : navLink}>
              Connections
            </Link>
            {(user.role === 'MODERATOR' || user.role === 'ADMIN') && (
              <Link href="/moderation" className={isActive('/moderation') ? activeNavLink : navLink}>
                Moderation
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              <Link href="/account" className="text-sm text-slate-500 hover:underline">
                {user.username} <span className="text-slate-400">({user.role.toLowerCase()})</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-md text-sm font-medium border border-slate-300 hover:bg-slate-100"
              >
                Log out
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className={navLink}>
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-slate-900 text-white hover:bg-slate-800"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
