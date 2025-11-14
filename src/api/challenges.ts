import { supabase } from '@/integrations/supabase/client';

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  tasks?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'quick-wins' | 'adulting' | 'mindset' | 'social' | 'outdoors' | 'local' | 'creative' | 'collab';
  duration_minutes: number;
  points: number;
  materials?: string[];
  safety_note?: string;
  fun_enhancements?: string[];
  reflection_questions?: string[];
  image_url?: string;
  media_requirement: 'none' | 'photo' | 'video';
  is_repeatable?: boolean;
  created_at: string;
  updated_at: string;
  author_id?: string;
}

export const getChallenges = async (filters?: {
  difficulty?: string;
  category?: string;
  query?: string;
}): Promise<ChallengeItem[]> => {
  let queryBuilder = supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.difficulty && filters.difficulty !== 'all') {
    queryBuilder = queryBuilder.eq('difficulty', filters.difficulty);
  }

  if (filters?.category && filters.category !== 'all') {
    queryBuilder = queryBuilder.eq('category', filters.category);
  }

  if (filters?.query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
  }

  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Error fetching challenges:', error);
    throw error;
  }

  return (data || []) as ChallengeItem[];
};

export const getChallengeById = async (id: string): Promise<ChallengeItem | null> => {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching challenge by id:', error);
    throw error;
  }

  return data as ChallengeItem | null;
};

export const createChallenge = async (challenge: {
  title: string;
  description: string;
  tasks?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'quick-wins' | 'adulting' | 'mindset' | 'social' | 'outdoors' | 'local' | 'creative' | 'collab';
  duration_minutes: number;
  points: number;
  materials?: string[];
  safety_note?: string;
  fun_enhancements?: string[];
  reflection_questions?: string[];
  image_url?: string;
  media_requirement?: 'none' | 'photo' | 'video';
  is_repeatable?: boolean;
}): Promise<ChallengeItem> => {
  const { data: userData } = await supabase.auth.getUser();
  
  const insertData: any = {
    ...challenge,
    author_id: userData.user?.id
  };
  
  const { data, error } = await supabase
    .from('challenges')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }

  return data as ChallengeItem;
};

export const updateChallenge = async (id: string, updates: {
  title?: string;
  description?: string;
  tasks?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: 'quick-wins' | 'adulting' | 'mindset' | 'social' | 'outdoors' | 'local' | 'creative' | 'collab';
  duration_minutes?: number;
  points?: number;
  materials?: string[];
  safety_note?: string;
  fun_enhancements?: string[];
  reflection_questions?: string[];
  image_url?: string;
  media_requirement?: 'none' | 'photo' | 'video';
  is_repeatable?: boolean;
}): Promise<ChallengeItem> => {
  const { data, error } = await supabase
    .from('challenges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating challenge:', error);
    throw error;
  }

  return data as ChallengeItem;
};

export const deleteChallenge = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('challenges')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting challenge:', error);
    throw error;
  }
};