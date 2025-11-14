import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Plus, Filter, Search, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/ui/post-card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Post as SupabasePost, getPosts, deletePost, togglePostLike } from '@/api/posts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PostComposer } from '@/components/PostComposer';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { isOnlineFromLastSeen } from '@/lib/utils';
import { UserSearchModal } from '@/components/UserSearchModal';
import tailwindConfig from 'tailwind.config';

const sortOptions = [
  { key: 'newest', label: 'Newest' },
  { key: 'top', label: 'Top (24h)' },
  { key: 'following', label: 'Following' }
];

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'images', label: 'Images' },
  { key: 'videos', label: 'Videos' },
  { key: 'text', label: 'Text' }
];

const transformPostForUI = (post: SupabasePost & { user_profiles?: any }, getUserProfile?: (userId: string) => any): any => {
  const profile = getUserProfile && post.user_id ? getUserProfile(post.user_id) : post.user_profiles;

  return {
    id: post.id,
    author: {
      id: post.user_id || 'unknown',
      handle: profile?.username ||
        profile?.display_name ||
        `User${post.user_id?.slice(-4) || 'unknown'}`,
      avatar: profile?.avatar_url || '👤',
      isOnline: isOnlineFromLastSeen(profile?.last_seen_at)
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
    isAnonymous: post.is_anonymous || false
  };
};

interface RouteParams {
  highlightPost?: string;
}

export default function Community() {
  const navigation = useNavigation();
  const route = useRoute();
  const [posts, setPosts] = useState<SupabasePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSort, setSelectedSort] = useState('newest');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [lastInteractedPostId, setLastInteractedPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<{ id: string; isChallengePost: boolean } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const postRefs = useRef<{ [key: string]: View | null }>({});
  const loadRequestIdRef = useRef(0);
  const pendingLikesRef = useRef<Set<string>>(new Set());

  const { getProfileByUserId } = useUserProfiles();

  // Handle highlighted post from route params
  useEffect(() => {
    const params = route.params as RouteParams;
    const highlightPost = params?.highlightPost;

    if (highlightPost && posts.length > 0) {
      const postExists = posts.some(post => post.id === highlightPost);

      if (!postExists) {
        toast({
          title: "Post not found",
          description: "The bookmarked post is no longer available",
          variant: "destructive"
        });
        return;
      }

      setHighlightedPostId(highlightPost);

      const scrollToPost = () => {
        setTimeout(() => {
          toast({
            title: "Found your bookmarked post! 📌",
            description: "The highlighted post is from your bookmarks"
          });
        }, 100);

        setTimeout(() => {
          setHighlightedPostId(null);
        }, 3000);
      };

      setTimeout(scrollToPost, 500);
    }
  }, [route.params, posts]);

  const setPostRef = (postId: string) => (ref: View | null) => {
    postRefs.current[postId] = ref;
  };

  useEffect(() => {
    loadPosts();
  }, [selectedSort, selectedFilter]);

  // Set up real-time subscriptions
  useEffect(() => {
    const postsChannel = supabase
      .channel('posts-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          console.log('Posts change detected:', payload);
          try {
            const postId = (payload as any)?.new?.id || (payload as any)?.old?.id;
            if (postId && pendingLikesRef.current.has(postId)) {
              return;
            }
          } catch (e) {
            console.warn('Post change handler parse error:', e);
          }
          loadPosts();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes' },
        (payload: any) => {
          console.log('Post likes change detected:', payload);
          try {
            const postId = payload?.new?.post_id || payload?.old?.post_id;

            if (!postId) {
              loadPosts();
              return;
            }

            if (pendingLikesRef.current.has(postId)) return;

            loadPosts();
          } catch (e) {
            console.error('Error handling post_likes realtime:', e);
            loadPosts();
          }
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        (payload) => {
          console.log('Comment inserted:', payload);
          setTimeout(() => loadPosts(), 500);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'comments' },
        (payload) => {
          console.log('Comment deleted:', payload);
          setTimeout(() => loadPosts(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [selectedSort, selectedFilter]);

  const loadPosts = async () => {
    try {
      const isPreserveScroll = lastInteractedPostId !== null;
      if (!isPreserveScroll) {
        setLoading(true);
      }

      console.log('Loading posts with filters:', { selectedSort, selectedFilter, isPreserveScroll });
      const requestId = ++loadRequestIdRef.current;

      const feedData = await getPosts({
        sort: selectedSort as any,
        type: selectedFilter as any
      });

      console.log('Received feed data:', feedData);
      if (requestId === loadRequestIdRef.current) {
        setPosts(feedData);
      } else {
        console.log('Discarding stale feed response', { requestId, current: loadRequestIdRef.current });
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: "Error loading feed",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (postId: string) => {
    if (pendingLikesRef.current.has(postId)) return;
    pendingLikesRef.current.add(postId);

    const { analytics } = await import('@/services/analytics');
    const post = posts.find(p => p.id === postId);
    if (post?.viewer_has_liked) {
      analytics.trackUnlike('post', postId);
    } else {
      analytics.trackLike('post', postId);
    }

    setLastInteractedPostId(postId);

    try {
      await togglePostLike(postId);
      await loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error updating like",
        description: "Please try again",
        variant: "destructive"
      });
      setLastInteractedPostId(null);
    } finally {
      pendingLikesRef.current.delete(postId);
    }
  };

  const handleComment = (postId: string) => {
    setLastInteractedPostId(postId);
  };

  const handleEdit = (post: any) => {
    setEditingPost(post);
    setShowComposer(true);
  };

  const handleDelete = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const isChallengePost = !!(post as any)?.challenge_id;

    setPostToDelete({ id: postId, isChallengePost });
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;

    try {
      await deletePost(postToDelete.id);

      toast({
        title: "Post deleted! 🗑️",
        description: postToDelete.isChallengePost
          ? "Your post and challenge completion have been removed"
          : "Your post has been removed"
      });

      setPostToDelete(null);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error deleting post",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleCommentCountUpdate = (postId: string, newCount: number) => {
    setPosts(posts.map(post =>
      post.id === postId
        ? { ...post, comments_count: newCount }
        : post
    ));
  };

  if (loading) {
    const primaryColor = tailwindConfig?.theme?.extend?.colors?.primary.DEFAULT;
    return (
      <View className="flex-1 bg-gradient-to-b from-background to-muted/20">
        <StatusBar barStyle="dark-content" />
        <Header title="Community" />
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-background to-muted/20">
      <StatusBar barStyle="dark-content" />

      <View className="flex-1">
        <Header title="Community" />

        {/* Compact Header with Controls */}
        <View className="px-4 py-3 border-b border-border bg-background/95">
          <View className="flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Title and Search */}
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-foreground">Community Feed</Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowUserSearch(true)}
                className="lg:hidden"
              >
                <Search size={16} className="mr-2 text-foreground" />
                <Text className="text-foreground text-sm font-medium">Find Users</Text>
              </Button>
            </View>

            {/* Desktop Search - Hidden on mobile */}
            <View className="hidden lg:flex">
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowUserSearch(true)}
              >
                <Search size={16} className="mr-2 text-foreground" />
                <Text className="text-foreground text-sm font-medium">Find Users</Text>
              </Button>
            </View>
          </View>

          {/* Compact Sort and Filter Controls */}
          <View className="mt-3 flex-row items-center gap-2 flex-wrap">
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-medium text-muted-foreground">Sort:</Text>
              <View className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TouchableOpacity className="flex-row items-center h-8 px-3 border border-border rounded-md bg-background gap-1.5">
                      <ArrowUpDown size={14} className="text-muted-foreground" />
                      <Text className="text-sm font-medium text-foreground">
                        {sortOptions.find(option => option.key === selectedSort)?.label}
                      </Text>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </TouchableOpacity>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40 bg-popover border-border">
                    {sortOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.key}
                        onPress={() => {
                          setSelectedSort(option.key);
                          // The dropdown will close automatically due to the backdrop press
                        }}
                        className={selectedSort === option.key ? "bg-accent" : ""}
                      >
                        <Text className={`text-sm ${selectedSort === option.key ? "text-accent-foreground" : "text-popover-foreground"}`}>
                          {option.label}
                        </Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </View>

            {/* Filter Dropdown */}
            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-medium text-muted-foreground">Filter:</Text>
              <View className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <TouchableOpacity className="flex-row items-center h-8 px-3 border border-border rounded-md bg-background gap-1.5">
                      <Filter size={14} className="text-muted-foreground" />
                      <Text className="text-sm font-medium text-foreground">
                        {filterOptions.find(option => option.key === selectedFilter)?.label}
                      </Text>
                      <ChevronDown size={14} className="text-muted-foreground" />
                    </TouchableOpacity>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-36 bg-popover border-border">
                    {filterOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.key}
                        onPress={() => {
                          setSelectedFilter(option.key);
                          // The dropdown will close automatically due to the backdrop press
                        }}
                        className={selectedFilter === option.key ? "bg-accent" : ""}
                      >
                        <Text className={`text-sm ${selectedFilter === option.key ? "text-accent-foreground" : "text-popover-foreground"}`}>
                          {option.label}
                        </Text>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </View>
            </View>
          </View>
        </View>

        {/* Feed */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="p-3 space-y-3">
            {posts.map((post) => {
              const uiPost = transformPostForUI(post, getProfileByUserId);
              return (
                <View
                  key={post.id}
                  ref={setPostRef(post.id)}
                  className={`rounded-lg ${highlightedPostId === post.id
                    ? 'border-2 border-primary shadow-lg bg-primary/5'
                    : 'bg-background'
                    }`}
                >
                  <PostCard
                    post={uiPost}
                    onLike={() => handleLike(post.id)}
                    onComment={() => handleComment(post.id)}
                    onEdit={() => handleEdit(uiPost)}
                    onDelete={() => handleDelete(post.id)}
                    onCommentCountUpdate={handleCommentCountUpdate}
                  />
                </View>
              );
            })}

            {posts.length === 0 && (
              <View className="items-center justify-center py-16">
                <Text className="text-4xl mb-4">🌱</Text>
                <Text className="text-muted-foreground mb-2 text-base font-medium">No posts yet</Text>
                <Text className="text-muted-foreground text-sm text-center">
                  Be the first to share your challenge!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Action Button - Add Post */}
        <TouchableOpacity
          className="absolute bottom-6 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 items-center justify-center"
          onPress={() => setShowComposer(true)}
          activeOpacity={0.8}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>

        {/* Post Composer Modal */}
        <Modal
          visible={showComposer}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => {
            setShowComposer(false);
            setEditingPost(null);
          }}
        >
          <PostComposer
            open={showComposer}
            onOpenChange={setShowComposer}
            editingPost={editingPost}
            onPostCreated={() => {
              loadPosts();
              setShowComposer(false);
              setEditingPost(null);
            }}
          />
        </Modal>

        {/* User Search Modal */}
        <UserSearchModal
          open={showUserSearch}
          onOpenChange={setShowUserSearch}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!postToDelete} onOpenChange={(open) => !open && setPostToDelete(null)}>
          <AlertDialogContent className="bg-background border-border rounded-lg p-6 m-4 max-w-sm mx-auto">
            <AlertDialogHeader className="mb-4">
              <AlertDialogTitle className="text-lg font-semibold text-foreground">
                Delete Post?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground text-sm leading-6">
                {postToDelete?.isChallengePost ? (
                  <>
                    <Text className="text-destructive font-semibold">Warning:</Text>
                    <Text> This is a challenge completion post. Deleting it will remove your challenge completion record and deduct the points you earned from your total XP.</Text>
                    <Text className="mt-2 font-medium">This action cannot be undone.</Text>
                  </>
                ) : (
                  "This action cannot be undone. Your post will be permanently removed from the community."
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-end gap-3">
              <AlertDialogCancel
                onPress={() => setPostToDelete(null)}
                className="px-4 py-2 rounded-lg border border-border"
              >
                <Text className="text-foreground font-medium">Cancel</Text>
              </AlertDialogCancel>
              <AlertDialogAction
                onPress={confirmDelete}
                className="bg-destructive px-4 py-2 rounded-lg"
              >
                <Text className="text-destructive-foreground font-medium">Delete Post</Text>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </View>
    </SafeAreaView>
  );
}