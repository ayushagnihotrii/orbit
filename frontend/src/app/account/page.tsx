'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { apiFetch, ApiError, clearTokens } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountSettings />
    </AuthGuard>
  );
}

function AccountSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await apiFetch('/users/me', { method: 'DELETE' });
      clearTokens();
      logout();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete your account.');
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Your account</h1>

      <dl className="rounded-lg border border-slate-200 bg-white p-4 text-sm grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 mb-8">
        <dt className="text-slate-500">Username</dt>
        <dd>{user.username}</dd>
        <dt className="text-slate-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-slate-500">Age</dt>
        <dd>{user.age}</dd>
        <dt className="text-slate-500">Role</dt>
        <dd>{user.role}</dd>
        <dt className="text-slate-500">Joined</dt>
        <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
      </dl>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="font-semibold text-red-900 text-sm mb-1">Delete account</h2>
        <p className="text-sm text-red-800 mb-3">
          This permanently scrubs your email, username, and password, and immediately signs you out. Posts
          and messages you sent stay (attributed to a deleted account) so conversations aren&apos;t broken
          for everyone else, but nothing about your account remains identifiable.
        </p>

        <ErrorBanner message={error} />

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-sm font-medium px-3 py-1.5 rounded-md border border-red-400 text-red-700"
          >
            Delete my account
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Yes, permanently delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm font-medium px-3 py-1.5 rounded-md border border-slate-300"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
