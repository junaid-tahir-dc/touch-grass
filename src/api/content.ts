import { supabase } from '@/integrations/supabase/client';

export interface ContentItem {
  id: string;
  title: string;
  content_type: 'article' | 'video';
  content?: string;
  summary?: string;
  thumbnail_url?: string;
  video_url?: string;
  file_path?: string;
  tags?: string[];
  published_at: string;
  created_at: string;
  updated_at: string;
  author_id?: string;
}

export const getContent = async (filters?: {
  type?: 'all' | 'article' | 'video';
  query?: string;
}): Promise<ContentItem[]> => {
  let query = supabase
    .from('content')
    .select('*')
    .order('published_at', { ascending: false });

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('content_type', filters.type);
  }

  if (filters?.query) {
    query = query.or(`title.ilike.%${filters.query}%,content.ilike.%${filters.query}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching content:', error);
    throw error;
  }

  return (data || []) as ContentItem[];
};

export const getContentById = async (id: string): Promise<ContentItem | null> => {
  const { data, error } = await supabase
    .from('content')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching content by id:', error);
    throw error;
  }

  return data as ContentItem | null;
};

export const createContent = async (content: {
  title: string;
  content_type: 'article' | 'video';
  content?: string;
  summary?: string;
  thumbnail_url?: string;
  video_url?: string;
  tags?: string[];
  file_path?: string;
}): Promise<ContentItem> => {
  const { data: userData } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('content')
    .insert({
      ...content,
      author_id: userData.user?.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating content:', error);
    throw error;
  }

  return data as ContentItem;
};

export const updateContent = async (id: string, updates: {
  title?: string;
  content_type?: 'article' | 'video';
  content?: string;
  summary?: string;
  thumbnail_url?: string;
  video_url?: string;
  tags?: string[];
  file_path?: string;
}): Promise<ContentItem> => {
  const { data, error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating content:', error);
    throw error;
  }

  return data as ContentItem;
};

export const deleteContent = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
};