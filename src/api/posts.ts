import { supabase } from '@/integrations/supabase/client';
import { validateFiles } from '@/lib/fileValidation';

export interface CreatePostData {
  content: string;
  media_type: 'text' | 'image' | 'video';
  media_files?: File[];
  is_anonymous?: boolean;
  challenge_id?: string;
}

export interface EditPostData {
  content?: string;
  media_type?: 'text' | 'image' | 'video';
  media_files?: File[];
  keep_existing_media?: boolean;
  existing_media_urls?: string[];
}

export interface Post {
  id: string;
  user_id: string | null; // Can be null for anonymous posts when viewed by others
  content: string;
  media_type: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  viewer_has_liked?: boolean;
  is_anonymous?: boolean;
  challenge_id?: string;
}

export async function createPost(data: CreatePostData): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  let mediaUrls: string[] = [];

  // Upload files if provided
  if (data.media_files && data.media_files.length > 0) {
    mediaUrls = await uploadPostMedia(data.media_files);
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      content: data.content,
      media_type: data.media_type,
      media_urls: mediaUrls,
      is_anonymous: data.is_anonymous || false,
      challenge_id: data.challenge_id || null
    })
    .select()
    .single();

  if (error) throw error;
  return post;
}

export async function editPost(postId: string, data: EditPostData): Promise<Post> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  console.log('Editing post:', { postId, userId: user.id });

  // Check if this is a mock post ID (not a UUID format)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
  
  if (!isUUID) {
    // This is a mock post, we can't edit it in Supabase
    // Instead, create a new post with the updated content
    console.log('Converting mock post to new Supabase post');
    
    const createData: CreatePostData = {
      content: data.content || '',
      media_type: data.media_type || 'text',
      media_files: data.media_files
    };
    
    return await createPost(createData);
  }

  // First, get the existing post to verify ownership
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select()
    .eq('id', postId)
    .single(); // Remove user_id filter initially to debug

  console.log('Existing post:', { existingPost, fetchError });

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    throw new Error('Post not found: ' + fetchError.message);
  }
  
  if (!existingPost) {
    throw new Error('Post not found');
  }

  // Check ownership separately for better debugging
  if (existingPost.user_id !== user.id) {
    console.error('Ownership check failed:', { 
      postUserId: existingPost.user_id, 
      currentUserId: user.id 
    });
    throw new Error('You do not have permission to edit this post');
  }

  let mediaUrls = existingPost.media_urls;

  // Handle media updates
  if (data.media_files && data.media_files.length > 0) {
    // Upload new media files and replace existing ones
    mediaUrls = await uploadPostMedia(data.media_files);
  } else if (data.keep_existing_media && data.existing_media_urls) {
    // Keep only the existing media URLs that weren't removed
    mediaUrls = data.existing_media_urls;
  } else if (data.existing_media_urls && data.existing_media_urls.length === 0) {
    // User removed all existing media
    mediaUrls = [];
  }

  // Prepare update data
  const updateData: any = {
    updated_at: new Date().toISOString()
  };

  if (data.content !== undefined) {
    updateData.content = data.content;
  }

  if (data.media_type !== undefined) {
    updateData.media_type = data.media_type;
  }

  // Update media URLs if they changed
  if (data.media_files || data.keep_existing_media !== undefined || data.existing_media_urls !== undefined) {
    updateData.media_urls = mediaUrls;
  }

  console.log('Update data:', updateData);

  const { data: updatedPost, error } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .eq('user_id', user.id) // Keep this for the actual update
    .select()
    .single();

  if (error) {
    console.error('Update error:', error);
    throw error;
  }
  
  return updatedPost;
}

export async function uploadPostMedia(files: File[]): Promise<string[]> {
  console.log('Starting file upload:', { fileCount: files.length });
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  console.log('User authenticated:', user.id);

  // Validate files before upload
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  const videoFiles = files.filter(f => f.type.startsWith('video/'));
  
  console.log('File types:', { images: imageFiles.length, videos: videoFiles.length });

  const imageValidation = validateFiles(imageFiles, 'image');
  const videoValidation = validateFiles(videoFiles, 'video');
  
  if (!imageValidation.isValid) {
    console.error('Image validation failed:', imageValidation.errors);
    throw new Error(imageValidation.errors[0].message);
  }
  
  if (!videoValidation.isValid) {
    console.error('Video validation failed:', videoValidation.errors);
    throw new Error(videoValidation.errors[0].message);
  }

  const uploadPromises = files.map(async (file, index) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log(`Uploading file ${index + 1}/${files.length}:`, { 
        name: file.name, 
        size: file.size,
        type: file.type,
        path: fileName 
      });

      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Upload error for file ${index + 1}:`, {
          error,
          message: error.message
        });
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log(`File ${index + 1} uploaded successfully:`, data);

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      console.log(`Public URL generated for file ${index + 1}:`, publicUrl);
      
      return publicUrl;
    } catch (err) {
      console.error(`Error uploading file ${index + 1}:`, err);
      throw err;
    }
  });

  try {
    const urls = await Promise.all(uploadPromises);
    console.log('All files uploaded successfully:', urls);
    return urls;
  } catch (err) {
    console.error('Failed to upload all files:', err);
    throw new Error(err instanceof Error ? err.message : 'Failed to upload files');
  }
}

export async function getPostById(postId: string): Promise<Post | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching post by id:', error);
    throw error;
  }

  if (!data) return null;

  // Hide user_id for anonymous posts unless viewing own post
  if (data.is_anonymous && data.user_id !== user?.id) {
    return { ...data, user_id: null } as Post;
  }

  return data as Post;
}

export async function getPosts(options: {
  sort?: 'newest' | 'top' | 'following';
  type?: 'all' | 'images' | 'videos' | 'text';
  limit?: number;
} = {}): Promise<Post[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      post_likes!left(user_id)
    `);

  // Apply type filters
  if (options.type && options.type !== 'all') {
    if (options.type === 'text') {
      query = query.is('media_type', null);
    } else if (options.type === 'images') {
      query = query.eq('media_type', 'image');
    } else if (options.type === 'videos') {
      query = query.eq('media_type', 'video');
    }
  }

  // Add sorting
  if (options.sort === 'top') {
    query = query.order('likes_count', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: posts, error } = await query;
  if (error) throw error;

  // Add viewer_has_liked field and attach author profile info
  const userIds = Array.from(new Set(posts.map(p => p.user_id).filter(Boolean)));
  let profileMap: Record<string, any> = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, username, display_name, avatar_url')
      .in('user_id', userIds);
    if (!profilesError && profiles) {
      profileMap = Object.fromEntries(profiles.map((p: any) => [p.user_id, p]));
    }
  }

  return posts.map((post: any) => {
    // Hide user_id for anonymous posts unless viewing own post
    const isOwnPost = user?.id === post.user_id;
    const shouldHideUserId = post.is_anonymous && !isOwnPost;
    
    return {
      ...post,
      user_id: shouldHideUserId ? null : post.user_id,
      viewer_has_liked: user ? post.post_likes?.some((like: any) => like.user_id === user.id) : false,
      user_profiles: shouldHideUserId ? null : (profileMap[post.user_id] || null),
      taggedChallengeId: post.challenge_id // Map challenge_id to taggedChallengeId for compatibility
    };
  });
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
}

export async function togglePostLike(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Verify user profile exists before liking
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('User profile not found:', { userId: user.id, error: profileError });
    throw new Error('User profile not found. Please refresh the page and try again.');
  }

  // Check if user already liked the post
  const { data: existingLike } = await supabase
    .from('post_likes')
    .select()
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingLike) {
    // Unlike the post
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error removing like:', error);
      throw new Error(`Failed to remove like: ${error.message}`);
    }
    return false;
  } else {
    // Like the post
    const { error } = await supabase
      .from('post_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      });
    
    if (error) {
      console.error('Error creating like:', error);
      throw new Error(`Failed to like post: ${error.message}`);
    }
    return true;
  }
}
