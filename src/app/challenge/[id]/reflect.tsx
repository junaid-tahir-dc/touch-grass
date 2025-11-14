import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getChallengeById, type ChallengeItem } from '@/api/challenges';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { completeChallengeSession } from '@/api/challengeSessions';

export default function ChallengeReflect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadChallenge = async () => {
      if (!id) return;

      try {
        const challengeData = await getChallengeById(id);
        setChallenge(challengeData);
        if (challengeData?.reflection_questions?.length) {
          setAnswers(new Array(challengeData.reflection_questions.length).fill(''));
        }
      } catch (error) {
        router.push('/challenges');
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id]);

  const handleSubmit = async () => {
    if (!id || !challenge) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to save your reflection",
          variant: "destructive"
        });
        return;
      }

      // Check if this is a repeat completion BEFORE completing the session
      const { count: previousCompletions } = await supabase
        .from('user_challenge_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('challenge_id', id)
        .not('completed_at', 'is', null);

      const isRepeatCompletion = (previousCompletions || 0) > 0;

      // Get the most recent session for this challenge
      const { data: session, error: sessionError } = await supabase
        .from('user_challenge_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', id)
        .is('completed_at', null)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
      }

      // Create reflection object mapping questions to answers
      const reflectionData = challenge.reflection_questions?.reduce((acc, question, index) => {
        if (answers[index] && answers[index].trim()) {
          acc[question] = answers[index].trim();
        }
        return acc;
      }, {} as Record<string, string>) || {};

      // Ensure at least one reflection was provided
      if (Object.keys(reflectionData).length === 0) {
        toast({
          title: "Please add a reflection",
          description: "Share your thoughts on at least one reflection question",
          variant: "destructive"
        });
        setSubmitting(false);
        return;
      }

      // Save reflection to database
      const { error } = await supabase
        .from('user_challenge_reflections')
        .insert({
          user_id: user.id,
          challenge_id: id,
          session_id: session?.id || null,
          reflections: reflectionData
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      // Also complete the active session so it is removed from In Progress
      try {
        if (session?.id) {
          // Ensure unique constraint won't trip by removing previous inactive rows
          await supabase
            .from('user_challenge_sessions')
            .delete()
            .eq('user_id', user.id)
            .eq('challenge_id', id)
            .eq('is_active', false);

          await supabase
            .from('user_challenge_sessions')
            .update({ completed_at: new Date().toISOString(), is_active: false, posted_anonymously: false })
            .eq('id', session.id);
        } else {
          await completeChallengeSession(id, false);
        }

        // Track analytics
        const { analytics } = await import('@/services/analytics');
        analytics.trackChallengeComplete(id, challenge.title, challenge.points || 0);

        // Dispatch event for web compatibility
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('challenge-sessions-changed'));
        }
      } catch (e) {
        console.warn('Could not complete session from reflect:', e);
      }

      // Show appropriate completion message
      if (isRepeatCompletion) {
        toast({
          title: "🎉 Challenge Complete!",
          description: "Great job practicing and building this habit!"
        });
      } else {
        toast({
          title: "🎉 Challenge Complete!",
          description: `Amazing work! You've earned ${challenge?.points} XP`
        });
      }

      // Reset button state quickly, then navigate
      setSubmitting(false);
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (error) {
      console.error('Error saving reflection:', error);
      toast({
        title: "Error saving reflection",
        description: "Your reflection couldn't be saved. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex items-center justify-center py-20">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex items-center justify-center py-20">
          <Text className="text-muted-foreground font-typewriter mb-4">Challenge not found</Text>
          <Button onPress={() => router.push('/challenges')}>
            <Text className="font-typewriter">Back to Challenges</Text>
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-subtle">
      <Header showBack title="Reflection" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Card className="p-6 card-gradient items-center mb-6">
          <Sparkles size={32} color="hsl(var(--primary))" className="mb-4" />
          <Text className="text-xl font-bold mb-2 font-typewriter text-center">
            Take a moment to reflect
          </Text>
          <Text className="text-muted-foreground text-sm font-typewriter text-center">
            Reflection helps you remember and learn from this experience
          </Text>
        </Card>

        <View className="space-y-4">
          {(challenge.reflection_questions || []).map((question, index) => (
            <Card key={index} className="p-6 card-gradient">
              <Text className="text-base font-medium mb-4 font-typewriter">
                {question}
              </Text>
              <TextInput
                placeholder="Share your thoughts..."
                placeholderTextColor="hsl(var(--muted-foreground))"
                value={answers[index] || ''}
                onChangeText={(text) => {
                  const newAnswers = [...answers];
                  newAnswers[index] = text;
                  setAnswers(newAnswers);
                }}
                multiline
                numberOfLines={4}
                className="py-3 px-4 bg-background border border-input rounded-lg text-foreground font-typewriter"
                style={{ textAlignVertical: 'top', minHeight: 100 }}
              />
            </Card>
          ))}

          <Card className="p-4 card-gradient">
            <Button
              onPress={handleSubmit}
              disabled={submitting}
              className="w-full bg-primary py-4"
            >
              <Text className="font-typewriter text-base">
                {submitting ? 'Finishing...' : 'Complete Challenge! 🎉'}
              </Text>
            </Button>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}