import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';

export const usePresence = () => {
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;

    console.log('Setting up presence tracking for user:', user.id);

    // Create a global presence channel
    const channel = supabase.channel('global_presence', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    // Track presence state changes
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        console.log('Presence sync:', presenceState);
        
        // Update last_seen_at for all users in presence
        const onlineUserIds = Object.keys(presenceState);
        updateLastSeenForUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        updateUserLastSeen(key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        // No need to update on leave - last_seen_at will become stale naturally
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;

        console.log('Presence channel subscribed, tracking user presence');

        // Track current user as online
        const presenceTrackStatus = await channel.track({
          user_id: user.id,
          online_at: new Date().toISOString(),
        });

        console.log('Presence track status:', presenceTrackStatus);

        // Set up heartbeat to maintain presence (every 60 seconds)
        heartbeatRef.current = setInterval(async () => {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }, 60000); // Update every 60 seconds
      });

    return () => {
      console.log('Cleaning up presence tracking');
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Last update before leaving (best effort)
      if (user) {
        updateUserLastSeen(user.id);
      }
    };
  }, [user]);

  // Function to update presence for a single user (both public and private tables)
  const updateUserLastSeen = async (userId: string) => {
    try {
      console.log(`Updating user ${userId} presence`);
      
      // Update is_online in public table
      const { error: publicError } = await supabase
        .from('user_profiles')
        .update({ is_online: true })
        .eq('user_id', userId);

      if (publicError) {
        console.error('Error updating user is_online:', publicError);
      }

      // Update last_seen_at in private table (only works for current user due to RLS)
      const { error: privateError } = await supabase
        .from('user_profiles_private')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (privateError && privateError.code !== 'PGRST116') {
        // PGRST116 is "not found" error - expected for other users due to RLS
        console.error('Error updating user last_seen_at:', privateError);
      }
    } catch (error) {
      console.error('Error in updateUserLastSeen:', error);
    }
  };

  // Function to update presence for multiple users
  const updateLastSeenForUsers = async (onlineUserIds: string[]) => {
    try {
      console.log('Updating presence for users:', onlineUserIds);
      
      if (onlineUserIds.length > 0) {
        // Update is_online in public table
        await supabase
          .from('user_profiles')
          .update({ is_online: true })
          .in('user_id', onlineUserIds);

        // Update last_seen_at in private table (only works for current user due to RLS)
        await supabase
          .from('user_profiles_private')
          .update({ last_seen_at: new Date().toISOString() })
          .in('user_id', onlineUserIds);
      }
    } catch (error) {
      console.error('Error in updateLastSeenForUsers:', error);
    }
  };

  return {
    // You can expose methods here if needed
  };
};