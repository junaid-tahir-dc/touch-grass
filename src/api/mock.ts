import { Challenge, Post, Resource, User, Series, Submission, Comment as PostComment } from '@/types';
import catalog from '@/data/seed';
import feed from '@/data/seed.feed';
import resources from '@/data/seed.resources';

// Simulate API latency
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

// Local storage keys
const STORAGE_KEYS = {
  USER: 'touchgrass_user',
  PROGRESS: 'touchgrass_progress',
  SUBMISSIONS: 'touchgrass_submissions'
} as const;

// Get user from localStorage or return default
export const getUser = async (): Promise<User> => {
  await delay();
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  return stored ? JSON.parse(stored) : catalog.user;
};

// Save user to localStorage
export const saveUser = async (user: User): Promise<User> => {
  await delay();
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
};

// Get today's featured challenge
export const getTodayChallenge = async (): Promise<Challenge> => {
  await delay();
  const featured = catalog.rails.find(rail => rail.key === 'featured');
  const challengeId = featured?.challengeIds[0] || catalog.challenges[0].id;
  const challenge = catalog.challenges.find(c => c.id === challengeId);
  if (!challenge) throw new Error('Challenge not found');
  return challenge;
};

// List all series
export const listSeries = async (): Promise<Series[]> => {
  await delay();
  return catalog.series;
};

// Get series by slug
export const getSeries = async (slug: string): Promise<Series | null> => {
  await delay();
  return catalog.series.find(s => s.slug === slug) || null;
};

// Get challenge by ID
export const getChallenge = async (id: string): Promise<Challenge | null> => {
  await delay();
  return catalog.challenges.find(c => c.id === id) || null;
};

// Get challenges by rail
export const getChallengesByRail = async (railKey: string): Promise<Challenge[]> => {
  await delay();
  const rail = catalog.rails.find(r => r.key === railKey);
  if (!rail) return [];
  
  return rail.challengeIds
    .map(id => catalog.challenges.find(c => c.id === id))
    .filter(Boolean) as Challenge[];
};

// Get all challenge rails
export const getChallengeRails = async () => {
  await delay();
  return catalog.rails;
};

// Search challenges
export const searchChallenges = async (query: string, filters?: {
  category?: string;
  difficulty?: string;
  maxDuration?: number;
}): Promise<Challenge[]> => {
  await delay();
  
  let results = catalog.challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(query.toLowerCase()) ||
    challenge.description.toLowerCase().includes(query.toLowerCase())
  );
  
  if (filters?.category) {
    results = results.filter(c => c.category === filters.category);
  }
  
  if (filters?.difficulty) {
    results = results.filter(c => c.difficulty === filters.difficulty);
  }
  
  if (filters?.maxDuration) {
    results = results.filter(c => c.durationMinutes <= filters.maxDuration);
  }
  
  return results;
};

// Submit proof for a challenge
export const submitProof = async (payload: {
  challengeId: string;
  text?: string;
  photoUrl?: string;
}): Promise<Submission> => {
  await delay(500);
  
  const challenge = catalog.challenges.find(c => c.id === payload.challengeId);
  if (!challenge) throw new Error('Challenge not found');
  
  const submission: Submission = {
    id: `sub_${Date.now()}`,
    challengeId: payload.challengeId,
    userId: catalog.user.id,
    createdAt: new Date().toISOString(),
    text: payload.text,
    photoUrl: payload.photoUrl,
    pointsAwarded: challenge.points
  };
  
  // Save to localStorage
  const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]');
  submissions.push(submission);
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  
  // Update user XP and streak
  const user = await getUser();
  user.xp += challenge.points;
  
  // Simple streak logic - in a real app this would be more sophisticated
  const today = new Date().toDateString();
  const lastSubmission = submissions
    .filter((s: Submission) => s.userId === user.id)
    .sort((a: Submission, b: Submission) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  
  if (!lastSubmission || new Date(lastSubmission.createdAt).toDateString() !== today) {
    user.streakDays += 1;
  }
  
  await saveUser(user);
  
  return submission;
};

// Submit reflection answers
export const submitReflection = async (payload: {
  submissionId: string;
  answers: string[];
}): Promise<Submission> => {
  await delay();
  
  const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '[]');
  const submission = submissions.find((s: Submission) => s.id === payload.submissionId);
  
  if (!submission) throw new Error('Submission not found');
  
  submission.reflectionAnswers = payload.answers;
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
  
  return submission;
};

// Get community feed
export const getFeed = async (filters?: {
  sort?: 'newest' | 'top' | 'following';
  type?: 'all' | 'images' | 'videos' | 'text';
  authorId?: string;
}): Promise<Post[]> => {
  await delay();
  
  // Get user-created posts from localStorage
  const userPosts = JSON.parse(localStorage.getItem('user_posts') || '[]');
  
  // Combine with seed data
  let posts = [...userPosts, ...feed.posts];
  
  // Filter by following if requested
  if (filters?.sort === 'following') {
    const following = await getUserFollowing();
    const currentUser = await getUser();
    
    // Include posts from followed users and current user's own posts
    posts = posts.filter(post => 
      following.includes(post.author.id) || post.author.id === currentUser.id
    );
  }
  
  // Apply type filters
  if (filters?.type && filters.type !== 'all') {
    posts = posts.filter(post => {
      if (filters.type === 'text') return !post.media;
      if (filters.type === 'images') return post.media?.type === 'image';
      if (filters.type === 'videos') return post.media?.type === 'video';
      return true;
    });
  }
  
  if (filters?.authorId) {
    posts = posts.filter(post => post.author.id === filters.authorId);
  }
  
  // Apply sorting
  if (filters?.sort === 'top') {
    posts = posts.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
  } else {
    posts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  return posts;
};

// Create new post
export const createPost = async (draft: {
  body?: string;
  media?: { type: 'image' | 'video'; url: string; thumbnailUrl?: string };
  taggedChallengeId?: string;
}): Promise<Post> => {
  await delay(500);
  
  const post: Post = {
    id: `p_${Date.now()}`,
    author: { id: catalog.user.id, handle: catalog.user.handle, avatar: catalog.user.avatarUrl },
    createdAt: new Date().toISOString(),
    body: draft.body,
    media: draft.media,
    taggedChallengeId: draft.taggedChallengeId,
    likes: 0,
    comments: 0,
    viewerHasLiked: false
  };
  
  // Store the new post in localStorage so it persists
  const storedPosts = JSON.parse(localStorage.getItem('user_posts') || '[]');
  storedPosts.unshift(post); // Add to beginning for newest first
  localStorage.setItem('user_posts', JSON.stringify(storedPosts));
  
  return post;
};

// Get resources
export const getResources = async (filters?: {
  type?: 'all' | 'article' | 'video';
  query?: string;
}): Promise<Resource[]> => {
  await delay();
  
  let results = [...resources.resources];
  
  if (filters?.type && filters.type !== 'all') {
    results = results.filter(r => r.type === filters.type);
  }
  
  if (filters?.query) {
    results = results.filter(r =>
      r.title.toLowerCase().includes(filters.query!.toLowerCase())
    );
  }
  
  return results.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};

// Get leaderboard
export const getLeaderboard = async (scope: 'global' | 'friends' = 'global'): Promise<User[]> => {
  await delay();
  
  // For now, just return mock leaderboard data
  const mockUsers: User[] = [
    { ...catalog.user, xp: 1250, streakDays: 7 },
    { id: 'u2', name: 'Alex', handle: '@adventure_alex', avatarUrl: '🚀', xp: 1100, streakDays: 5, badges: [], interests: [], privacy: { showOnLeaderboard: true } },
    { id: 'u3', name: 'Sam', handle: '@mindful_sam', avatarUrl: '🧘‍♂️', xp: 980, streakDays: 12, badges: [], interests: [], privacy: { showOnLeaderboard: true } },
    { id: 'u4', name: 'Jordan', handle: '@local_explorer', avatarUrl: '🗺️', xp: 875, streakDays: 3, badges: [], interests: [], privacy: { showOnLeaderboard: true } },
    { id: 'u5', name: 'Casey', handle: '@creative_casey', avatarUrl: '🎨', xp: 750, streakDays: 8, badges: [], interests: [], privacy: { showOnLeaderboard: true } }
  ];
  
  return mockUsers.sort((a, b) => b.xp - a.xp);
};

const simulateDelay = () => delay();
export const getBookmarks = async (filters?: { type?: string; query?: string }) => {
  await delay();
  
  // Get bookmarks from localStorage
  let bookmarks = [];
  try {
    const saved = localStorage.getItem('app_bookmarks');
    if (saved) {
      bookmarks = JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
  }
  
  // Mock data structure for display - in a real app, you'd fetch the actual items
  const mockBookmarks = bookmarks.map((bookmark: any) => ({
    id: bookmark.id,
    type: bookmark.type,
    item: {
      id: bookmark.id,
      title: bookmark.title,
      description: `Description for ${bookmark.title}`,
      summary: `Summary for ${bookmark.title}`
    },
    savedAt: bookmark.savedAt
  }));

  let filtered = mockBookmarks;

  if (filters?.type && filters.type !== 'all') {
    if (filters.type === 'challenges') {
      filtered = filtered.filter(b => b.type === 'challenge');
    } else if (filters.type === 'posts') {
      filtered = filtered.filter(b => b.type === 'post');
    } else if (filters.type === 'articles') {
      filtered = filtered.filter(b => b.type === 'article');
    } else if (filters.type === 'videos') {
      filtered = filtered.filter(b => b.type === 'video');
    }
  }

  if (filters?.query) {
    filtered = filtered.filter(b => 
      b.item.title.toLowerCase().includes(filters.query!.toLowerCase())
    );
  }

  return filtered;
};

// Edit existing post
export const editPost = async (postId: string, updates: {
  body?: string;
  media?: { type: 'image' | 'video'; url: string; thumbnailUrl?: string };
}): Promise<Post> => {
  await delay(300);
  
  // Get user posts from localStorage
  const userPosts = JSON.parse(localStorage.getItem('user_posts') || '[]');
  const postIndex = userPosts.findIndex((p: Post) => p.id === postId);
  
  if (postIndex === -1) {
    throw new Error('Post not found');
  }
  
  // Update the post
  userPosts[postIndex] = {
    ...userPosts[postIndex],
    ...updates,
    // Add an updated timestamp if you want
    updatedAt: new Date().toISOString()
  };
  
  // Save back to localStorage
  localStorage.setItem('user_posts', JSON.stringify(userPosts));
  
  return userPosts[postIndex];
};

// Follow/unfollow functionality
export const followUser = async (userId: string): Promise<void> => {
  await delay(300);
  
  const currentUser = await getUser();
  
  // Get current following list from localStorage
  const following = JSON.parse(localStorage.getItem('user_following') || '[]');
  
  // Add to following if not already following
  if (!following.includes(userId)) {
    following.push(userId);
    localStorage.setItem('user_following', JSON.stringify(following));
  }
  
  console.log(`Following user ${userId}. Now following:`, following);
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await delay(300);
  
  // Get current following list from localStorage
  const following = JSON.parse(localStorage.getItem('user_following') || '[]');
  
  // Remove from following
  const updatedFollowing = following.filter((id: string) => id !== userId);
  localStorage.setItem('user_following', JSON.stringify(updatedFollowing));
  
  console.log(`Unfollowed user ${userId}. Now following:`, updatedFollowing);
};

// Get current user's following list
export const getUserFollowing = async (): Promise<string[]> => {
  await delay(100);
  return JSON.parse(localStorage.getItem('user_following') || '[]');
};

export const getComments = async (postId: string): Promise<PostComment[]> => {
  await delay(300);
  
  // Get comments from localStorage
  const allComments = JSON.parse(localStorage.getItem('post_comments') || '[]');
  const postComments = allComments.filter((comment: PostComment) => comment.postId === postId);
  
  // Sort by creation date (newest first)
  return postComments.sort((a: PostComment, b: PostComment) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const createComment = async (data: {
  postId: string;
  body: string;
}): Promise<PostComment> => {
  await delay(300);
  
  const user = await getUser();
  
  const comment: PostComment = {
    id: `comment_${Date.now()}`,
    postId: data.postId,
    author: { 
      id: user.id, 
      handle: user.handle, 
      avatar: user.avatarUrl 
    },
    body: data.body,
    createdAt: new Date().toISOString()
  };
  
  // Save to localStorage
  const allComments = JSON.parse(localStorage.getItem('post_comments') || '[]');
  allComments.push(comment);
  localStorage.setItem('post_comments', JSON.stringify(allComments));
  
  // Update post comment count
  const userPosts = JSON.parse(localStorage.getItem('user_posts') || '[]');
  const postIndex = userPosts.findIndex((p: Post) => p.id === data.postId);
  if (postIndex !== -1) {
    userPosts[postIndex].comments += 1;
    localStorage.setItem('user_posts', JSON.stringify(userPosts));
  }
  
  return comment;
};

// Delete post
export const deletePost = async (postId: string): Promise<void> => {
  await delay(300);
  
  // Get user posts from localStorage
  const userPosts = JSON.parse(localStorage.getItem('user_posts') || '[]');
  const filteredPosts = userPosts.filter((p: Post) => p.id !== postId);
  
  if (filteredPosts.length === userPosts.length) {
    throw new Error('Post not found');
  }
  
  // Save back to localStorage
  localStorage.setItem('user_posts', JSON.stringify(filteredPosts));
};