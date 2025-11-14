export type ID = string;

export interface User {
  id: ID;
  name: string;
  handle: string;
  avatarUrl?: string;
  streakDays: number;
  xp: number;
  badges: Badge[];
  interests: string[];
  privacy: { showOnLeaderboard: boolean };
  followers?: string[];
  following?: string[];
}

export interface Badge {
  id: ID;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}

export interface Series {
  id: ID;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  themeColor?: string;
  coverImage?: string;
  challenges: ID[];
}

export interface Challenge {
  id: ID;
  title: string;
  seriesId?: ID;
  dayIndex?: number;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'adulting' | 'mindset' | 'social' | 'outdoors' | 'local' | 'creative' | 'collab';
  description: string;
  whyItMatters: string;
  materials?: string[];
  safetyNote?: string;
  funEnhancements?: string[];
  reflection: { questions: string[] };
  points: number;
  media?: { image?: string };
}

export interface Submission {
  id: ID;
  challengeId: ID;
  userId: ID;
  createdAt: string;
  text?: string;
  photoUrl?: string;
  reflectionAnswers?: string[];
  pointsAwarded: number;
}

export type MediaType = 'image' | 'video' | 'none';

export interface Post {
  id: ID;
  author: { id: ID; handle: string; avatar?: string; isOnline?: boolean };
  createdAt: string;
  body?: string;
  media?: { type: MediaType; url: string; thumbnailUrl?: string; aspectRatio?: number };
  taggedChallengeId?: ID;
  likes: number;
  comments: number;
  viewerHasLiked?: boolean;
  isAnonymous?: boolean;
}

export interface Comment {
  id: ID;
  postId: ID;
  author: { id: ID; handle: string; avatar?: string; isOnline?: boolean };
  body: string;
  createdAt: string;
}

export interface DMThread {
  id: ID;
  name?: string;
  participants: ID[];
  lastMessageAt: string;
  unreadCount: number;
}

export interface DMMessage {
  id: ID;
  threadId: ID;
  authorId: ID;
  body?: string;
  media?: { type: MediaType; url: string };
  createdAt: string;
}

export interface Resource {
  id: ID;
  type: 'article' | 'video';
  title: string;
  image?: string;
  publishedAt: string;
  url: string;
}

export interface ChallengeRail {
  key: string;
  title: string;
  challengeIds: ID[];
}