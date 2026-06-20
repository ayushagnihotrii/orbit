'use client';

import { useCallback, useEffect, useState } from 'react';
import { RoleGuard } from '@/components/RoleGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Spinner } from '@/components/Spinner';
import { ActionWithReason } from '@/components/ActionWithReason';
import { apiFetch, ApiError } from '@/lib/api';
import type { ModerationActionItem, QueueItem } from '@/lib/types';

export default function ModerationPage() {
  return (
    <RoleGuard allow={['MODERATOR', 'ADMIN']}>
      <ModerationDashboard />
    </RoleGuard>
  );
}

const CONTENT_LABEL: Record<QueueItem['contentType'], string> = {
  POST: 'Post',
  CHAT_MESSAGE: 'Chat message',
  DIRECT_MESSAGE: 'Direct message',
};

function ModerationDashboard() {
  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [auditLog, setAuditLog] = useState<ModerationActionItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [queueData, auditData] = await Promise.all([
        apiFetch<QueueItem[]>('/moderation/queue'),
        apiFetch<ModerationActionItem[]>('/moderation/audit-log'),
      ]);
      setQueue(queueData);
      setAuditLog(auditData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the moderation dashboard.');
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount for the moderation queue + audit log.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function approve(item: QueueItem, reason: string) {
    await apiFetch(`/moderation/content/${item.contentType}/${item.id}/approve`, {
      method: 'POST',
      body: { reason: reason || undefined },
    });
    await load();
  }

  async function remove(item: QueueItem, reason: string) {
    await apiFetch(`/moderation/content/${item.contentType}/${item.id}/remove`, {
      method: 'POST',
      body: { reason: reason || undefined },
    });
    await load();
  }

  async function warn(item: QueueItem, reason: string) {
    await apiFetch(`/moderation/users/${item.authorId}/warn`, { method: 'POST', body: { reason } });
    await load();
  }

  async function suspend(item: QueueItem, reason: string) {
    await apiFetch(`/moderation/users/${item.authorId}/suspend`, { method: 'POST', body: { reason } });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Moderation dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">
        Content auto-flagged by the AI toxicity model or the profanity filter, plus anything reported by
        users, lands here for human review.
      </p>

      <ErrorBanner message={error} />

      {!queue ? (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      ) : queue.length === 0 ? (
        <p className="text-sm text-slate-500 rounded-md border border-slate-200 bg-white p-4">
          Nothing in the review queue right now.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {queue.map((item) => (
            <li key={`${item.contentType}:${item.id}`} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-medium">{CONTENT_LABEL[item.contentType]}</span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{item.body}</p>
              <div className="text-xs text-slate-600 mt-2 flex flex-wrap gap-3">
                <span>
                  Author: <span className="font-medium">{item.authorUsername}</span>
                </span>
                <span>Toxicity score: {item.toxicityScore.toFixed(2)}</span>
                {item.reportCount > 0 && <span>{item.reportCount} user report(s)</span>}
              </div>
              {item.reportReasons.length > 0 && (
                <ul className="text-xs text-slate-600 mt-1 list-disc list-inside">
                  {item.reportReasons.map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                <ActionWithReason
                  label="Approve"
                  buttonClassName="text-xs font-medium px-2 py-1 rounded-md bg-emerald-600 text-white"
                  onConfirm={(reason) => approve(item, reason)}
                />
                <ActionWithReason
                  label="Remove"
                  buttonClassName="text-xs font-medium px-2 py-1 rounded-md bg-red-600 text-white"
                  onConfirm={(reason) => remove(item, reason)}
                />
                <ActionWithReason
                  label="Warn author"
                  buttonClassName="text-xs font-medium px-2 py-1 rounded-md border border-slate-400"
                  reasonRequired
                  onConfirm={(reason) => warn(item, reason)}
                />
                <ActionWithReason
                  label="Suspend author"
                  buttonClassName="text-xs font-medium px-2 py-1 rounded-md border border-red-400 text-red-700"
                  reasonRequired
                  onConfirm={(reason) => suspend(item, reason)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="text-xl font-bold mt-10 mb-3">Audit log</h2>
      {!auditLog ? (
        <div className="py-6 flex justify-center">
          <Spinner />
        </div>
      ) : auditLog.length === 0 ? (
        <p className="text-sm text-slate-500">No moderation actions yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {auditLog.map((entry) => (
            <li key={entry.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <span className="font-medium">{entry.moderator.username}</span> {describeAction(entry)}
              {entry.reason && <span className="text-slate-500"> — “{entry.reason}”</span>}
              <span className="text-xs text-slate-400 ml-2">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function describeAction(entry: ModerationActionItem): string {
  switch (entry.action) {
    case 'APPROVE':
      return `approved a ${CONTENT_LABEL[entry.contentType ?? 'POST'].toLowerCase()}`;
    case 'REMOVE':
      return `removed a ${CONTENT_LABEL[entry.contentType ?? 'POST'].toLowerCase()}`;
    case 'WARN':
      return `warned ${entry.targetUser?.username ?? 'a user'}`;
    case 'SUSPEND':
      return `suspended ${entry.targetUser?.username ?? 'a user'}`;
    case 'UNSUSPEND':
      return `unsuspended ${entry.targetUser?.username ?? 'a user'}`;
    default:
      return entry.action;
  }
}
