'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/Spinner';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 text-center">
      <h1 className="text-3xl font-bold tracking-tight">SafeSpace</h1>
      <p className="mt-3 text-slate-600">
        A safety-first social platform prototype for students 13+. Every post and message is screened by an
        AI moderation layer before it reaches anyone else, and there are no open stranger-to-stranger DMs.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        {user ? (
          <Link
            href="/communities"
            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Browse communities
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              Sign up
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-md border border-slate-300 text-sm font-medium hover:bg-slate-100"
            >
              Log in
            </Link>
          </>
        )}
      </div>

      <dl className="mt-12 grid gap-4 text-left sm:grid-cols-2">
        {[
          ['Minimal data', 'Email, username, and a self-declared age — no real names or location.'],
          ['No stranger DMs', 'Messaging only in moderated group spaces or between mutually-approved connections.'],
          ['AI + human moderation', 'Every post and message is scored for toxicity before anyone else sees it.'],
          ['Default-private', 'New profiles start at the most protective privacy setting.'],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
            <dt className="font-semibold text-sm">{title}</dt>
            <dd className="text-sm text-slate-600 mt-1">{body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
