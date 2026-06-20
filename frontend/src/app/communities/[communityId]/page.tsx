'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Spinner } from '@/components/Spinner';
import { PostCard } from '@/components/PostCard';
import { apiFetch, ApiError } from '@/lib/api';
import type { ChatRoom, Community, Post } from '@/lib/types';

export default function CommunityDetailPage() {
  return (
    <AuthGuard>
      <CommunityDetail />
    </AuthGuard>
  );
}

function CommunityDetail() {
  const { communityId } = useParams<{ communityId: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Community>(`/communities/${communityId}`);
      setCommunity(data);
      if (data.isMember) {
        const [postsData, roomsData] = await Promise.all([
          apiFetch<Post[]>(`/communities/${communityId}/posts`),
          apiFetch<ChatRoom[]>(`/communities/${communityId}/chat-rooms`),
        ]);
        setPosts(postsData);
        setChatRooms(roomsData);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this community.');
    }
  }, [communityId]);

  useEffect(() => {
    // Standard fetch-on-mount for community detail + its posts/chat rooms.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleJoinToggle() {
    if (!community) return;
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

  if (error) return <ErrorBanner message={error} />;
  if (!community) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <Link href="/communities" className="text-sm text-slate-500 hover:underline">
        ← All communities
      </Link>

      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{community.name}</h1>
          {community.description && <p className="text-slate-600 mt-1">{community.description}</p>}
          <p className="text-xs text-slate-500 mt-1">
            {community.memberCount} member{community.memberCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleJoinToggle}
          className={
            community.isMember
              ? 'px-3 py-1.5 rounded-md border border-slate-300 text-sm font-medium'
              : 'px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm font-medium'
          }
        >
          {community.isMember ? 'Leave community' : 'Join community'}
        </button>
      </div>

      {!community.isMember && (
        <p className="text-sm text-slate-500 rounded-md border border-slate-200 bg-white p-4">
          Join this community to see and create posts, and to use its group chat.
        </p>
      )}

      {community.isMember && (
        <>
          {chatRooms && chatRooms.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {chatRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/communities/${community.id}/chat/${room.id}`}
                  className="text-sm px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-100"
                >
                  # {room.name}
                </Link>
              ))}
            </div>
          )}

          <CreatePostForm
            communityId={community.id}
            onCreated={() => {
              void load();
            }}
          />

          {!posts && (
            <div className="py-10 flex justify-center">
              <Spinner />
            </div>
          )}

          <ul className="flex flex-col gap-3 mt-4">
            {posts?.map((post) => (
              <PostCard key={post.id} post={post} onChanged={() => void load()} />
            ))}
          </ul>
          {posts?.length === 0 && <p className="text-sm text-slate-500 mt-4">No posts yet. Be the first!</p>}
        </>
      )}
    </div>
  );
}

function CreatePostForm({ communityId, onCreated }: { communityId: string; onCreated: () => void }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch(`/communities/${communityId}/posts`, { method: 'POST', body: { body } });
      setBody('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-2">
      <label htmlFor="post-body" className="text-sm font-medium">
        Share something with this community
      </label>
      <textarea
        id="post-body"
        required
        minLength={1}
        maxLength={2000}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <ErrorBanner message={error} />
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 disabled:opacity-50"
      >
        {submitting ? 'Posting…' : 'Post'}
      </button>
    </form>
  );
}
