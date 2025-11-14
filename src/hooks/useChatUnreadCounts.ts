import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UnreadCounts {
  [chatId: string]: number;
}

export const useChatUnreadCounts = () => {
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});

  const calculateUnreadCount = async (chatId: string, lastSeenAt: string | null): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { data: messages, error } = await supabase
        .from('messages')
        .select('id')
        .eq('chat_id', chatId)
        .neq('user_id', user.id) // Exclude own messages
        .gt('created_at', lastSeenAt || '1970-01-01');

      if (error) {
        console.error('Error fetching unread messages:', error);
        return 0;
      }

      return messages?.length || 0;
    } catch (error) {
      console.error('Error calculating unread count:', error);
      return 0;
    }
  };

  const updateUnreadCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all user's chat participations
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('chat_id, last_seen_at')
        .eq('user_id', user.id);

      if (!participations) return;

      // Calculate unread count for each chat
      const counts: UnreadCounts = {};
      await Promise.all(
        participations.map(async (participation) => {
          const count = await calculateUnreadCount(
            participation.chat_id,
            participation.last_seen_at
          );
          counts[participation.chat_id] = count;
        })
      );

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error updating unread counts:', error);
    }
  };

  useEffect(() => {
    updateUnreadCounts();

    // Subscribe to both new messages and chat_participants updates
    const channel = supabase
      .channel('chat-unread-counts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          updateUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants'
        },
        (payload) => {
          // Only update if it's the current user's participation that was updated
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.user_id === user.id) {
              updateUnreadCounts();
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUnreadCount = (chatId: string): number => {
    return unreadCounts[chatId] || 0;
  };

  const markChatAsRead = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('chat_participants')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);

      // Update local state
      setUnreadCounts(prev => ({ ...prev, [chatId]: 0 }));
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  return { getUnreadCount, markChatAsRead, updateUnreadCounts };
};