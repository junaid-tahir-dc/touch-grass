import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { ImageModal } from '@/components/ui/image-modal';
import { Send, ImagePlus, X, Heart, MoreHorizontal, Edit, Trash2, MessageCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getComments, createComment, likeComment, unlikeComment, getCommentLikes, updateComment, deleteComment, Comment as ApiComment } from '@/api/comments';
import { Post } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface CommentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  onCommentAdded?: () => void;
}

export function CommentsModal({ open, onOpenChange, post, onCommentAdded }: CommentsModalProps) {
  const [comments, setComments] = useState<ApiComment[]>([]);
  const sortedComments = useMemo(() => {
    return [...comments].reverse();
  }, [comments]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; alt: string } | null>(null);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const processingLikeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, post.id]);

  const loadComments = useCallback(async () => {
    try {
      setLoading(true);
      const [commentsData, { data: { user } }] = await Promise.all([
        getComments(post.id),
        supabase.auth.getUser()
      ]);

      setComments(commentsData);

      if (commentsData.length > 0 && user) {
        const commentIds = commentsData.map(c => c.id);
        const likes = await getCommentLikes(commentIds);
        setLikedComments(likes);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error loading comments",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() && !selectedImage) {
      toast({
        title: "Please add content",
        description: "Comments cannot be empty",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      // For React Native, we'd need to implement image upload
      // This is simplified for now
      if (selectedImage) {
        mediaUrl = selectedImage;
        mediaType = 'image';
      }

      const tempComment: ApiComment = {
        id: `temp-${Date.now()}`,
        post_id: post.id,
        user_id: currentUserId!,
        content: newComment.trim() || '',
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        likes_count: 0,
        replies_count: 0,
        parent_comment_id: null
      };

      setComments(prev => [...prev, tempComment]);
      setNewComment('');
      setSelectedImage(null);

      const comment = await createComment(
        post.id,
        tempComment.content,
        mediaUrl,
        mediaType
      );

      setComments(prev => prev.map(c =>
        c.id === tempComment.id ? comment : c
      ));

      onCommentAdded?.();

      toast({
        title: "Comment posted! 💬"
      });

    } catch (error) {
      console.error('Error creating comment:', error);
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')));
      toast({
        title: "Error posting comment",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  }, [newComment, selectedImage, post.id, currentUserId, onCommentAdded]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (processingLikeRef.current.has(commentId)) return;
    processingLikeRef.current.add(commentId);

    const isLiked = likedComments[commentId];

    setLikedComments(prev => ({ ...prev, [commentId]: !isLiked }));
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, likes_count: isLiked ? Math.max(0, (c.likes_count || 0) - 1) : (c.likes_count || 0) + 1 }
        : c
    ));

    try {
      if (isLiked) {
        await unlikeComment(commentId);
      } else {
        await likeComment(commentId);
      }
    } catch (error) {
      setLikedComments(prev => ({ ...prev, [commentId]: isLiked }));
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, likes_count: isLiked ? (c.likes_count || 0) + 1 : Math.max(0, (c.likes_count || 0) - 1) }
          : c
      ));
      console.error('Error liking comment:', error);
      toast({
        title: "Error",
        description: "Could not update like",
        variant: "destructive"
      });
    } finally {
      processingLikeRef.current.delete(commentId);
    }
  }, [likedComments]);

  const handleEditComment = (comment: ApiComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editingContent.trim()) {
      toast({
        title: "Comment cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateComment(commentId, editingContent.trim());
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, content: editingContent.trim() }
          : c
      ));
      setEditingCommentId(null);
      setEditingContent('');
      toast({
        title: "Comment updated! ✏️"
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error updating comment",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(commentId);
              setComments(prev => prev.filter(c => c.id !== commentId));
              toast({
                title: "Comment deleted! 🗑️"
              });
            } catch (error) {
              console.error('Error deleting comment:', error);
              toast({
                title: "Error deleting comment",
                description: "Please try again",
                variant: "destructive"
              });
            }
          }
        }
      ]
    );
  };

  const handleReplyToComment = (commentId: string) => {
    setReplyingToCommentId(commentId);
    setReplyContent('');
  };

  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setReplyContent('');
  };

  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    if (!replyContent.trim()) {
      toast({
        title: "Reply cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const tempReply: ApiComment = {
        id: `temp-${Date.now()}`,
        post_id: post.id,
        user_id: currentUserId!,
        content: replyContent.trim(),
        created_at: new Date().toISOString(),
        likes_count: 0,
        replies_count: 0,
        parent_comment_id: parentCommentId
      };

      setComments(prev => [...prev, tempReply]);
      setReplyContent('');
      setReplyingToCommentId(null);

      const reply = await createComment(
        post.id,
        tempReply.content,
        undefined,
        undefined,
        parentCommentId
      );

      setComments(prev => prev.map(c =>
        c.id === tempReply.id ? reply : c
      ));

      toast({
        title: "Reply posted! 💬"
      });
    } catch (error) {
      setComments(prev => prev.filter(c => !c.id.startsWith('temp-')));
      console.error('Error posting reply:', error);
      toast({
        title: "Error posting reply",
        description: "Please try again",
        variant: "destructive"
      });
    }
  }, [replyContent, post.id, currentUserId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex-1 max-w-full max-h-full" hideCloseButton={true}>
        <DialogHeader>
          <DialogTitle className="text-foreground font-cooper">Comments</DialogTitle>
        </DialogHeader>

        <TouchableOpacity
          className="absolute top-4 right-4 p-2 active:bg-muted rounded-lg"
          onPress={() => onOpenChange(false)}
        >
          <X size={16} className="text-muted-foreground" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          {/* Comment Input */}
          <View className="border-b border-border pb-4 space-y-3">
            {selectedImage && (
              <View className="relative">
                <Image
                  source={{ uri: selectedImage }}
                  alt="Preview"
                  className="w-40 h-40 rounded-lg"
                />
                <TouchableOpacity
                  className="absolute top-2 right-2 bg-destructive rounded-full p-1"
                  onPress={() => setSelectedImage(null)}
                >
                  <X size={16} className="text-white" />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              placeholder="Write a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              className="min-h-20 bg-card border border-input rounded-lg p-3 text-foreground font-typewriter"
              placeholderTextColor="hsl(215 20% 30%)"
              maxLength={500}
            />

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => {/* Implement image picker */ }}
                  disabled={submitting || !!selectedImage}
                >
                  <ImagePlus size={16} className="text-foreground mr-2" />
                  <Text className="text-foreground font-typewriter">Add Image</Text>
                </Button>
                <Text className="text-xs text-muted-foreground font-typewriter">
                  {newComment.length}/500
                </Text>
              </View>
              <Button
                onPress={handleSubmitComment}
                disabled={submitting || (!newComment.trim() && !selectedImage)}
                size="sm"
              >
                {submitting ? (
                  <Text className="text-primary-foreground font-typewriter">Posting...</Text>
                ) : (
                  <>
                    <Send size={14} className="text-primary-foreground mr-2" />
                    <Text className="text-primary-foreground font-typewriter">Post</Text>
                  </>
                )}
              </Button>
            </View>
          </View>

          {/* Comments List */}
          <ScrollView ref={scrollViewRef} className="flex-1 py-2">
            {loading ? (
              <View className="flex justify-center py-8">
                <View className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </View>
            ) : comments.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-2xl mb-2">💬</Text>
                <Text className="text-muted-foreground font-typewriter text-center">No comments yet</Text>
                <Text className="text-sm text-muted-foreground font-typewriter text-center">Be the first to comment!</Text>
              </View>
            ) : (
              <View className="space-y-4">
                {sortedComments.map((comment) => {
                  if (comment.parent_comment_id) return null;

                  const profile = comment.user_profiles;
                  const displayName = profile?.username || profile?.display_name || 'User';
                  const isOwnComment = currentUserId === comment.user_id;
                  const isEditing = editingCommentId === comment.id;
                  const isReplying = replyingToCommentId === comment.id;
                  const replies = comments.filter(c => c.parent_comment_id === comment.id);

                  return (
                    <View key={comment.id} className="space-y-2">
                      <View className="flex-row gap-3">
                        <SmartAvatar
                          avatarUrl={profile?.avatar_url}
                          fallbackText={displayName}
                          size="sm"
                        />
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 mb-1">
                            <Text className="font-medium text-sm text-foreground font-typewriter">{displayName}</Text>
                            <Text className="text-xs text-muted-foreground font-typewriter">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </Text>
                            {isOwnComment && !isEditing && (
                              <DropdownMenu>
                                <DropdownMenuTrigger>
                                  <TouchableOpacity className="p-1 active:bg-muted rounded-lg ml-auto">
                                    <MoreHorizontal size={14} className="text-muted-foreground" />
                                  </TouchableOpacity>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onPress={() => handleEditComment(comment)}>
                                    <Edit size={14} className="text-foreground mr-2" />
                                    <Text className="text-foreground font-typewriter">Edit</Text>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onPress={() => handleDeleteComment(comment.id)}>
                                    <Trash2 size={14} className="text-destructive mr-2" />
                                    <Text className="text-destructive font-typewriter">Delete</Text>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </View>

                          {isEditing ? (
                            <View className="space-y-2">
                              <TextInput
                                value={editingContent}
                                onChangeText={setEditingContent}
                                multiline
                                className="min-h-20 bg-card border border-input rounded-lg p-3 text-foreground font-typewriter"
                                maxLength={500}
                              />
                              <View className="flex-row gap-2">
                                <Button
                                  size="sm"
                                  onPress={() => handleSaveEdit(comment.id)}
                                >
                                  <Text className="text-primary-foreground font-typewriter">Save</Text>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onPress={handleCancelEdit}
                                >
                                  <Text className="text-foreground font-typewriter">Cancel</Text>
                                </Button>
                              </View>
                            </View>
                          ) : (
                            <>
                              {comment.content && (
                                <Text className="text-sm text-foreground font-typewriter leading-5 mb-2">{comment.content}</Text>
                              )}
                              {comment.media_url && comment.media_type === 'image' && (
                                <TouchableOpacity
                                  onPress={() => setEnlargedImage({ url: comment.media_url!, alt: 'Comment attachment' })}
                                >
                                  <Image
                                    source={{ uri: comment.media_url }}
                                    alt="Comment attachment"
                                    className="w-40 h-40 rounded-lg mt-2"
                                  />
                                </TouchableOpacity>
                              )}
                              <View className="flex-row items-center gap-2 mt-2">
                                <TouchableOpacity
                                  className="flex-row items-center gap-1 p-2 active:bg-muted rounded-lg"
                                  onPress={() => handleLikeComment(comment.id)}
                                >
                                  <Heart
                                    size={14}
                                    className={likedComments[comment.id] ? "text-destructive" : "text-muted-foreground"}
                                  />
                                  {comment.likes_count ? (
                                    <Text className="text-xs text-muted-foreground font-typewriter">{comment.likes_count}</Text>
                                  ) : null}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  className="flex-row items-center gap-1 p-2 active:bg-muted rounded-lg"
                                  onPress={() => handleReplyToComment(comment.id)}
                                >
                                  <MessageCircle size={14} className="text-muted-foreground" />
                                  {comment.replies_count ? (
                                    <Text className="text-xs text-muted-foreground font-typewriter">{comment.replies_count}</Text>
                                  ) : null}
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Reply Input */}
                      {isReplying && (
                        <View className="ml-11 mt-2 space-y-2">
                          <TextInput
                            value={replyContent}
                            onChangeText={setReplyContent}
                            placeholder="Write a reply..."
                            multiline
                            className="min-h-20 bg-card border border-input rounded-lg p-3 text-foreground font-typewriter"
                            maxLength={500}
                          />
                          <View className="flex-row gap-2">
                            <Button
                              size="sm"
                              onPress={() => handleSubmitReply(comment.id)}
                            >
                              <Send size={14} className="text-primary-foreground mr-2" />
                              <Text className="text-primary-foreground font-typewriter">Reply</Text>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={handleCancelReply}
                            >
                              <Text className="text-foreground font-typewriter">Cancel</Text>
                            </Button>
                          </View>
                        </View>
                      )}

                      {/* Replies */}
                      {replies.length > 0 && (
                        <View className="ml-11 space-y-3 mt-3 border-l-2 border-border pl-3">
                          {replies.map((reply) => {
                            const replyProfile = reply.user_profiles;
                            const replyDisplayName = replyProfile?.username || replyProfile?.display_name || 'User';
                            const isOwnReply = currentUserId === reply.user_id;
                            const isEditingReply = editingCommentId === reply.id;

                            return (
                              <View key={reply.id} className="flex-row gap-3">
                                <SmartAvatar
                                  avatarUrl={replyProfile?.avatar_url}
                                  fallbackText={replyDisplayName}
                                  size="sm"
                                />
                                <View className="flex-1">
                                  <View className="flex-row items-center gap-2 mb-1">
                                    <Text className="font-medium text-sm text-foreground font-typewriter">{replyDisplayName}</Text>
                                    <Text className="text-xs text-muted-foreground font-typewriter">
                                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                                    </Text>
                                    {isOwnReply && !isEditingReply && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger>
                                          <TouchableOpacity className="p-1 active:bg-muted rounded-lg ml-auto">
                                            <MoreHorizontal size={14} className="text-muted-foreground" />
                                          </TouchableOpacity>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onPress={() => handleEditComment(reply)}>
                                            <Edit size={14} className="text-foreground mr-2" />
                                            <Text className="text-foreground font-typewriter">Edit</Text>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onPress={() => handleDeleteComment(reply.id)}>
                                            <Trash2 size={14} className="text-destructive mr-2" />
                                            <Text className="text-destructive font-typewriter">Delete</Text>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </View>

                                  {isEditingReply ? (
                                    <View className="space-y-2">
                                      <TextInput
                                        value={editingContent}
                                        onChangeText={setEditingContent}
                                        multiline
                                        className="min-h-20 bg-card border border-input rounded-lg p-3 text-foreground font-typewriter"
                                        maxLength={500}
                                      />
                                      <View className="flex-row gap-2">
                                        <Button
                                          size="sm"
                                          onPress={() => handleSaveEdit(reply.id)}
                                        >
                                          <Text className="text-primary-foreground font-typewriter">Save</Text>
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onPress={handleCancelEdit}
                                        >
                                          <Text className="text-foreground font-typewriter">Cancel</Text>
                                        </Button>
                                      </View>
                                    </View>
                                  ) : (
                                    <>
                                      {reply.content && (
                                        <Text className="text-sm text-foreground font-typewriter leading-5 mb-2">{reply.content}</Text>
                                      )}
                                      {reply.media_url && reply.media_type === 'image' && (
                                        <TouchableOpacity
                                          onPress={() => setEnlargedImage({ url: reply.media_url!, alt: 'Reply attachment' })}
                                        >
                                          <Image
                                            source={{ uri: reply.media_url }}
                                            alt="Reply attachment"
                                            className="w-40 h-40 rounded-lg mt-2"
                                          />
                                        </TouchableOpacity>
                                      )}
                                      <View className="flex-row items-center gap-2 mt-2">
                                        <TouchableOpacity
                                          className="flex-row items-center gap-1 p-2 active:bg-muted rounded-lg"
                                          onPress={() => handleLikeComment(reply.id)}
                                        >
                                          <Heart
                                            size={14}
                                            className={likedComments[reply.id] ? "text-destructive" : "text-muted-foreground"}
                                          />
                                          {reply.likes_count ? (
                                            <Text className="text-xs text-muted-foreground font-typewriter">{reply.likes_count}</Text>
                                          ) : null}
                                        </TouchableOpacity>
                                      </View>
                                    </>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </DialogContent>

      {enlargedImage && (
        <ImageModal
          open={!!enlargedImage}
          onOpenChange={(open) => !open && setEnlargedImage(null)}
          imageUrl={enlargedImage.url}
          imageAlt={enlargedImage.alt}
        />
      )}
    </Dialog>
  );
}