'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Spinner } from '@/components/Spinner';
import { ReportButton } from '@/components/ReportButton';
import { StatusPill } from '@/components/StatusPill';
import { apiFetch, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DirectMessage } from '@/lib/types';

const POLL_INTERVAL_MS = 4000;

export default function ConnectionThreadPage() {
  return (
    <AuthGuard>
      <DirectMessageThread />
    </AuthGuard>
  );
}

function DirectMessageThread() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DirectMessage[]>(`/connections/${connectionId}/messages`);
      setMessages(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this conversation.');
    }
  }, [connectionId]);

  useEffect(() => {
    // Fetch-on-mount, then poll for new messages — there's no websocket layer in this prototype.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const interval = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(`/connections/${connectionId}/messages`, { method: 'POST', body: { body } });
      setBody('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <Link href="/connections" className="text-sm text-slate-500 hover:underline">
        ← All connections
      </Link>

      <ErrorBanner message={error} />

      <div className="flex-1 overflow-y-auto mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
        {!messages && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}
        {messages?.map((message) => {
          const isMine = message.senderId === user?.id;
          return (
            <div key={message.id} className={`max-w-[75%] ${isMine ? 'self-end text-right' : 'self-start'}`}>
              <div
                className={`rounded-lg px-3 py-2 text-sm inline-block ${
                  isMine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
                }`}
              >
                {message.body}
              </div>
              <div className="flex items-center gap-2 mt-1 justify-end">
                <span className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleTimeString()}</span>
                <StatusPill status={message.moderationStatus} />
                {!isMine && <ReportButton contentType="DIRECT_MESSAGE" contentId={message.id} />}
              </div>
            </div>
          );
        })}
        {messages?.length === 0 && <p className="text-sm text-slate-500">No messages yet. Say hi!</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <label htmlFor="dm-message" className="sr-only">
          Message
        </label>
        <input
          id="dm-message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="Type a message…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-md bg-slate-900 text-white text-sm font-medium px-4 py-2 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
