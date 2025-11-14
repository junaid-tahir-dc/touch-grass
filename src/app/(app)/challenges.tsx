import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Filter, Play, Clock, Star, Award, UserIcon } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChallengeRail } from '@/components/ui/challenge-rail';
import { getChallenges, ChallengeItem } from '@/api/challenges';
import { getInProgressChallenges, ChallengeSessionWithChallenge } from '@/api/challengeSessions';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { supabase } from '@/integrations/supabase/client';

export default function Challenges() {
  const router = useRouter();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [allChallenges, setAllChallenges] = useState<ChallengeItem[]>([]);
  const [inProgressChallenges, setInProgressChallenges] = useState<ChallengeSessionWithChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categories = [
    { key: 'all', title: 'All Categories' },
    { key: 'daily', title: 'Replays' },
    { key: 'quick-wins', title: '5 Minute Wins' },
    { key: 'adulting', title: 'Adulting' },
    { key: 'mindset', title: 'Mindset' },
    { key: 'social', title: 'Social' },
    { key: 'outdoors', title: 'Outdoors' },
    { key: 'local', title: 'Local' },
    { key: 'creative', title: 'Creative' },
    { key: 'collab', title: 'Collaboration' }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('[Challenges] Loading data...');
      const [challenges, inProgressRaw] = await Promise.all([
        getChallenges(),
        getInProgressChallenges()
      ]);
      setAllChallenges(challenges);

      console.log('[Challenges] In progress raw:', inProgressRaw.length, inProgressRaw);

      // Use backend result as-is to avoid client clock skew hiding new sessions
      let inProgress = inProgressRaw;

      console.log('[Challenges] Final in progress after filtering:', inProgress.length, inProgress);
      setInProgressChallenges(inProgress);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, []);

  useEffect(() => {
    loadData();

    // Realtime: refresh when session rows change for this user
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('user-challenge-sessions')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_challenge_sessions', filter: `user_id=eq.${user.id}` },
          () => {
            loadData();
          }
        )
        .subscribe();
    };
    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const handleChallengeClick = (challenge: ChallengeItem) => {
    router.navigate(`/challenge/${challenge.id}`);
  };

  const handleBookmarkToggle = (challenge: ChallengeItem) => {
    // Track analytics
    const bookmarked = isBookmarked(challenge.id);
    import('@/services/analytics').then(({ analytics }) => {
      if (bookmarked) {
        analytics.trackUnbookmark('challenge', challenge.id);
      } else {
        analytics.trackBookmark('challenge', challenge.id);
      }
    });

    toggleBookmark({
      id: challenge.id,
      type: 'challenge',
      title: challenge.title
    });
  };

  const handleCategorySelect = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    setShowMobileFilters(false);
  };

  const handleInProgressChallengeClick = (session: ChallengeSessionWithChallenge) => {
    router.navigate(`/challenge/${session.challenge.id}/start`);
  };

  const difficultyColors = {
    easy: 'bg-success/20 text-success-foreground border-success/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    hard: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  // Get completed challenge IDs
  const completedChallengeIds = new Set<string>();

  // Filter challenges from the last 7 days (excluding quick-wins as they have their own category)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentChallenges = allChallenges.filter(challenge =>
    new Date(challenge.created_at) >= sevenDaysAgo &&
    challenge.category !== 'quick-wins'
  );

  // Filter daily repeatable challenges
  const dailyRepeatableChallenges = allChallenges.filter(challenge => challenge.is_repeatable);

  // Group challenges by category
  const challengesByCategory = categories.slice(2).reduce((acc, category) => {
    acc[category.key] = allChallenges.filter(c => c.category === category.key);
    return acc;
  }, {} as Record<string, ChallengeItem[]>);

  // Add daily repeatable as a special category
  challengesByCategory['daily'] = dailyRepeatableChallenges;

  // Filter challenges for search
  const getFilteredChallenges = (challenges: ChallengeItem[]) => {
    if (!searchQuery) return challenges;
    return challenges.filter(challenge =>
      challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      challenge.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Challenges" />
        <View className="flex items-center justify-center py-20">
          <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <Header showLogo showBack={false} leftAction={
          <button
            onClick={() => router.navigate('/profile')}
            className="p-2 hover:bg-muted rounded-xl smooth-transition"
            aria-label="Profile"
          >
            <UserIcon size={20} />

          </button>
        } />
        {/* Mobile Search and Filters */}
        <View className="p-4 border-b border-border bg-card/50 space-y-3 md:hidden">
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <Search size={16} className="text-muted-foreground" />
            </View>
            <TextInput
              placeholder="Search challenges..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-9 bg-card border border-input rounded-lg py-3 px-3 text-foreground font-typewriter"
              placeholderTextColor="hsl(215 20% 30%)"
            />
          </View>

          <View className="flex-row gap-2">
            <Button
              variant="outline"
              onPress={() => setShowMobileFilters(!showMobileFilters)}
              className="flex-1"
            >
              <Filter size={16} className="text-foreground mr-2" />
              <Text className="text-foreground font-typewriter">
                {selectedCategory !== 'all' ? `Filter: ${categories.find(c => c.key === selectedCategory)?.title}` : 'All Categories'}
              </Text>
            </Button>

            <Button
              variant="outline"
              onPress={() => router.navigate('/completed-challenges')}
              className="flex-shrink-0"
            >
              <Award size={16} className="text-foreground" />
            </Button>
          </View>

          {showMobileFilters && (
            <View className="grid grid-cols-2 gap-2 pt-2">
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  onPress={() => handleCategorySelect(category.key)}
                  className={`px-4 py-2 rounded-full border ${selectedCategory === category.key
                    ? 'bg-primary border-primary'
                    : 'bg-card border-border'
                    }`}
                >
                  <Text className={`font-typewriter text-sm ${selectedCategory === category.key
                    ? 'text-primary-foreground'
                    : 'text-foreground'
                    }`}>
                    {category.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Desktop Layout - Only show on desktop */}
        <View className="p-4 space-y-4 hidden md:flex">
          {/* Header */}
          <View className="flex-row items-center justify-between">
          </View>

          {/* Search */}
          <View className="relative">
            <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
              <Search size={16} className="text-muted-foreground" />
            </View>
            <TextInput
              placeholder="Search challenges..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-9 bg-card border border-input rounded-lg py-3 px-3 text-foreground font-typewriter"
              placeholderTextColor="hsl(215 20% 30%)"
            />
          </View>

          {/* Filters + Completed Button in same row */}
          <View className="flex-row items-center justify-between mb-4">
            {/* Scrollable Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-1"
            >
              <View className="flex-row gap-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    onPress={() => handleCategorySelect(category.key)}
                    className={`px-4 py-2 rounded-full border ${selectedCategory === category.key
                      ? 'bg-primary border-primary'
                      : 'bg-card border-border'
                      }`}
                  >
                    <Text
                      className={`font-typewriter text-sm ${selectedCategory === category.key
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                        }`}
                    >
                      {category.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Smaller "Completed" Button */}
            <Button
              variant="outline"
              onPress={() => router.navigate('/completed-challenges')}
              className="ml-2 px-3 py-2 h-auto"
            >
              <Award size={14} className="text-foreground mr-1" />
              <Text className="text-foreground font-typewriter text-sm">Completed</Text>
            </Button>
          </View>
        </View>


        {/* In-Progress Challenges */}
        {inProgressChallenges.length > 0 && (
          <View className="p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Play size={20} className="text-primary" />
              <Text className="text-lg font-semibold text-foreground font-cooper">
                In Progress
              </Text>
            </View>
            <View className="space-y-3">
              {inProgressChallenges.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => handleInProgressChallengeClick(session)}
                  className="bg-card border border-border rounded-lg p-4 active:bg-muted/50"
                >
                  <View className="flex-row items-start gap-3">
                    {session.challenge.image_url && (
                      <View className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          source={{ uri: session.challenge.image_url }}
                          alt={session.challenge.title}
                          className="w-full h-full object-cover"
                        />
                      </View>
                    )}
                    <View className="flex-1" style={{ minWidth: 0 }}>
                      <Text className="font-medium text-card-foreground text-sm mb-1 font-typewriter" numberOfLines={1}>
                        {session.challenge.title}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <View className="flex-row items-center gap-1">
                          <Clock size={12} className="text-muted-foreground" />
                          <Text className="text-xs text-muted-foreground font-typewriter">
                            {session.challenge.duration_minutes}m
                          </Text>
                        </View>
                        <Badge className={`${difficultyColors[session.challenge.difficulty]} py-0 px-2`}>
                          <Text className="text-xs font-typewriter capitalize">
                            {session.challenge.difficulty}
                          </Text>
                        </Badge>
                        <View className="flex-row items-center gap-1">
                          <Star size={12} className="text-muted-foreground" />
                          <Text className="text-xs text-muted-foreground font-typewriter">
                            {session.challenge.points}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Button size="sm" variant="outline">
                      <Text className="text-xs font-typewriter">Continue</Text>
                    </Button>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Mobile Challenge Rails */}
        <View className="py-4">
          {selectedCategory === 'all' ? (
            <>
              {/* New Challenges Rail */}
              {recentChallenges.length > 0 && (
                <ChallengeRail
                  key="recent"
                  title="New Challenges"
                  challenges={getFilteredChallenges(recentChallenges)}
                  onChallengeClick={handleChallengeClick}
                  onBookmarkToggle={handleBookmarkToggle}
                  isBookmarked={isBookmarked}
                  completedChallenges={completedChallengeIds}
                  size="compact"
                />
              )}
              {/* Replays - Condensed Horizontal Strip */}
              {dailyRepeatableChallenges.length > 0 && (
                <View className="mb-6 px-4">
                  <Text className="text-base font-bold text-foreground font-cooper mb-3">Replays</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-2">
                    <View className="flex-row gap-3">
                      {getFilteredChallenges(dailyRepeatableChallenges).map((challenge) => (
                        <TouchableOpacity
                          key={challenge.id}
                          onPress={() => handleChallengeClick(challenge)}
                          className="group relative flex-shrink-0 active:scale-95"
                        >
                          <View className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-border active:border-primary">
                            {challenge.image_url ? (
                              <Image
                                source={{ uri: challenge.image_url }}
                                alt={challenge.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <View className="w-full h-full bg-primary flex items-center justify-center">
                                <Star className="text-primary-foreground" size={20} />
                              </View>
                            )}
                          </View>
                          <View className="absolute -bottom-1 -right-1 bg-primary rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                            <Text className="text-primary-foreground text-xs font-typewriter font-bold">
                              {challenge.points}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
              {/* All categories as horizontal rails */}
              {categories.slice(2).map((category) => {
                const categoryChallenges = getFilteredChallenges(challengesByCategory[category.key]);
                if (categoryChallenges.length === 0) return null;
                return (
                  <ChallengeRail
                    key={category.key}
                    title={category.title}
                    challenges={categoryChallenges}
                    onChallengeClick={handleChallengeClick}
                    onBookmarkToggle={handleBookmarkToggle}
                    isBookmarked={isBookmarked}
                    completedChallenges={completedChallengeIds}
                    size="compact"
                  />
                );
              })}
            </>
          ) : (
            // Show selected category as a rail
            <ChallengeRail
              title={categories.find(c => c.key === selectedCategory)?.title || ''}
              challenges={getFilteredChallenges(challengesByCategory[selectedCategory] || [])}
              onChallengeClick={handleChallengeClick}
              onBookmarkToggle={handleBookmarkToggle}
              isBookmarked={isBookmarked}
              completedChallenges={completedChallengeIds}
              size="compact"
            />
          )}
        </View>

        {/* Empty State */}
        {(allChallenges.length === 0 && !loading) && (
          <View className="items-center justify-center py-20">
            <Text className="text-4xl mb-4">🌱</Text>
            <Text className="text-muted-foreground font-typewriter">No challenges available yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}