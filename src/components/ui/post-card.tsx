import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image,
  Alert 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal, Bookmark, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Post } from '@/types';
import { ChallengeItem } from '@/api/challenges';
import { formatDistanceToNow } from 'date-fns';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { getChallengeById } from '@/api/challenges';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CommentsModal } from '@/components/CommentsModal';
import { ImageModal } from '@/components/ui/image-modal';
import { useAuth } from '@/contexts/AuthContext';

interface PostCardProps {
  post: Post;
  onLike?: () => void;
  onComment?: () => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
  onCommentCountUpdate?: (postId: string, newCount: number) => void;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onEdit,
  onDelete,
  onCommentCountUpdate,
  className
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [dropdownOpen, setDropdownOpen] = useState(false);


  useEffect(() => {
    if (post.taggedChallengeId) {
      const loadChallenge = async () => {
        try {
          const challengeData = await getChallengeById(post.taggedChallengeId!);
          setChallenge(challengeData);
        } catch (error) {
          console.error('Error loading challenge:', error);
        }
      };
      loadChallenge();
    }
  }, [post.taggedChallengeId]);

  const handleBookmark = () => {
    const raw = (post.body || '').trim();
    let title = 'Community post';
    if (raw.length > 0) {
      title = raw.length > 50 ? raw.slice(0, 50) + '…' : raw;
    } else if (post.media?.type === 'image') {
      title = 'Image post';
    } else if (post.media?.type === 'video') {
      title = 'Video post';
    }
    
    // Track analytics
    const bookmarked = isBookmarked(post.id);
    import('@/services/analytics').then(({ analytics }) => {
      if (bookmarked) {
        analytics.trackUnbookmark('post', post.id);
      } else {
        analytics.trackBookmark('post', post.id);
      }
    });
    
    toggleBookmark({
      id: post.id,
      type: 'post',
      title
    });
  };

  const handleCommentClick = () => {
    setShowComments(true);
    onComment?.();
  };

  const handleCommentAdded = () => {
    const newCount = commentCount + 1;
    setCommentCount(newCount);
    onCommentCountUpdate?.(post.id, newCount);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => onDelete?.(post.id)
        }
      ]
    );
  };

  const isOwnPost = user && post.author.id === user.id;
  const challengeTitleFromBody = (() => {
    if (!post.body) return null as string | null;
    const match = post.body.match(/📋\s*Challenge:\s*([^\n]+)/);
    return match ? match[1].trim() : null;
  })();

  return (
    <View className={cn("bg-card rounded-2xl p-4 border border-border", className)}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-3">
          {post.isAnonymous ? (
            <>
              <View className="w-8 h-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center">
                <Text className="text-black text-sm font-semibold font-typewriter">?</Text>
              </View>
              <View>
                <Text className="font-medium text-sm text-muted-foreground font-typewriter">
                  Anonymous User
                </Text>
                <Text className="text-xs text-muted-foreground font-typewriter">{timeAgo}</Text>
              </View>
            </>
          ) : (
            <>
              <View className="relative">
                <TouchableOpacity 
                  onPress={() => router.navigate(`/user/${post.author.id}`)}
                  className="w-8 h-8 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center overflow-hidden"
                >
                  {post.author.avatar && post.author.avatar.startsWith('http') ? (
                    <Image 
                      source={{ uri: post.author.avatar }} 
                      alt="Profile" 
                      className="w-full h-full rounded-full"
                    />
                  ) : post.author.avatar ? (
                    <Text className="font-bold text-sm text-white font-typewriter">
                      {post.author.avatar}
                    </Text>
                  ) : (
                    <Text className="font-bold text-sm text-white font-typewriter">
                      {post.author.handle.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </TouchableOpacity>
                {post.author.isOnline && (
                  <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background"></View>
                )}
              </View>
              <View>
                <TouchableOpacity 
                  onPress={() => router.navigate(`/user/${post.author.id}`)}
                >
                  <Text className="font-medium text-sm text-foreground font-typewriter">
                    {post.author.handle}
                  </Text>
                </TouchableOpacity>
                <Text className="text-xs text-muted-foreground font-typewriter">{timeAgo}</Text>
              </View>
            </>
          )}
        </View>
        
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
  <DropdownMenuTrigger>
    <View className="p-1 active:bg-muted rounded-lg">
      <MoreHorizontal size={16} className="text-muted-foreground" />
    </View>
  </DropdownMenuTrigger>
  
  <DropdownMenuContent align="end">
    {isOwnPost && (
      <>
        <DropdownMenuItem onPress={() => {
          setDropdownOpen(false);
          onEdit?.(post);
        }}>
          <Edit size={16} className="text-foreground mr-2" />
          <Text className="text-foreground font-typewriter">Edit Post</Text>
        </DropdownMenuItem>
        <DropdownMenuItem onPress={() => {
          setDropdownOpen(false);
          handleDelete();
        }}>
          <Trash2 size={16} className="text-destructive mr-2" />
          <Text className="text-destructive font-typewriter">Delete Post</Text>
        </DropdownMenuItem>
      </>
    )}
    {!isOwnPost && (
      <DropdownMenuItem onPress={() => {
        setDropdownOpen(false);
        handleBookmark();
      }}>
        <Bookmark 
          size={16} 
          className={isBookmarked(post.id) ? 'text-primary mr-2' : 'text-foreground mr-2'} 
        />
        <Text className="text-foreground font-typewriter">
          {isBookmarked(post.id) ? 'Remove Bookmark' : 'Bookmark Post'}
        </Text>
      </DropdownMenuItem>
    )}
  </DropdownMenuContent>
</DropdownMenu>
      </View>

      {/* Content */}
      {post.body && (
        <Text className="text-sm mb-3 text-foreground font-typewriter leading-5">
          {post.body.replace(/\n*📋\s*Challenge:\s*[^\n]+\n*/g, '').trim()}
        </Text>
      )}

      {/* Media */}
      {post.media && (
        <View className="mb-3 rounded-xl overflow-hidden h-64 bg-muted items-center justify-center">
          {post.media.type === 'image' && (
            <TouchableOpacity
            onPress={() => setShowImageModal(true)}
            className="w-full h-64 items-center justify-center active:opacity-80"
          >
            <Image
              source={{ uri: post.media.url }}
              alt={`Community post image for ${post.author.handle}`}
              className="w-full h-full"
              resizeMode="contain"
            />
          </TouchableOpacity>
          )}
          {post.media.type === 'video' && (
            <Text className="text-muted-foreground font-typewriter">
              Video playback not supported in this view
            </Text>
          )}
        </View>
      )}

      {/* Tagged Challenge */}
      {(post.taggedChallengeId && challenge) || challengeTitleFromBody ? (
        <View className="mb-3 p-2 bg-primary/5 rounded-lg border-2 border-primary/30">
          {post.taggedChallengeId && challenge ? (
            <TouchableOpacity
              onPress={() => router.navigate(`/challenge/${post.taggedChallengeId}`)}
              className="flex-row items-center gap-2"
            >
              <Text className="text-sm text-muted-foreground font-typewriter">Challenge:</Text>
              <Text className="text-sm font-medium text-foreground font-typewriter">{challenge.title}</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-muted-foreground font-typewriter">Challenge:</Text>
              <Text className="text-sm font-medium text-foreground font-typewriter">{challengeTitleFromBody}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Actions */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity 
            onPress={onLike}
            className={cn(
              "flex-row items-center gap-1 p-2 rounded-lg",
              post.viewerHasLiked 
                ? "bg-destructive/10" 
                : "active:bg-muted/50"
            )}
          >
            <Heart 
              size={16} 
              className={post.viewerHasLiked ? "text-destructive" : "text-muted-foreground"}
            />
            <Text className={cn(
              "text-xs font-medium font-typewriter",
              post.viewerHasLiked ? "text-destructive" : "text-muted-foreground"
            )}>
              {post.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={handleCommentClick}
            className="flex-row items-center gap-1 p-2 rounded-lg active:bg-muted/50"
          >
            <MessageCircle size={16} className="text-muted-foreground" />
            <Text className="text-xs font-medium text-muted-foreground font-typewriter">{commentCount}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={handleBookmark}
          className={cn(
            "flex-row items-center gap-1 p-2 rounded-lg",
            isBookmarked(post.id)
              ? "bg-primary/10" 
              : "active:bg-muted/50"
          )}
        >
          <Bookmark 
            size={16} 
            className={isBookmarked(post.id) ? "text-primary" : "text-muted-foreground"} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Comments Modal */}
      <CommentsModal 
        open={showComments}
        onOpenChange={setShowComments}
        post={post}
        onCommentAdded={handleCommentAdded}
      />

      {/* Image Modal */}
      {post.media && post.media.type === 'image' && (
        <ImageModal
          open={showImageModal}
          onOpenChange={setShowImageModal}
          imageUrl={post.media.url}
          imageAlt={`Community post image for ${post.author.handle}`}
        />
      )}
    </View>
  );
};