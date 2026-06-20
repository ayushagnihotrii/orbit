'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Spinner } from '@/components/Spinner';
import { apiFetch, ApiError } from '@/lib/api';
import type { ConnectionRequestItem } from '@/lib/types';

export default function ConnectionsPage() {
  return (
    <AuthGuard>
      <ConnectionsView />
    </AuthGuard>
  );
}

function ConnectionsView() {
  const [incoming, setIncoming] = useState<ConnectionRequestItem[] | null>(null);
  const [outgoing, setOutgoing] = useState<ConnectionRequestItem[] | null>(null);
  const [accepted, setAccepted] = useState<ConnectionRequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [incomingData, outgoingData, acceptedData] = await Promise.all([
        apiFetch<ConnectionRequestItem[]>('/connections/requests/incoming'),
        apiFetch<ConnectionRequestItem[]>('/connections/requests/outgoing'),
        apiFetch<ConnectionRequestItem[]>('/connections'),
      ]);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
      setAccepted(acceptedData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load connections.');
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount for incoming/outgoing/accepted connections.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function respond(requestId: string, accept: boolean) {
    try {
      await apiFetch(`/connections/requests/${requestId}/respond`, { method: 'POST', body: { accept } });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond to request.');
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Connections</h1>
      <p className="text-sm text-slate-500 mb-6">
        Direct messages only happen once both people have accepted a connection request — there is no way to
        message a stranger directly.
      </p>

      <SendRequestForm onSent={() => void load()} />

      <ErrorBanner message={error} />

      {!incoming || !outgoing || !accepted ? (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 mt-6">
          <section>
            <h2 className="font-semibold text-sm text-slate-700 mb-2">Incoming requests</h2>
            {incoming.length === 0 && <p className="text-sm text-slate-500">No incoming requests.</p>}
            <ul className="flex flex-col gap-2">
              {incoming.map((req) => (
                <li key={req.id} className="rounded-md border border-slate-200 bg-white p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{req.requester.username}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => respond(req.id, true)}
                      className="text-xs font-medium px-2 py-1 rounded-md bg-slate-900 text-white"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => respond(req.id, false)}
                      className="text-xs font-medium px-2 py-1 rounded-md border border-slate-300"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-sm text-slate-700 mb-2">Outgoing requests</h2>
            {outgoing.length === 0 && <p className="text-sm text-slate-500">No outgoing requests.</p>}
            <ul className="flex flex-col gap-2">
              {outgoing.map((req) => (
                <li key={req.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                  Waiting on <span className="font-medium">{req.recipient.username}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="sm:col-span-2">
            <h2 className="font-semibold text-sm text-slate-700 mb-2">Your connections</h2>
            {accepted.length === 0 && <p className="text-sm text-slate-500">No accepted connections yet.</p>}
            <ul className="grid gap-2 sm:grid-cols-2">
              {accepted.map((conn) => (
                <li key={conn.id}>
                  <Link
                    href={`/connections/${conn.id}`}
                    className="block rounded-md border border-slate-200 bg-white p-3 text-sm font-medium hover:bg-slate-50"
                  >
                    Message {conn.otherUsername}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function SendRequestForm({ onSent }: { onSent: () => void }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSent(false);
    try {
      await apiFetch('/connections/requests', { method: 'POST', body: { recipientUsername: username } });
      setUsername('');
      setSent(true);
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="recipient-username" className="block text-sm font-medium mb-1">
          Send a connection request
        </label>
        <input
          id="recipient-username"
          required
          minLength={3}
          placeholder="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-2 disabled:opacity-50"
      >
        {submitting ? 'Sending…' : 'Send request'}
      </button>
      {error && <p className="text-xs text-red-600 ml-2">{error}</p>}
      {sent && <p className="text-xs text-emerald-600 ml-2">Request sent.</p>}
    </form>
  );
}
