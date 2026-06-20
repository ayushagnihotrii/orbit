'use client';

import { useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import type { Post } from '@/lib/types';
import { ReportButton } from './ReportButton';
import { StatusPill } from './StatusPill';

export function PostCard({ post, onChanged }: { post: Post; onChanged: () => void }) {
  const [error, setError] = useState<string | null>(null);

  async function vote(value: 1 | -1) {
    setError(null);
    try {
      if (post.myVote === value) {
        await apiFetch(`/posts/${post.id}/votes`, { method: 'DELETE' });
      } else {
        await apiFetch(`/posts/${post.id}/votes`, { method: 'POST', body: { value } });
      }
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register your vote.');
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-semibold">{post.authorUsername}</span>{' '}
          <span className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleString()}</span>
        </div>
        <StatusPill status={post.moderationStatus} />
      </div>

      <p className="mt-2 text-sm whitespace-pre-wrap">{post.body}</p>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="mt-2 max-h-64 rounded-md border border-slate-200" />
      )}

      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-pressed={post.myVote === 1}
            onClick={() => vote(1)}
            className={`rounded-md px-2 py-1 text-xs font-medium border ${
              post.myVote === 1 ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-300'
            }`}
          >
            ▲
          </button>
          <span className="text-sm font-medium w-6 text-center">{post.score}</span>
          <button
            type="button"
            aria-pressed={post.myVote === -1}
            onClick={() => vote(-1)}
            className={`rounded-md px-2 py-1 text-xs font-medium border ${
              post.myVote === -1 ? 'bg-red-600 text-white border-red-600' : 'border-slate-300'
            }`}
          >
            ▼
          </button>
        </div>

        <ReportButton contentType="POST" contentId={post.id} />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}
