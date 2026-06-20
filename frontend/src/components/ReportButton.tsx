'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { ContentType } from '@/lib/types';

export function ReportButton({ contentType, contentId }: { contentType: ContentType; contentId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      await apiFetch('/reports', { method: 'POST', body: { contentType, contentId, reason } });
      setStatus('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit report.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return <span className="text-xs text-slate-500">Reported — thanks for flagging this.</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-slate-500 hover:text-red-600 hover:underline"
      >
        Report
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5 mt-1" aria-label="Report this content">
      <label htmlFor={`report-reason-${contentId}`} className="text-xs text-slate-600">
        Why are you reporting this?
      </label>
      <textarea
        id={`report-reason-${contentId}`}
        required
        minLength={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full max-w-sm rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="text-xs font-medium px-2 py-1 rounded-md bg-red-600 text-white disabled:opacity-50"
        >
          {status === 'submitting' ? 'Submitting…' : 'Submit report'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium px-2 py-1 rounded-md border border-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
