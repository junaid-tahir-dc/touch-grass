import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUnreadMessages = () => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    const checkUnreadMessages = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get user's chat participations with their last seen times
        const { data: participations } = await supabase
          .from('chat_participants')
          .select(`
            chat_id,
            last_seen_at
          `)
          .eq('user_id', user.id);

        if (!participations || participations.length === 0) {
          setHasUnreadMessages(false);
          return;
        }

        // Check for messages newer than last_seen_at for each chat
        let hasUnread = false;
        
        for (const participation of participations) {
          const { data: newMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('chat_id', participation.chat_id)
            .neq('user_id', user.id) // Exclude own messages
            .gt('created_at', participation.last_seen_at || '1970-01-01')
            .limit(1);

          if (newMessages && newMessages.length > 0) {
            hasUnread = true;
            break;
          }
        }

        console.log('Unread messages check:', { hasUnread, participationsCount: participations.length });
        setHasUnreadMessages(hasUnread);
      } catch (error) {
        console.error('Error checking unread messages:', error);
        setHasUnreadMessages(false);
      }
    };

    checkUnreadMessages();

    // Subscribe to both new messages and chat_participants updates
    const channel = supabase
      .channel('unread-messages-indicator')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          console.log('New message detected, checking unread status');
          checkUnreadMessages();
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
              console.log('User participation updated, checking unread status');
              checkUnreadMessages();
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return hasUnreadMessages;
};