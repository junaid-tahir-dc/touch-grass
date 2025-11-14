import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_online: boolean; // legacy column (not reliable)
  last_seen_at?: string | null; // derive online from this with 120s threshold
  follower_count: number;
  following_count: number;
  interests: string[] | null;
  show_on_leaderboard: boolean;
  onboarding_completed: boolean;
  total_xp: number;
  current_streak: number;
  last_challenge_date: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch public profile data
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    // Fetch private profile data (only accessible for own profile)
    const { data: privateData } = await supabase
      .from('user_profiles_private')
      .select('date_of_birth, notification_preferences, is_suspended, last_login_date, last_seen_at')
      .eq('user_id', user.id)
      .maybeSingle();

    // Merge public and private data
    return {
      ...profile,
      ...privateData
    } as UserProfile;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
}

export async function getUserProfileById(userId: string): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const isOwnProfile = user?.id === userId;
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile by ID:', error);
      return null;
    }

    // If viewing own profile, merge with private data
    if (isOwnProfile) {
      const { data: privateData } = await supabase
        .from('user_profiles_private')
        .select('date_of_birth, notification_preferences, is_suspended, last_login_date, last_seen_at')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        ...profile,
        ...privateData
      } as UserProfile;
    }

    // For other users, return only public data
    return profile as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfileById:', error);
    return null;
  }
}

export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching user profile by username:', error);
      return null;
    }
    
    const isOwnProfile = user?.id === profile.user_id;
    
    // If viewing own profile, merge with private data
    if (isOwnProfile) {
      const { data: privateData } = await supabase
        .from('user_profiles_private')
        .select('date_of_birth, notification_preferences, is_suspended, last_login_date, last_seen_at')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      return {
        ...profile,
        ...privateData
      } as UserProfile;
    }

    // For other users, return only public data
    return profile as UserProfile;
  } catch (error) {
    console.error('Error in getUserProfileByUsername:', error);
    return null;
  }
}

export async function updateUserProfile(updates: Partial<Pick<UserProfile, 'display_name' | 'username' | 'bio' | 'avatar_url' | 'interests' | 'onboarding_completed' | 'show_on_leaderboard'> & { date_of_birth?: string }>): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Separate updates for public and private tables
    const publicUpdates: any = {};
    const privateUpdates: any = {};

    // Categorize updates
    if (updates.username !== undefined) publicUpdates.username = updates.username;
    if (updates.display_name !== undefined) publicUpdates.display_name = updates.display_name;
    if (updates.avatar_url !== undefined) publicUpdates.avatar_url = updates.avatar_url;
    if (updates.bio !== undefined) publicUpdates.bio = updates.bio;
    if (updates.interests !== undefined) publicUpdates.interests = updates.interests;
    if (updates.show_on_leaderboard !== undefined) publicUpdates.show_on_leaderboard = updates.show_on_leaderboard;
    if (updates.onboarding_completed !== undefined) publicUpdates.onboarding_completed = updates.onboarding_completed;
    
    if (updates.date_of_birth !== undefined) privateUpdates.date_of_birth = updates.date_of_birth;

    // Update public profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(publicUpdates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // Update private profile if there are private updates
    if (Object.keys(privateUpdates).length > 0) {
      const { error: privateError } = await supabase
        .from('user_profiles_private')
        .update(privateUpdates)
        .eq('user_id', user.id);

      if (privateError) throw privateError;
    }

    // Return merged profile
    return getCurrentUserProfile();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function followUser(targetUserId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    if (user.id === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    const { error } = await supabase
      .from('user_followers')
      .insert({
        follower_id: user.id,
        following_id: targetUserId
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}

export async function unfollowUser(targetUserId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);

    if (error) throw error;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}

export async function removeFollower(followerUserId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_followers')
      .delete()
      .eq('follower_id', followerUserId)
      .eq('following_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing follower:', error);
    throw error;
  }
}

export async function checkIsFollowing(targetUserId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_followers')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle();

    if (error) {
      console.error('Error checking follow status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in checkIsFollowing:', error);
    return false;
  }
}