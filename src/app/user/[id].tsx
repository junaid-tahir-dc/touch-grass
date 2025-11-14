import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/ui/post-card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getUserProfileById, getUserProfileByUsername, getCurrentUserProfile, followUser, unfollowUser, checkIsFollowing, type UserProfile } from '@/api/user';
import { getPosts, togglePostLike, deletePost } from '@/api/posts';
import { Post } from '@/types';
import { FollowersModal } from '@/components/FollowersModal';
import { isOnlineFromLastSeen } from '@/lib/utils';
import { useUserProfiles } from '@/hooks/useUserProfiles';

export default function UserProfile() {
  const params = useLocalSearchParams<{ id: string }>();
  const userId = params.id || 'brad7';
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const { getProfileByUserId } = useUserProfiles();
  const loadUserProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Load current user profile
      const currentProfile = await getCurrentUserProfile();
      setCurrentUserProfile(currentProfile);

      // Try to load target user profile by username first, then by user_id
      let targetProfile = await getUserProfileByUsername(userId);
      if (!targetProfile) {
        targetProfile = await getUserProfileById(userId);
      }

      if (!targetProfile) {
        toast({
          title: "User not found",
          description: "This user profile doesn't exist",
          variant: "destructive"
        });
        return;
      }
      setUserProfile(targetProfile);

      // Check if current user is following this user
      if (currentProfile && targetProfile.user_id !== currentProfile.user_id) {
        const followStatus = await checkIsFollowing(targetProfile.user_id);
        setIsFollowing(followStatus);
      }

      // Load user's posts from Supabase (excluding anonymous posts)
      const allPosts = await getPosts({ sort: 'newest' });

      // Filter posts by this user and exclude anonymous posts
      const userPosts = allPosts
        .filter(post => post.user_id === targetProfile.user_id && !post.is_anonymous)
        .map(post => {
          return {
            id: post.id,
            author: {
              id: targetProfile.user_id,
              handle: targetProfile.username || targetProfile.display_name || 'User',
              avatar: targetProfile.avatar_url || '👤',
              isOnline: isOnlineFromLastSeen(targetProfile.last_seen_at)
            },
            createdAt: post.created_at,
            body: post.content,
            media: post.media_urls && post.media_urls.length > 0 ? {
              type: post.media_type as 'image' | 'video',
              url: post.media_urls[0],
              thumbnailUrl: post.media_urls[0]
            } : undefined,
            taggedChallengeId: (post as any).taggedChallengeId || (post as any).challenge_id || undefined,
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            viewerHasLiked: post.viewer_has_liked || false,
            isAnonymous: false // Already filtered out anonymous posts
          };
        });

      setPosts(userPosts);

    } catch (error) {
      console.error('Error loading user profile:', error);
      toast({
        title: "Error loading profile",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadUserProfile();
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const handleFollow = async () => {
    if (!userProfile || !currentUserProfile) return;

    try {
      if (isFollowing) {
        await unfollowUser(userProfile.user_id);
        setIsFollowing(false);
        setUserProfile(prev => prev ? {
          ...prev,
          follower_count: prev.follower_count - 1
        } : null);
        toast({
          title: `Unfollowed @${userProfile.username}`,
          description: "You will no longer see their posts in your feed"
        });
      } else {
        await followUser(userProfile.user_id);
        setIsFollowing(true);
        setUserProfile(prev => prev ? {
          ...prev,
          follower_count: prev.follower_count + 1
        } : null);
        toast({
          title: `Following @${userProfile.username}! 🎉`,
          description: "You'll now see their posts in your feed"
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        title: "Error updating follow status",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const refreshProfileCounts = async () => {
    if (!userProfile) return;

    try {
      // Reload the user profile to get updated counts
      const updatedProfile = await getUserProfileById(userProfile.user_id);
      if (updatedProfile) {
        setUserProfile(updatedProfile);
      }

      // Also check current user's following status
      if (currentUserProfile && userProfile.user_id !== currentUserProfile.user_id) {
        const followStatus = await checkIsFollowing(userProfile.user_id);
        setIsFollowing(followStatus);
      }
    } catch (error) {
      console.error('Error refreshing profile counts:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!userProfile) return;

    // Track analytics
    const { analytics } = await import('@/services/analytics');
    const post = posts.find(p => p.id === postId);
    if (post?.viewerHasLiked) {
      analytics.trackUnlike('post', postId);
    } else {
      analytics.trackLike('post', postId);
    }

    try {
      await togglePostLike(postId);
      // Refresh posts after like
      const allPosts = await getPosts({ sort: 'newest' });
      const userPosts = allPosts
        .filter(post => post.user_id === userProfile.user_id && !post.is_anonymous)
        .map(post => {
          return {
            id: post.id,
            author: {
              id: userProfile.user_id,
              handle: userProfile.username || userProfile.display_name || 'User',
              avatar: userProfile.avatar_url || '👤',
              isOnline: isOnlineFromLastSeen(userProfile.last_seen_at)
            },
            createdAt: post.created_at,
            body: post.content,
            media: post.media_urls && post.media_urls.length > 0 ? {
              type: post.media_type as 'image' | 'video',
              url: post.media_urls[0],
              thumbnailUrl: post.media_urls[0]
            } : undefined,
            taggedChallengeId: (post as any).taggedChallengeId || (post as any).challenge_id || undefined,
            likes: post.likes_count || 0,
            comments: post.comments_count || 0,
            viewerHasLiked: post.viewer_has_liked || false,
            isAnonymous: false
          };
        });
      setPosts(userPosts);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error updating like",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleComment = (postId: string) => {
    toast({
      title: "Comments coming soon! 💬",
      description: "We're working on this feature"
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Profile" showBack />
        <View className="flex items-center justify-center py-20">
          <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </View>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Profile" showBack />
        <View className="items-center justify-center py-20">
          <Text className="text-4xl mb-4">🤔</Text>
          <Text className="text-muted-foreground font-typewriter">User not found</Text>
        </View>
      </View>
    );
  }

  const isOwnProfile = currentUserProfile?.user_id === userProfile.user_id;

  return (
    <View className="flex-1 bg-background">
      <Header title={`@${userProfile.username || 'User'}`} showBack />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header */}
        <View className="p-4 border-b border-border bg-card/50">
          <View className="flex-row items-center gap-4 mb-4">
            <View className="relative">
              <SmartAvatar
                avatarUrl={userProfile.avatar_url || undefined}
                fallbackText={userProfile.username || userProfile.display_name || 'User'}
                className="h-16 w-16 text-2xl"
                size="xl"
              />
              {isOnlineFromLastSeen(userProfile.last_seen_at) && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground font-cooper">
                {userProfile.display_name || userProfile.username || 'User'}
              </Text>
              <Text className="text-muted-foreground font-typewriter">@{userProfile.username || 'user'}</Text>
              {userProfile.bio && (
                <Text className="text-sm text-muted-foreground font-typewriter mt-2">{userProfile.bio}</Text>
              )}
              <View className="flex-row gap-4 mt-2">
                <TouchableOpacity
                  onPress={() => setFollowersModalOpen(true)}
                  className="active:opacity-70"
                >
                  <Text className="text-sm text-foreground font-typewriter">
                    <Text className="font-bold">{userProfile.follower_count || 0}</Text> followers
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFollowingModalOpen(true)}
                  className="active:opacity-70"
                >
                  <Text className="text-sm text-foreground font-typewriter">
                    <Text className="font-bold">{userProfile.following_count || 0}</Text> following
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2 mb-4">
            <Badge variant="secondary">
              <Text className="text-xs font-typewriter text-white">
                Member since {new Date(userProfile.created_at).toLocaleDateString()}
              </Text>
            </Badge>
          </View>

          {/* User Interests */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-foreground font-typewriter mb-2">Interests</Text>
            <View className="flex-row flex-wrap gap-2">
              {userProfile.interests && userProfile.interests.length > 0 ? (
                userProfile.interests.map((interest, index) => (
                  <Badge key={index} variant="outline">
                    <Text className="text-xs font-typewriter">{interest}</Text>
                  </Badge>
                ))
              ) : (
                <Text className="text-muted-foreground text-sm font-typewriter">No interests added yet</Text>
              )}
            </View>
          </View>

          {!isOwnProfile && (
            <Button
              onPress={handleFollow}
              variant={isFollowing ? "outline" : "default"}
              className="w-full bg-primary"
            >
              {isFollowing ? (
                <>
                  <UserMinus size={16} className="text-foreground mr-2" />
                  <Text className="text-foreground font-typewriter">Unfollow</Text>
                </>
              ) : (
                <>
                  <UserPlus size={16} className="text-primary-foreground mr-2" />
                  <Text className="text-primary-foreground font-typewriter">Follow</Text>
                </>
              )}
            </Button>
          )}
        </View>

        {/* Posts Feed */}
        <View className="p-4 space-y-4">
          <Text className="text-lg font-semibold text-foreground font-cooper">Posts</Text>

          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post.id)}
              onComment={() => handleComment(post.id)}
            />
          ))}

          {posts.length === 0 && (
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-4">📝</Text>
              <Text className="text-muted-foreground font-typewriter mb-2 text-center">
                No posts yet
              </Text>
              <Text className="text-sm text-muted-foreground font-typewriter text-center">
                {isOwnProfile
                  ? "Share your first challenge!"
                  : `${userProfile.display_name || userProfile.username} hasn't posted anything yet`
                }
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Followers Modal */}
      <FollowersModal
        open={followersModalOpen}
        onOpenChange={setFollowersModalOpen}
        userId={userProfile.user_id}
        type="followers"
        title={`${userProfile.display_name || userProfile.username}'s Followers`}
        onCountsUpdate={refreshProfileCounts}
      />

      {/* Following Modal */}
      <FollowersModal
        open={followingModalOpen}
        onOpenChange={setFollowingModalOpen}
        userId={userProfile.user_id}
        type="following"
        title={`Following - ${userProfile.display_name || userProfile.username}`}
        onCountsUpdate={refreshProfileCounts}
      />
    </View>
  );
}