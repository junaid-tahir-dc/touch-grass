import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema for comments
const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters')
});

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  likes_count?: number;
  replies_count?: number;
  parent_comment_id?: string | null;
  user_profiles?: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

export async function getComments(postId: string): Promise<Comment[]> {
  const { data: comments, error } = await supabase
    .from('comments')
    .select(`
      *,
      user_profiles!comments_user_id_fkey (
        user_id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!comments) return [];

  return comments as any as Comment[];
}

export async function createComment(
  postId: string, 
  content: string, 
  mediaUrl?: string, 
  mediaType?: string,
  parentCommentId?: string | null
): Promise<Comment> {
  // Validate comment content
  const validation = commentSchema.safeParse({ content });
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      parent_comment_id: parentCommentId
    })
    .select(`
      *,
      user_profiles!comments_user_id_fkey (
        user_id,
        username,
        display_name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw new Error(`Failed to create comment: ${error.message}`);
  }

  return comment as any as Comment;
}

export async function likeComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('comment_likes')
    .insert({
      comment_id: commentId,
      user_id: user.id
    });

  if (error) throw error;
}

export async function unlikeComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getCommentLikes(commentIds: string[]): Promise<Record<string, boolean>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .in('comment_id', commentIds)
    .eq('user_id', user.id);

  if (error) throw error;

  const likes: Record<string, boolean> = {};
  data?.forEach(like => {
    likes[like.comment_id] = true;
  });

  return likes;
}

export async function updateComment(commentId: string, content: string): Promise<void> {
  // Validate comment content
  const validation = commentSchema.safeParse({ content });
  if (!validation.success) {
    throw new Error(validation.error.errors[0].message);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) throw error;
}
