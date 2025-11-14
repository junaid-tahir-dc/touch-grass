import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingUser {
  user_id: string;
  username: string;
  display_name?: string;
}

export const useTypingIndicator = (chatId: string | null) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (!chatId || !currentUser) return;

    const channelName = `typing-${chatId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.keys(newState).forEach(userId => {
          if (userId !== currentUser) {
            const presences = newState[userId] as any[];
            if (presences.length > 0) {
              const user = presences[0];
              users.push({
                user_id: userId,
                username: user.username,
                display_name: user.display_name
              });
            }
          }
        });
        
        setTypingUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== currentUser) {
          const user = newPresences[0] as any;
          setTypingUsers(prev => {
            if (prev.some(u => u.user_id === key)) return prev;
            return [...prev, {
              user_id: key,
              username: user.username,
              display_name: user.display_name
            }];
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== currentUser) {
          setTypingUsers(prev => prev.filter(u => u.user_id !== key));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUser]);

  const startTyping = async () => {
    if (!chatId || !currentUser || isTypingRef.current) return;

    try {
      // Get user profile for presence data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, display_name')
        .eq('user_id', currentUser)
        .single();

      if (profile) {
        const channelName = `typing-${chatId}`;
        const channel = supabase.channel(channelName);
        
        await channel.track({
          user_id: currentUser,
          username: profile.username,
          display_name: profile.display_name,
          typing_at: new Date().toISOString()
        });
        
        isTypingRef.current = true;
      }
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  };

  const stopTyping = async () => {
    if (!chatId || !currentUser || !isTypingRef.current) return;

    try {
      const channelName = `typing-${chatId}`;
      const channel = supabase.channel(channelName);
      await channel.untrack();
      isTypingRef.current = false;
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  };

  const handleTyping = () => {
    startTyping();
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    stopTyping();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      stopTyping();
    };
  }, []);

  return {
    typingUsers,
    handleTyping,
    handleStopTyping
  };
};