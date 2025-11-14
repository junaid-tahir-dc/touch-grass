import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

export const useUserProfiles = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    const fetchProfiles = async () => {
      console.log('Fetching initial user profiles...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, display_name, avatar_url, is_online');

      if (error) {
        console.error('Error fetching user profiles:', error);
      } else {
        console.log('Initial user profiles loaded:', data);
        setProfiles(data || []);
      }
      setLoading(false);
    };

    fetchProfiles();

    // Set up real-time listener for profile changes
    console.log('Setting up real-time listener for user_profiles...');
    const channel = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('User profile updated:', payload);
          const updatedProfile = payload.new as UserProfile;
          
          setProfiles(prev => 
            prev.map(profile => 
              profile.user_id === updatedProfile.user_id 
                ? { ...profile, ...updatedProfile }
                : profile
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('New user profile created:', payload);
          const newProfile = payload.new as UserProfile;
          setProfiles(prev => [...prev, newProfile]);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up user_profiles real-time listener');
      supabase.removeChannel(channel);
    };
  }, []);

  const getProfileByUserId = (userId: string) => {
    return profiles.find(profile => profile.user_id === userId);
  };

  const getOnlineUsers = () => {
    return profiles.filter(profile => profile.is_online);
  };

  return {
    profiles,
    loading,
    getProfileByUserId,
    getOnlineUsers,
  };
};