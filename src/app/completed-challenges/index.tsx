import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trophy, Star, CheckCircle, Sparkles, X } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface CompletedChallengeStats {
  challenge_id: string;
  challenge_title: string;
  challenge_image_url: string | null;
  challenge_points: number;
  challenge_repeatable: boolean;
  times_completed: number;
  first_completed: string;
  last_completed: string;
  total_points_earned: number;
}

interface ReflectionEntry {
  id: string;
  reflections: Record<string, string>;
  created_at: string;
}

export default function CompletedChallenges() {
  const router = useRouter();
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallengeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [selectedChallenge, setSelectedChallenge] = useState<CompletedChallengeStats | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loadingReflections, setLoadingReflections] = useState(false);
  const [showReflectionsModal, setShowReflectionsModal] = useState(false);

  const loadCompletedChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sessions, error: sessionsError } = await supabase
        .from('user_challenge_sessions')
        .select('challenge_id, completed_at, points_awarded')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) {
        setCompletedChallenges([]);
        setTotalPoints(0);
        setTotalCompletions(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const challengeIds = [...new Set(sessions.map(s => s.challenge_id))];
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('id, title, image_url, points, is_repeatable')
        .in('id', challengeIds);

      if (challengesError) throw challengesError;

      const challengesMap = new Map(challenges?.map(c => [c.id, c]) || []);

      const challengeMap = new Map<string, CompletedChallengeStats>();
      let totalPts = 0;
      let totalComps = 0;

      sessions.forEach((session) => {
        const challengeId = session.challenge_id;
        const challenge = challengesMap.get(challengeId);

        if (!challenge) return;

        totalComps++;
        const sessionPoints = session.points_awarded || 0;
        totalPts += sessionPoints;

        const completedAt = session.completed_at || new Date().toISOString();
        const isRepeatable = challenge.is_repeatable ?? false;

        if (challengeMap.has(challengeId)) {
          const existing = challengeMap.get(challengeId)!;
          existing.times_completed++;
          existing.last_completed = completedAt;
          existing.total_points_earned += sessionPoints;
        } else {
          challengeMap.set(challengeId, {
            challenge_id: challengeId,
            challenge_title: challenge.title,
            challenge_image_url: challenge.image_url,
            challenge_points: challenge.points,
            challenge_repeatable: isRepeatable,
            times_completed: 1,
            first_completed: completedAt,
            last_completed: completedAt,
            total_points_earned: sessionPoints,
          });
        }
      });

      const challengeStats = Array.from(challengeMap.values());
      setCompletedChallenges(challengeStats);
      setTotalPoints(totalPts);
      setTotalCompletions(totalComps);
    } catch (error) {
      console.error('Error loading completed challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadCompletedChallenges();
  }, []);

  useEffect(() => {
    loadCompletedChallenges();
  }, []);

  const loadReflections = async (challengeId: string) => {
    setLoadingReflections(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_challenge_reflections')
        .select('id, reflections, created_at')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedReflections: ReflectionEntry[] = (data || []).map(item => ({
        id: item.id,
        created_at: item.created_at,
        reflections: item.reflections as Record<string, string>
      }));

      setReflections(typedReflections);
    } catch (error) {
      console.error('Error loading reflections:', error);
    } finally {
      setLoadingReflections(false);
    }
  };

  const handleChallengeClick = async (challenge: CompletedChallengeStats) => {
    setSelectedChallenge(challenge);
    setShowReflectionsModal(true);
    await loadReflections(challenge.challenge_id);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Completed Challenges" showBack />
        <View className="flex items-center justify-center py-20">
          <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Completed Challenges" showBack />

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View className="p-4 md:p-6 space-y-6">
          {/* Stats Summary */}
          <View className="flex-row gap-3 md:gap-6">
            <View className="flex-1 bg-card border border-border rounded-lg p-4 md:p-6 overflow-hidden">
              <View className="flex flex-col h-full">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-success flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="text-white" size={16} strokeWidth={2.5} />
                  </View>
                  <Text className="text-xs font-semibold text-muted-foreground font-typewriter leading-tight">
                    Challenges{'\n'}Completed
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-1 mt-auto">
                  <Text className="text-3xl md:text-5xl font-bold text-success font-cooper leading-none">
                    {totalCompletions}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-medium pb-1 font-typewriter">total</Text>
                </View>
              </View>
            </View>

            <View className="flex-1 bg-card border border-border rounded-lg p-4 md:p-6 overflow-hidden">
              <View className="flex flex-col h-full">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-warning flex items-center justify-center flex-shrink-0">
                    <Star className="text-white" size={16} strokeWidth={2.5} fill="currentColor" />
                  </View>
                  <Text className="text-xs font-semibold text-muted-foreground font-typewriter leading-tight">
                    Total Points{'\n'}Earned
                  </Text>
                </View>
                <View className="flex-row items-baseline gap-1 mt-auto">
                  <Text className="text-3xl md:text-5xl font-bold text-warning font-cooper leading-none">
                    {totalPoints}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-medium pb-1 font-typewriter">pts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Completed Challenges List */}
          <View className="space-y-3">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg md:text-xl font-bold text-foreground font-cooper">
                Completed Challenges
              </Text>
              {completedChallenges.length > 0 && (
                <Badge variant="outline">
                  <Text className="text-xs font-typewriter">{completedChallenges.length} Total</Text>
                </Badge>
              )}
            </View>

            {completedChallenges.length === 0 ? (
              <View className="bg-card border border-border rounded-lg p-6 items-center">
                <Text className="text-4xl mb-4">🎯</Text>
                <Text className="text-base font-semibold text-foreground font-cooper mb-2 text-center">
                  No completed challenges yet
                </Text>
                <Text className="text-sm text-muted-foreground font-typewriter mb-4 text-center">
                  Start your journey by completing your first challenge!
                </Text>
                <Button
                  className='bg-primary'
                  onPress={() => router.navigate('/challenges')}
                  size="sm"
                >
                  <Text className="text-primary-foreground font-typewriter">Browse Challenges</Text>
                </Button>
              </View>
            ) : (
              <View className="space-y-3">
                {completedChallenges.map((challenge, index) => (
                  <TouchableOpacity
                    key={challenge.challenge_id}
                    onPress={() => handleChallengeClick(challenge)}
                    className="bg-card border border-border rounded-lg p-3 md:p-4 active:bg-muted/50"
                  >
                    <View className="flex-row items-center gap-3">
                      {challenge.challenge_image_url && (
                        <View className="w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            source={{ uri: challenge.challenge_image_url }}
                            alt={challenge.challenge_title}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                      )}

                      <View className="flex-1" style={{ minWidth: 0 }}>
                        <Text
                          className="text-sm md:text-base font-semibold text-card-foreground font-typewriter mb-1"
                          numberOfLines={1}
                        >
                          {challenge.challenge_title}
                        </Text>

                        <View className="flex-row flex-wrap items-center gap-1 mb-1">
                          <Badge
                            variant="outline"
                            className="flex-row items-center bg-success/10 px-2 py-1 min-w-[60px] justify-center"
                          >
                            <CheckCircle size={12} className="text-[hsl(69,82%,45%)] mr-1" />
                            <Text className="text-xs text-[hsl(69,82%,45%)] font-typewriter">
                              {challenge.times_completed}x
                            </Text>
                          </Badge>

                          <Badge
                            variant="outline"
                            className="flex-row items-center bg-warning/10 px-2 py-1 min-w-[60px] justify-center"
                          >
                            <Star size={12} className="text-[hsl(45,93%,35%)] mr-1" />
                            <Text className="text-xs text-[hsl(45,93%,35%)] font-typewriter">
                              {challenge.total_points_earned}
                            </Text>
                          </Badge>

                          {challenge.challenge_repeatable ? (
                            <Badge variant="outline" className="bg-primary/10 px-2 py-1">
                              <Text className="text-xs text-primary font-typewriter">🔄 {challenge.challenge_points}pts</Text>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted/50 px-2 py-1">
                              <Text className="text-xs text-muted-foreground font-typewriter">⭐ One-time</Text>
                            </Badge>
                          )}
                        </View>

                        <Text className="text-xs text-muted-foreground font-typewriter" numberOfLines={1}>
                          First: {new Date(challenge.first_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {challenge.times_completed > 1 && (
                            <> • Latest: {new Date(challenge.last_completed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                          )}
                        </Text>
                      </View>

                      <View className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <Text className="text-xl md:text-2xl font-bold text-primary font-cooper">
                          {challenge.challenge_points}
                        </Text>
                        <Text className="text-[10px] text-muted-foreground font-typewriter">pts/comp</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Reflections Modal */}
      <Dialog open={showReflectionsModal} onOpenChange={setShowReflectionsModal}>
        <DialogContent className="mx-4 md:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex-row items-center gap-2">
              <Sparkles className="text-primary" size={20} />
              <Text className="text-lg font-semibold text-card-foreground font-cooper">
                {selectedChallenge?.challenge_title}
              </Text>
            </DialogTitle>
          </DialogHeader>

          <ScrollView className="max-h-[60vh] pr-2">
            {loadingReflections ? (
              <View className="flex items-center justify-center py-12">
                <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
              </View>
            ) : reflections.length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-4xl mb-4">💭</Text>
                <Text className="text-lg font-semibold text-foreground font-cooper mb-2 text-center">
                  No reflections yet
                </Text>
                <Text className="text-sm text-muted-foreground font-typewriter mb-4 text-center">
                  You completed this challenge without saving reflections.
                </Text>
                <Button
                  size="sm"
                  onPress={() => {
                    setShowReflectionsModal(false);
                    router.navigate(`/challenge/${selectedChallenge?.challenge_id}`);
                  }}
                >
                  <Text className="text-primary-foreground font-typewriter">Try Challenge Again</Text>
                </Button>
              </View>
            ) : (
              <View className="space-y-4">
                {reflections.map((reflection, reflectionIndex) => (
                  <View key={reflection.id} className="bg-card border border-border rounded-lg p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Badge variant="outline">
                        <Text className="text-xs font-typewriter">
                          {new Date(reflection.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </Text>
                      </Badge>
                      {reflections.length > 1 && (
                        <Text className="text-xs text-muted-foreground font-typewriter">
                          Attempt {reflections.length - reflectionIndex}
                        </Text>
                      )}
                    </View>

                    <View className="space-y-3">
                      {Object.entries(reflection.reflections).map(([question, answer], index) => (
                        <View key={index}>
                          <Text className="font-medium text-sm mb-1 text-foreground font-typewriter">
                            {question}
                          </Text>
                          <View className="bg-muted/30 p-3 rounded-lg">
                            <Text className="text-sm text-muted-foreground font-typewriter">
                              {answer}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View className="flex-row gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => setShowReflectionsModal(false)}
            >
              <Text className="text-card-foreground font-typewriter">Close</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                setShowReflectionsModal(false);
                router.navigate(`/challenge/${selectedChallenge?.challenge_id}`);
              }}
            >
              <Text className="text-primary-foreground font-typewriter">View Challenge</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
}