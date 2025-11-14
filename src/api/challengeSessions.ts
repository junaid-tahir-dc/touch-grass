import { supabase } from '@/integrations/supabase/client';

export interface ChallengeSession {
  id: string;
  user_id: string;
  challenge_id: string;
  started_at: string;
  completed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChallengeSessionWithChallenge extends ChallengeSession {
  challenge: {
    id: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    category: string;
    duration_minutes: number;
    points: number;
    image_url?: string;
  };
}

export const startChallengeSession = async (challengeId: string): Promise<ChallengeSession> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  console.log('[startChallengeSession] Starting session for challenge:', challengeId);

  // First, check if there's already an active session for this challenge
  const { data: existingSession } = await supabase
    .from('user_challenge_sessions')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', true)
    .is('completed_at', null)
    .maybeSingle();

  if (existingSession) {
    console.log('[startChallengeSession] Found existing active session:', existingSession.id);
    return existingSession as ChallengeSession;
  }
  // Cleanup: remove any active sessions that are already completed (edge case)
  await supabase
    .from('user_challenge_sessions')
    .delete()
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', true)
    .not('completed_at', 'is', null);

  // Create new session
  console.log('[startChallengeSession] Creating new session');
  const { data, error } = await supabase
    .from('user_challenge_sessions')
    .insert({
      user_id: user.user.id,
      challenge_id: challengeId,
    })
    .select()
    .single();

  if (error) {
    console.error('[startChallengeSession] Error creating challenge session:', error);
    // Handle unique constraint violation by returning existing active session
    // @ts-ignore - Supabase error has code property
    if (error.code === '23505') {
      console.warn('[startChallengeSession] Unique constraint - returning existing active session');
      const { data: existing } = await supabase
        .from('user_challenge_sessions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('challenge_id', challengeId)
        .eq('is_active', true)
        .is('completed_at', null)
        .maybeSingle();
      if (existing) {
        try { window.dispatchEvent(new Event('challenge-sessions-changed')); } catch {}
        return existing as ChallengeSession;
      }
    }
    throw error;
  }

  console.log('[startChallengeSession] New session created:', data.id, 'is_active:', data.is_active);
  try { window.dispatchEvent(new Event('challenge-sessions-changed')); } catch {}
  return data as ChallengeSession;
};

export const completeChallengeSession = async (challengeId: string, postedAnonymously: boolean = false): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  console.log('[completeChallengeSession] Completing sessions for challenge', { challengeId, postedAnonymously });

  // 1) Remove any existing inactive rows to satisfy unique (user_id, challenge_id, is_active)
  const { error: removeInactiveErr } = await supabase
    .from('user_challenge_sessions')
    .delete()
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', false);
  if (removeInactiveErr) {
    console.warn('[completeChallengeSession] Warning deleting old inactive sessions:', removeInactiveErr);
  }

  // 2) Complete and deactivate any active sessions for this challenge
  const { error: finishErr } = await supabase
    .from('user_challenge_sessions')
    .update({ 
      completed_at: new Date().toISOString(), 
      is_active: false,
      posted_anonymously: postedAnonymously
    })
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', true);
  if (finishErr) {
    console.error('[completeChallengeSession] Error finishing active sessions:', finishErr);
    throw finishErr;
  }

  // 3) Wait a moment for database trigger to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // 4) Force refresh profile data from database
  const { error: refreshErr } = await supabase
    .from('user_profiles')
    .select('total_xp, current_streak')
    .eq('user_id', user.user.id)
    .single();
  
  if (refreshErr) {
    console.warn('[completeChallengeSession] Warning refreshing profile:', refreshErr);
  }

  try { window.dispatchEvent(new Event('challenge-sessions-changed')); } catch {}

  console.log('[completeChallengeSession] Completion finished with data refresh');
};

export const cancelChallengeSession = async (challengeId: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_challenge_sessions')
    .delete()
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', true);

  if (error) {
    console.error('Error canceling challenge session:', error);
    throw error;
  }
};

export const getActiveChallengeSession = async (challengeId: string): Promise<ChallengeSession | null> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return null;
  }

  const { data, error } = await supabase
    .from('user_challenge_sessions')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('challenge_id', challengeId)
    .eq('is_active', true)
    .is('completed_at', null)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active session:', error);
    return null;
  }

  return data as ChallengeSession | null;
};

export const getInProgressChallenges = async (): Promise<ChallengeSessionWithChallenge[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    return [];
  }

  console.log('[getInProgressChallenges] Fetching in-progress challenges');

  // First get active sessions that haven't been completed
  const { data: sessions, error: sessionsError } = await supabase
    .from('user_challenge_sessions')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('is_active', true)
    .is('completed_at', null)
    .order('started_at', { ascending: false });

  console.log('[getInProgressChallenges] Raw sessions from DB:', sessions?.length || 0, sessions);

  if (sessionsError) {
    console.error('Error fetching sessions:', sessionsError);
    throw sessionsError;
  }

  if (!sessions || sessions.length === 0) {
    return [];
  }

  // Failsafe: if any active session already has a reflection or qualifying post, complete it now
  const sessionIds = sessions.map((s) => s.id);

  const { data: reflectionsRes, error: refErr } = await supabase
    .from('user_challenge_reflections')
    .select('session_id, created_at')
    .in('session_id', sessionIds);

  const reflections = reflectionsRes || [];

  // Sessions that definitely have a reflection linked to them
  const sessionsToComplete = Array.from(new Set(
    reflections.map((r: any) => r.session_id).filter(Boolean)
  ));

  if (sessionsToComplete.length > 0) {
    // Delete completed-but-active sessions to avoid unique constraint conflicts
    const { error: cleanupErr } = await supabase
      .from('user_challenge_sessions')
      .delete()
      .in('id', sessionsToComplete);
    if (cleanupErr) {
      console.warn('Bulk cleanup warning:', cleanupErr);
    }
  }

  // Build remaining active sessions (client-side) to render now
  const remainingSessions = sessions.filter((s) => !sessionsToComplete.includes(s.id));
  if (remainingSessions.length === 0) {
    return [];
  }

  // Fetch challenge details for remaining sessions
  const remainingChallengeIds = Array.from(new Set(remainingSessions.map((s) => s.challenge_id)));
  const { data: challenges, error: challengesError } = await supabase
    .from('challenges')
    .select('id, title, description, difficulty, category, duration_minutes, points, image_url')
    .in('id', remainingChallengeIds);

  if (challengesError) {
    console.error('Error fetching challenges:', challengesError);
    throw challengesError;
  }

  return remainingSessions.map(session => {
    const challenge = challenges?.find(c => c.id === session.challenge_id);
    return {
      ...session,
      challenge: challenge || {
        id: session.challenge_id,
        title: 'Unknown Challenge',
        description: '',
        difficulty: 'easy' as const,
        category: 'unknown',
        duration_minutes: 0,
        points: 0
      }
    };
  }) as ChallengeSessionWithChallenge[];
};