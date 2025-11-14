import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Clock,
  Star,
  Users,
  Play,
  Bookmark,
  CheckCircle,
  Camera,
  Video,
  Repeat,
  ChevronLeft
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getChallengeById, ChallengeItem } from '@/api/challenges';
import { Challenge } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { getActiveChallengeSession, startChallengeSession } from '@/api/challengeSessions';

const difficultyColors = {
  easy: 'bg-success/20 text-success-foreground border-success/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  hard: 'bg-destructive/10 text-destructive border-destructive/20'
};

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    const loadChallenge = async () => {
      if (!id) return;

      try {
        const challengeData = await getChallengeById(id);
        setChallenge(challengeData);

        // Check if there's an active session for this challenge
        if (challengeData) {
          const activeSession = await getActiveChallengeSession(challengeData.id);
          setHasActiveSession(!!activeSession);
        }
      } catch (error) {
        toast({
          title: "Challenge not found",
          description: "This challenge might have been moved or deleted",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id]);

  const handleStart = async () => {
    if (challenge) {
      // Track analytics
      const { analytics } = await import('@/services/analytics');
      analytics.trackChallengeView(challenge.id, challenge.title);
      analytics.trackChallengeStart(challenge.id, challenge.title);

      try {
        await startChallengeSession(challenge.id);
      } catch (e) {
        console.error('Failed to start session:', e);
      }
      router.push(`/challenge/${challenge.id}/start`);
    }
  };

  const handleBookmark = () => {
    if (challenge) {
      toggleBookmark({
        id: challenge.id,
        type: 'challenge',
        title: challenge.title
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex-1 items-center justify-center py-20">
          <Text className="text-4xl mb-4">🤔</Text>
          <Text className="text-muted-foreground">Challenge not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-subtle pb-20">
      <Header showBack />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      >
        {/* Mobile Layout */}
        <View className="space-y-6">
          {/* Title and Badges */}
          <View className="space-y-4">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="text-3xl font-bold leading-tight flex-1 font-typewriter">
                {challenge.title}
              </Text>
              <TouchableOpacity
                onPress={handleBookmark}
                className="w-10 h-10 items-center justify-center rounded-full hover:bg-accent flex-shrink-0"
              >
                <Bookmark
                  size={20}
                  color={isBookmarked(challenge.id) ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                  fill={isBookmarked(challenge.id) ? 'hsl(var(--primary))' : 'transparent'}
                />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap items-center gap-3">
              <View className={`px-3 py-1.5 rounded-full border ${difficultyColors[challenge.difficulty]}`}>
                <Text className="text-sm font-medium font-typewriter capitalize">
                  {challenge.difficulty}
                </Text>
              </View>
              <View className="px-3 py-1.5 rounded-full bg-secondary border border-secondary">
                <Text className="text-sm font-medium font-typewriter capitalize text-secondary-foreground">
                  {challenge.category}
                </Text>
              </View>
              {challenge.is_repeatable && (
                <View className="px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10">
                  <View className="flex-row items-center">
                    <Repeat size={14} color="hsl(var(--primary))" className="mr-1.5" />
                    <Text className="text-sm font-medium font-typewriter text-primary">
                      Repeatable
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Quick Stats Grid */}
          <View className="flex-row gap-4">
            <Card className="flex-1 p-4 card-gradient items-center">
              <Clock size={24} color="hsl(var(--primary))" className="mb-2" />
              <Text className="text-lg font-bold font-typewriter">{challenge.duration_minutes}m</Text>
              <Text className="text-xs text-muted-foreground font-typewriter">Duration</Text>
            </Card>
            <Card className="flex-1 p-4 card-gradient items-center">
              <Star size={24} color="hsl(var(--warning))" className="mb-2" />
              <Text className="text-lg font-bold font-typewriter">{challenge.points}</Text>
              <Text className="text-xs text-muted-foreground font-typewriter">XP Points</Text>
            </Card>
            <Card className="flex-1 p-4 card-gradient items-center">
              <Users size={24} color="hsl(var(--secondary))" className="mb-2" />
              <Text className="text-lg font-bold font-typewriter capitalize">{challenge.difficulty}</Text>
              <Text className="text-xs text-muted-foreground font-typewriter">Difficulty</Text>
            </Card>
          </View>

          {/* Media Requirement Badge */}
          {challenge.media_requirement !== 'none' && (
            <Card className="p-4 card-gradient">
              <View className="flex-row items-center justify-center gap-3">
                {challenge.media_requirement === 'photo' ? (
                  <>
                    <Camera size={20} color="hsl(var(--primary))" />
                    <Text className="text-sm font-medium font-typewriter">Photo Required</Text>
                  </>
                ) : (
                  <>
                    <Video size={20} color="hsl(var(--primary))" />
                    <Text className="text-sm font-medium font-typewriter">Video Required</Text>
                  </>
                )}
              </View>
            </Card>
          )}

          {/* Hero Image */}
          <View className="aspect-[4/3] bg-muted relative overflow-hidden rounded-xl shadow-elegant">
            {challenge.image_url ? (
              <Image
                source={{ uri: challenge.image_url }}
                alt={challenge.title}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-gradient-primary items-center justify-center">
                <Star size={64} color="hsl(var(--primary-foreground))" />
              </View>
            )}
          </View>

          {/* Description */}
          <Card className="p-6 card-gradient">
            <Text className="text-xl font-bold mb-4 text-foreground font-typewriter">What You'll Do</Text>
            <Text className="text-base text-muted-foreground leading-relaxed font-typewriter">
              {challenge.description}
            </Text>
          </Card>

          {/* Materials */}
          {challenge.materials && challenge.materials.length > 0 && (
            <Card className="p-6 card-gradient">
              <Text className="text-xl font-bold mb-4 text-foreground font-typewriter">What You'll Need</Text>
              <View className="gap-4">
                {challenge.materials.map((material, index) => (
                  <View key={index} className="flex-row items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <CheckCircle size={20} color="hsl(var(--primary))" className="mt-0.5 flex-shrink-0" />
                    <Text className="text-muted-foreground leading-relaxed text-sm font-typewriter flex-1">
                      {material}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Safety Note */}
          {challenge.safety_note && (
            <Card className="p-6 card-gradient border-warning/20 bg-warning/5">
              <View className="flex-row items-start gap-4">
                <View className="w-10 h-10 bg-warning/20 rounded-xl items-center justify-center flex-shrink-0">
                  <Text className="text-warning text-base">⚠️</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold mb-2 text-warning font-typewriter">Safety Note</Text>
                  <Text className="text-muted-foreground leading-relaxed text-base font-typewriter">
                    {challenge.safety_note}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Fun Enhancements */}
          {challenge.fun_enhancements && challenge.fun_enhancements.length > 0 && (
            <Card className="p-6 card-gradient border-secondary/20 bg-secondary/5">
              <Text className="text-xl font-bold mb-4 text-foreground font-typewriter">Fun Enhancements ✨</Text>
              <View className="gap-4">
                {challenge.fun_enhancements.map((enhancement, index) => (
                  <View key={index} className="flex-row items-start gap-3 p-4 rounded-lg bg-secondary/10">
                    <Star size={20} color="hsl(var(--secondary))" className="mt-1 flex-shrink-0" />
                    <Text className="text-muted-foreground leading-relaxed text-base font-typewriter flex-1">
                      {enhancement}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Community Info */}
          <Card className="p-6 card-gradient border-primary/20 bg-primary/5">
            <View className="flex-row items-start gap-4">
              <View className="w-10 h-10 bg-primary/20 rounded-xl items-center justify-center flex-shrink-0">
                <Users size={24} color="hsl(var(--primary))" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold mb-2 text-primary font-typewriter">Join the Community</Text>
                <Text className="text-muted-foreground leading-relaxed text-base font-typewriter">
                  When you start this challenge, you'll automatically join the challenge discussion where you can connect with others, share progress, and get support from fellow participants.
                </Text>
              </View>
            </View>
          </Card>

          <View className="pt-4">
            <Button
              onPress={handleStart}
              className="w-full bg-primary hover:opacity-90 py-4 flex-row items-center justify-center gap-3"
              size="lg"
            >
              <Play size={20} color="black" />
              <Text className="text-base font-medium font-typewriter">
                Start Challenge
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}