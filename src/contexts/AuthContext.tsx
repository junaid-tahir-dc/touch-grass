import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Declare Progressier types
declare global {
  interface Window {
    progressier?: {
      add: (data: {
        userId: string;
        email?: string;
        username?: string;
        displayName?: string;
        [key: string]: any;
      }) => void;
    };
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Clean up localStorage data when user changes
const cleanupUserLocalStorage = () => {
  // Remove old mock data that could cause conflicts between users
  const keysToRemove = [
    'touchgrass_user',
    'touchgrass_progress',
    'touchgrass_submissions',
    'user_posts',
    'user_following',
    'post_comments'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clean up localStorage when user signs out or session changes
        if (event === 'SIGNED_OUT') {
          cleanupUserLocalStorage();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Clean up to prevent data mixing between users
          cleanupUserLocalStorage();
          
          // Update login streak (defer to avoid blocking auth flow)
          if (session?.user) {
            setTimeout(async () => {
              try {
                await supabase.rpc('update_login_streak');
              } catch (err) {
                console.error('Error updating login streak:', err);
              }
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Update login streak for existing session
      if (session?.user) {
        setTimeout(async () => {
          try {
            await supabase.rpc('update_login_streak');
          } catch (err) {
            console.error('Error updating login streak:', err);
          }
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Pass user data to Progressier
  useEffect(() => {
    if (!user) {
      console.log('Progressier: No user available yet');
      return;
    }

    console.log('Progressier: Starting to pass user data for user:', user.id);

    const passDataToProgressier = async () => {
      // Wait for Progressier to be ready
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 3 seconds
      
      const waitForProgressier = () => {
        return new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            attempts++;
            console.log(`Progressier: Checking for window.progressier (attempt ${attempts}/${maxAttempts})`);
            if (window.progressier) {
              clearInterval(checkInterval);
              console.log('Progressier: Found window.progressier object');
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              console.error('Progressier: NOT LOADED after 3 seconds of waiting');
              resolve();
            }
          }, 100);
        });
      };

      await waitForProgressier();

      if (window.progressier) {
        try {
          console.log('Progressier: Fetching user profile data...');
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('username, display_name')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            console.error('Progressier: Error fetching profile:', profileError);
          }

          const userData = {
            userId: user.id,
            email: user.email || '',
            username: profile?.username || '',
            displayName: profile?.display_name || user.email || ''
          };

          console.log('Progressier: Passing user data:', userData);
          
          window.progressier.add(userData);
          
          console.log('✅ Progressier: User data passed successfully');
        } catch (err) {
          console.error('❌ Progressier: Error passing user data:', err);
        }
      } else {
        console.error('❌ Progressier: window.progressier is NOT available');
      }
    };

    passDataToProgressier();
  }, [user]);

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });
    
    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Track analytics
      // import('@/services/analytics').then(({ analytics }) => {
      //   analytics.trackSignUp('email');
      // });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Track analytics
      // import('@/services/analytics').then(({ analytics }) => {
      //   analytics.trackSignIn('email');
      // });
    }
    
    return { error };
  };

  const signOut = async () => {
    // Track analytics
    // import('@/services/analytics').then(({ analytics }) => {
    //   analytics.trackSignOut();
    // });
    
    // Set user offline before signing out
    if (user) {
      await supabase
        .from('user_profiles')
        .update({ is_online: false })
        .eq('user_id', user.id);
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    if (error) {
      toast({
        title: "Reset password failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset email sent",
        description: "Please check your email for password reset instructions",
      });
    }
    
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
