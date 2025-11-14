import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// import { NotificationPreferences } from '@/services/notifications';

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<any>({
    chat_messages: true,
    challenge_updates: true,
    browser_notifications: true,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile, error } = await supabase
        .from('user_profiles_private')
        .select('notification_preferences')
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (error) throw error;

      if (profile?.notification_preferences) {
        const prefs = profile.notification_preferences as any;
        setPreferences({
          chat_messages: prefs.chat_messages ?? true,
          challenge_updates: prefs.challenge_updates ?? true,
          browser_notifications: prefs.browser_notifications ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: Partial<any>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const updatedPreferences = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('user_profiles_private')
        .update({ 
          notification_preferences: updatedPreferences 
        })
        .eq('user_id', user.user.id);

      if (error) throw error;

      setPreferences(updatedPreferences);

      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved"
      });

      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    preferences,
    loading,
    updatePreferences,
    reload: loadPreferences,
  };
};