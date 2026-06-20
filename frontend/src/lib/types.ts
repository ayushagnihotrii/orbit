export type Role = 'STUDENT' | 'MODERATOR' | 'ADMIN';
export type ModerationStatus = 'APPROVED' | 'PENDING' | 'REMOVED';
export type ContentType = 'POST' | 'CHAT_MESSAGE' | 'DIRECT_MESSAGE';
export type ConnectionStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface User {
  id: string;
  email: string;
  username: string;
  age: number;
  role: Role;
  isPrivate: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdById: string;
  createdAt: string;
  memberCount: number;
  isMember: boolean;
}

export interface Post {
  id: string;
  communityId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  score: number;
  myVote: number;
  moderationStatus: ModerationStatus;
}

export interface ChatRoom {
  id: string;
  communityId: string;
  name: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  authorId: string;
  author: { username: string };
  body: string;
  createdAt: string;
  moderationStatus: ModerationStatus;
}

export interface ConnectionRequestItem {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: string;
  respondedAt: string | null;
  requester: { username: string };
  recipient: { username: string };
  otherUsername?: string;
}

export interface DirectMessage {
  id: string;
  connectionId: string;
  senderId: string;
  body: string;
  createdAt: string;
  moderationStatus: ModerationStatus;
}

export interface QueueItem {
  id: string;
  body: string;
  authorId: string;
  authorUsername: string;
  createdAt: string;
  moderationStatus: ModerationStatus;
  toxicityScore: number;
  contentType: ContentType;
  reportCount: number;
  reportReasons: string[];
}

export interface ModerationActionItem {
  id: string;
  moderatorId: string;
  moderator: { username: string };
  action: 'APPROVE' | 'REMOVE' | 'WARN' | 'SUSPEND' | 'UNSUSPEND';
  contentType: ContentType | null;
  contentId: string | null;
  targetUserId: string | null;
  targetUser: { username: string } | null;
  reason: string | null;
  createdAt: string;
}
