'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Role } from '@/lib/types';
import { AuthGuard } from './AuthGuard';

export function RoleGuard({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { user } = useAuth();

  return (
    <AuthGuard>
      {user && allow.includes(user.role) ? (
        children
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="font-semibold mb-1">Not authorized</h1>
          <p className="text-sm">This page is only available to moderators and admins.</p>
        </div>
      )}
    </AuthGuard>
  );
}
