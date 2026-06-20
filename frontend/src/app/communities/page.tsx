'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Spinner } from '@/components/Spinner';
import { apiFetch, ApiError } from '@/lib/api';
import type { Community } from '@/lib/types';

export default function CommunitiesPage() {
  return (
    <AuthGuard>
      <CommunitiesList />
    </AuthGuard>
  );
}

function CommunitiesList() {
  const [communities, setCommunities] = useState<Community[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Community[]>('/communities');
      setCommunities(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load communities.');
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount for the communities list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleJoinToggle(community: Community) {
    try {
      if (community.isMember) {
        await apiFetch(`/communities/${community.id}/membership`, { method: 'DELETE' });
      } else {
        await apiFetch(`/communities/${community.id}/membership`, { method: 'POST' });
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update membership.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Communities</h1>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          {showCreate ? 'Cancel' : 'Create community'}
        </button>
      </div>

      {showCreate && (
        <CreateCommunityForm
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}

      <ErrorBanner message={error} />

      {!communities && !error && (
        <div className="py-10 flex justify-center">
          <Spinner />
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 mt-4">
        {communities?.map((community) => (
          <li key={community.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <Link href={`/communities/${community.id}`} className="font-semibold hover:underline">
              {community.name}
            </Link>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{community.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => handleJoinToggle(community)}
                className={
                  community.isMember
                    ? 'text-xs font-medium px-2 py-1 rounded-md border border-slate-300'
                    : 'text-xs font-medium px-2 py-1 rounded-md bg-slate-900 text-white'
                }
              >
                {community.isMember ? 'Leave' : 'Join'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {communities?.length === 0 && (
        <p className="text-sm text-slate-500 mt-6">No communities yet — be the first to create one.</p>
      )}
    </div>
  );
}

function CreateCommunityForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch('/communities', { method: 'POST', body: { name, description: description || undefined } });
      setName('');
      setDescription('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create community.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-3">
      <div>
        <label htmlFor="community-name" className="block text-sm font-medium mb-1">
          Name
        </label>
        <input
          id="community-name"
          required
          minLength={3}
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label htmlFor="community-description" className="block text-sm font-medium mb-1">
          Description (optional)
        </label>
        <textarea
          id="community-description"
          maxLength={280}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      <ErrorBanner message={error} />
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
      >
        {submitting ? 'Creating…' : 'Create'}
      </button>
    </form>
  );
}
