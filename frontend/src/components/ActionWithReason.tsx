'use client';

import { useState } from 'react';

interface ActionWithReasonProps {
  label: string;
  buttonClassName: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => Promise<void>;
}

export function ActionWithReason({ label, buttonClassName, reasonRequired, onConfirm }: ActionWithReasonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason);
      setOpen(false);
      setReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={handleConfirm} className="flex flex-col gap-1.5 mt-1 p-2 rounded-md bg-slate-50 border border-slate-200">
      <label className="text-xs text-slate-600">
        Reason {reasonRequired ? '(required)' : '(optional)'}
      </label>
      <textarea
        required={reasonRequired}
        minLength={reasonRequired ? 3 : undefined}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={`${buttonClassName} disabled:opacity-50`}>
          {submitting ? 'Working…' : `Confirm ${label.toLowerCase()}`}
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
