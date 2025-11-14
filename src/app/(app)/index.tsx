import React, { useState, useEffect } from 'react';
import { Flame, Plus, Bookmark, MoreHorizontal, Trash2, X, Crown, Target, Play, Clock, Star, User as UserIcon } from 'lucide-react';
import { getTodayChallenge, getChallengesByRail } from '@/api/mock';
import { getInProgressChallenges, ChallengeSessionWithChallenge } from '@/api/challengeSessions';
import { getChallenges } from '@/api/challenges';
import { getCurrentUserProfile, UserProfile } from '@/api/user';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";
import { ChallengeItem } from '@/api/challenges';
// import { Badge } from '@/components/ui/badge';
import { Challenge } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { supabase } from '@/integrations/supabase/client';
import { Link, useRouter } from 'expo-router';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui';
import { navigate } from 'expo-router/build/global-state/routing';
import { ChallengeRail } from '@/components/ui/challenge-rail';
import { Card } from '@/components/ui/card';
import { NewChallengesCarousel } from '@/components/NewChallengesCarousel';
import { Badge } from '@/components/ui/badge';
import { FeaturesComingSoonModal } from '@/components/ui/features-coming-soon-modal';
import { FollowersModal } from '@/components/FollowersModal';
import RadarProfileChart from '@/components/RadarChart';
import HomeCardCarousel from '@/components/Challenges';
import LatestUpdates from '@/components/LatestUpdates';

export default function Feeds() {
  const router = useRouter();
  const [newChallenges, setNewChallenges] = useState<ChallengeItem[]>([]);
  const [quickWinsChallenges, setQuickWinsChallenges] = useState<ChallengeItem[]>([]);
  const [inProgressChallenges, setInProgressChallenges] = useState<ChallengeSessionWithChallenge[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedChallenges, setCompletedChallenges] = useState(0);
  const [savedChallengeData, setSavedChallengeData] = useState<{ [key: string]: ChallengeItem }>({});
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, addBookmarkSilent, removeBookmarkSilent } = useBookmarks();
  const challengeData = [
    {
      id: "1",
      title: "WHIMSY DAY 1 - INDOOR PICNIC",
      image: require("../../../assets/test.jpg"),
      description:
        "Spread a blanket on the floor, gather favorite snacks, and picnic indoors like it’s a tiny holiday.",
      time: "5m",
      difficulty: "EASY",
    },
    {
      id: "2",
      title: "WHIMSY DAY 2 - NATURE BREAK",
      image: require("../../../assets/test.jpg"),
      description:
        "Spread a blanket on the floor, gather favorite snacks, and picnic indoors like it’s a tiny holiday.",
      time: "5m",
      difficulty: "EASY",
    },
    {
      id: "3",
      title: "WHIMSY DAY 3 - DIGITAL DETOX",
      image: require("../../../assets/test.jpg"),
      description:
        "Spread a blanket on the floor, gather favorite snacks, and picnic indoors like it’s a tiny holiday.",
      time: "10m",
      difficulty: "EASY",
    },
  ];

  const fitnessData = [
    {
      id: "1",
      title: "Take a walk around the block",
      image: require("../../../assets/test.jpg"),
      time: "5m",
      difficulty: "EASY",
    },
    {
      id: "2",
      title: "Take a walk around the block",
      image: require("../../../assets/test.jpg"),
      time: "5m",
      difficulty: "EASY",
    },
    {
      id: "3",
      title: "Take a walk around the block",
      image: require("../../../assets/test.jpg"),
      time: "10m",
      difficulty: "EASY",
    },
  ];

  // Filter saved challenges from bookmarks
  const savedChallenges = bookmarks.filter(bookmark => bookmark.type === 'challenge');

  const handleClearAllSaved = () => {
    savedChallenges.forEach(challenge => {
      removeBookmark(challenge.id);
    });
    toast({
      title: "Cleared all saved challenges",
      description: "All saved challenges have been removed"
    });
  };

  const handleRemoveChallenge = (challengeId: string, challengeTitle: string) => {
    removeBookmark(challengeId);
    toast({
      title: "Challenge removed",
      description: `${challengeTitle} has been removed from your saved challenges`
    });
  };

  const refreshProfileCounts = async () => {
    try {
      const profile = await getCurrentUserProfile();
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load real user profile from Supabase
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);

        // Load most recent challenges from Supabase and in-progress challenges
        const [featuredChallenges, inProgress] = await Promise.all([
          getChallenges(),
          getInProgressChallenges()
        ]);

        // Filter challenges from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Filter quick-wins challenges from the last 7 days
        const quickWins = featuredChallenges.filter(challenge =>
          challenge.category === 'quick-wins' &&
          new Date(challenge.created_at) >= sevenDaysAgo
        );

        // Filter recent challenges (excluding quick-wins since they have their own section)
        const recentChallenges = featuredChallenges.filter(challenge =>
          new Date(challenge.created_at) >= sevenDaysAgo &&
          challenge.category !== 'quick-wins'
        );

        setNewChallenges(recentChallenges);
        setQuickWinsChallenges(quickWins);
        setInProgressChallenges(inProgress);

        // Count completed challenges and total XP from actual sessions
        if (profile?.user_id) {
          const { data: completedSessions, error: sessionsError } = await supabase
            .from('user_challenge_sessions')
            .select('id, points_awarded')
            .eq('user_id', profile.user_id)
            .not('completed_at', 'is', null);

          if (!sessionsError && completedSessions) {
            setCompletedChallenges(completedSessions.length);

            // Calculate actual total XP from awarded points
            const actualTotalXP = completedSessions.reduce((sum, session) => {
              return sum + (session.points_awarded || 0);
            }, 0);

            // Update profile display with actual XP
            if (profile && actualTotalXP !== profile.total_xp) {
              setUserProfile({
                ...profile,
                total_xp: actualTotalXP
              });
            }
          } else {
            setCompletedChallenges(0);
          }
        }
      } catch (error) {
        toast({
          title: "Error loading data",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Realtime: refresh when session rows change for this user
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('user-challenge-sessions-home')
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

    const onChanged = () => loadData();
    window.addEventListener('challenge-sessions-changed', onChanged);
    document.addEventListener('visibilitychange', onChanged);
    window.addEventListener('focus', onChanged);

    return () => {
      window.removeEventListener('challenge-sessions-changed', onChanged);
      document.removeEventListener('visibilitychange', onChanged);
      window.removeEventListener('focus', onChanged);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Separate effect to load saved challenge data when bookmarks change
  useEffect(() => {
    const loadSavedChallengeData = async () => {
      if (savedChallenges.length === 0) {
        setSavedChallengeData({});
        return;
      }

      try {
        const allChallenges = await getChallenges();
        const savedData: { [key: string]: ChallengeItem } = {};

        console.log('Saved challenges:', savedChallenges);
        console.log('All challenges:', allChallenges);

        savedChallenges.forEach(bookmark => {
          if (isUUID(bookmark.id)) {
            const challenge = allChallenges.find(c => c.id === bookmark.id);
            if (challenge) {
              console.log('Found challenge for bookmark:', challenge.title, 'Image URL:', challenge.image_url);
              savedData[bookmark.id] = challenge;
            }
          }
        });

        console.log('Saved challenge data:', savedData);
        setSavedChallengeData(savedData);
      } catch (error) {
        console.error('Error loading saved challenge data:', error);
      }
    };

    loadSavedChallengeData();
  }, [bookmarks]);

  const isUUID = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const handleBookmarkToggle = (challenge: ChallengeItem) => {
    toggleBookmark({
      id: challenge.id,
      type: 'challenge',
      title: challenge.title
    });
  };

  const handleInProgressChallengeClick = (session: ChallengeSessionWithChallenge) => {
    router.push(`/challenge/${session.challenge.id}/start`);
  };

  const difficultyColors = {
    easy: 'bg-success/20 text-success-foreground border-success/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    hard: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  const handleOpenSavedChallenge = async (bookmark: { id: string; title: string }) => {
    // If already a UUID, navigate directly
    if (isUUID(bookmark.id)) {
      router.push(`/challenge/${bookmark.id}`);
      return;
    }

    // Try to resolve by title from Supabase
    try {
      const all = await getChallenges();
      const match = all.find((c) => c.title.trim().toLowerCase() === bookmark.title.trim().toLowerCase());
      if (match) {
        // Migrate bookmark to UUID silently so it works next time
        removeBookmarkSilent(bookmark.id);
        addBookmarkSilent({ id: match.id, type: 'challenge', title: match.title });
        router.push(`/challenge/${match.id}`);
        return;
      }

      toast({
        title: 'Challenge not found',
        description: 'We could not match this saved challenge to current content.',
        variant: 'destructive'
      });
    } catch (e) {
      toast({
        title: 'Error opening challenge',
        description: 'Please try again in a moment.',
        variant: 'destructive'
      });
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle scrollable">
        {/* <Header showLogo showBack={false} leftAction={
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 hover:bg-muted rounded-xl smooth-transition"
            aria-label="Profile"
          >
            <UserIcon size={20} />
          </button>
        } /> */}
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (

    <ScrollView className="min-h-screen bg-gradient-subtle pb-20 lg:pb-0">
      <Header showLogo showBack={false} leftAction={
        <button
          onClick={() => router.navigate('/profile')}
          className="p-2 hover:bg-muted rounded-xl smooth-transition"
          aria-label="Profile"
        >
          <UserIcon size={20} />

        </button>
      } />

      {/* Desktop Layout */}
      <View className="hidden lg:flex">
        <View className="max-w-6xl mx-auto p-8">
          {/* Profile Header */}

          <View className="items-center mb-8">
            <TouchableOpacity
              className="w-24 h-24 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center mb-4 overflow-hidden shadow-lg"
              onPress={() => router.navigate(`/user/${userProfile?.user_id}`)}
              accessibilityRole="button"
              accessibilityLabel="View your public profile"
            >
              {userProfile?.avatar_url && userProfile.avatar_url.startsWith('http') ? (
                <Image
                  source={{ uri: userProfile.avatar_url }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : userProfile?.avatar_url ? (
                <Text className="text-2xl font-bold text-white">
                  {userProfile.avatar_url}
                </Text>
              ) : (
                <Text className="text-2xl font-bold text-white">
                  {Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) === 1 ? '🌱' :
                    Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 3 ? '🌿' :
                      Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 5 ? '🌳' :
                        Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 7 ? '🏔️' : '⭐'}
                </Text>
              )}
            </TouchableOpacity>

            <Text className="text-4xl font-cooper-bold mb-2">
              Hey {userProfile?.username || userProfile?.display_name?.split(' ')[0] || 'friend'}! 👋
            </Text>
            <Text className="text-muted-foreground font-typewriter text-lg mb-3">
              Ready to Touch Grass today?
            </Text>

            <View className="flex-row items-center justify-center gap-6">
              <TouchableOpacity
                onPress={() => setFollowersModalOpen(true)}
                className="flex-row items-center gap-1"
              >
                <Text className="font-semibold">{userProfile?.follower_count || 0}</Text>
                <Text className="text-muted-foreground font-typewriter">Followers</Text>
              </TouchableOpacity>

              <View className="h-4 w-px bg-border" />

              <TouchableOpacity
                onPress={() => setFollowingModalOpen(true)}
                className="flex-row items-center gap-1"
              >
                <Text className="font-semibold">{userProfile?.following_count || 0}</Text>
                <Text className="text-muted-foreground font-typewriter">Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Card */}
          <View className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl p-6 mb-8 shadow-sm">
            <View className="flex-row items-center justify-center gap-12">
              <TouchableOpacity
                onPress={() => router.navigate('/completed-challenges')}
                className="items-center"
              >
                <Text className="text-2xl mb-1">🌟</Text>
                <Text className="text-3xl font-bold mb-1">
                  {Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 100)}
                </Text>
                <Text className="text-sm text-muted-foreground font-typewriter">Level</Text>
              </TouchableOpacity>

              <View className="items-center">
                <Text className="text-2xl mb-1">⭐</Text>
                <Text className="text-3xl font-bold mb-1">{userProfile?.total_xp || 0}</Text>
                <Text className="text-sm text-muted-foreground font-typewriter">Total XP</Text>
              </View>

              <View className="items-center">
                <Text className="text-2xl mb-1">🏆</Text>
                <Text className="text-3xl font-bold mb-1">{completedChallenges}</Text>
                <Text className="text-sm text-muted-foreground font-typewriter">Completed</Text>
              </View>

              <View className="items-center">
                <Text className="text-2xl mb-1">🔥</Text>
                <Text className="text-3xl font-bold mb-1">{userProfile?.current_streak || 0}</Text>
                <Text className="text-sm text-muted-foreground font-typewriter">Day Streak</Text>
              </View>
            </View>
          </View>

          {/* Grid Layout */}
          <View className="flex-row gap-8">
            <View className="flex-2 gap-6">
              {quickWinsChallenges.length > 0 && (
                <ChallengeRail
                  title="⚡ 5 Minute Wins"
                  challenges={quickWinsChallenges}
                  onChallengeClick={(challenge) => router.navigate(`/challenge/${challenge.id}`)}
                  onBookmarkToggle={handleBookmarkToggle}
                  isBookmarked={isBookmarked}
                  size="compact"
                  hideMetadata={false}
                />
              )}


              <NewChallengesCarousel
                challenges={newChallenges}
                onBookmarkToggle={handleBookmarkToggle}
                isBookmarked={isBookmarked}
              />


              <Card className="p-6 border border-border/50">
                <Text className="font-semibold mb-3 text-xl">Continue Your Journey</Text>
                <Text className="text-muted-foreground mb-6">
                  Explore themed challenge series and build lasting habits
                </Text>
                <Button
                  variant="secondary"
                  onPress={() => router.navigate('/challenges')}
                  className="w-full bg-[#f5a300] h-12"
                >
                  <Text className="text-white text-lg">View All Challenges</Text>
                </Button>
              </Card>
            </View>

            <View className="flex-1 gap-6">
              <View>
                <View className="flex-row items-center gap-2 mb-4">
                  <Play size={20} color="hsl(var(--primary))" />
                  <Text className="text-lg font-bold font-cooper uppercase">In Progress</Text>
                </View>
                {inProgressChallenges.length > 0 ? (
                  <View className="gap-3">
                    {inProgressChallenges.map((session) => (
                      <Card
                        key={session.id}
                        className="p-4 border border-border/50"
                      >
                        <TouchableOpacity onPress={() => handleInProgressChallengeClick(session)}>
                          <Text className="font-medium mb-2 text-sm" numberOfLines={2}>
                            {session.challenge.title}
                          </Text>
                          <View className="flex-row items-center justify-between mb-3">
                            <View className="flex-row items-center gap-1">
                              <Clock size={12} />
                              <Text className="text-xs text-muted-foreground">
                                {session.challenge.duration_minutes}m
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <Star size={12} />
                              <Text className="text-xs text-muted-foreground">
                                {session.challenge.points}
                              </Text>
                            </View>
                          </View>
                          <Button variant="outline" size="sm" className="w-full">
                            <Text className="text-xs">Continue</Text>
                          </Button>
                        </TouchableOpacity>
                      </Card>
                    ))}
                  </View>
                ) : (
                  <Card className="p-6 border border-border/50 items-center">
                    <Text className="text-4xl mb-3">🎯</Text>
                    <Text className="text-sm text-muted-foreground mb-4 text-center">
                      No challenges in progress
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => router.navigate('/challenges')}
                    >
                      <Text className="text-xs">Start One</Text>
                    </Button>
                  </Card>
                )}
              </View>

              <View className="gap-3">
                <Button
                  variant="outline"
                  onPress={() => router.navigate('/leaderboard')}
                  className="w-full justify-start gap-2"
                >
                  <Crown size={18} />
                  <Text>Leaderboard</Text>
                </Button>
                <Button
                  variant="outline"
                  onPress={() => router.navigate('/bookmarks')}
                  className="w-full justify-start gap-2"
                >
                  <Bookmark size={18} />
                  <Text>My Bookmarks</Text>
                </Button>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View className="lg:hidden px-4 py-4">
        <RadarProfileChart userProfile={userProfile} />

        <View className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-lg gap-6">
          {/* Profile Card */}
          <Card className="p-6 border-2 border-secondary">
            <View className="items-center">
              <TouchableOpacity
                className="w-16 h-16 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center mb-3 overflow-hidden shadow-lg"
                onPress={() => router.navigate(`/user/${userProfile?.user_id}`)}
                accessibilityRole="button"
                accessibilityLabel="View your public profile"
              >
                {userProfile?.avatar_url && userProfile.avatar_url.startsWith('http') ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : userProfile?.avatar_url ? (
                  <Text className="text-2xl font-bold text-white">
                    {userProfile.avatar_url}
                  </Text>
                ) : (
                  <Text className="text-2xl font-bold text-white">
                    {Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) === 1 ? '🌱' :
                      Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 3 ? '🌿' :
                        Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 5 ? '🌳' :
                          Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10) <= 7 ? '🏔️' : '⭐'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text className="text-4xl font-cooper mb-2">
                Hey {userProfile?.username || userProfile?.display_name?.split(' ')[0] || 'friend'}! 👋
              </Text>
              <Text className="text-muted-foreground font-typewriter text-lg mb-3">
                Ready to Touch Grass today?
              </Text>
              <View className="flex-row items-center justify-center gap-6">
                <TouchableOpacity
                  onPress={() => setFollowersModalOpen(true)}
                  className="flex-row items-center gap-1"
                >
                  <Text className="font-semibold font-typewriter">{userProfile?.follower_count || 0}</Text>
                  <Text className="text-muted-foreground font-typewriter">Followers</Text>
                </TouchableOpacity>
                <View className="h-4 w-px bg-border" />
                <TouchableOpacity
                  onPress={() => setFollowingModalOpen(true)}
                  className="flex-row items-center gap-1"
                >
                  <Text className="font-semibold font-typewriter">{userProfile?.following_count || 0}</Text>
                  <Text className="text-muted-foreground font-typewriter">Following</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          <HomeCardCarousel data={challengeData} title='New Self Care Challenges' icon={<MaterialIcons name="self-improvement" size={24} color="#777" />} color="#66E5E5" width={300} />

          <HomeCardCarousel data={fitnessData} title='Quick Fitness Wins' icon={<MaterialIcons name="fitness-center" size={24} color="#777" />} color="lightyellow" width={200} />

          <LatestUpdates />

          {/* Progress Overview */}
          <View className="p-4 border-b border-border bg-background/50">
            <View className="flex-row items-center gap-2 mb-4">
              <Crown color="orange" size={20} />
              <Text className="text-lg font-bold font-cooper-bold uppercase">Progress Overview</Text>
            </View>
            <View className="items-center mb-6">
              <TouchableOpacity
                onPress={() => router.navigate('/completed-challenges')}
                className="relative mb-3"
              >
                <View className="w-16 h-16 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center shadow-lg border-2 border-primary/20">
                  <View className="items-center">
                    <Text className="text-black font-bold text-lg font-typewriter">
                      {Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 1, 10)}
                    </Text>
                    <Text className="text-black/80 text-xs font-medium font-typewriter">LVL</Text>
                  </View>
                </View>
                <View className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full items-center justify-center shadow-sm">
                  <Text className="text-sm">✨</Text>
                </View>
              </TouchableOpacity>

              <View className="w-32 bg-muted rounded-full h-3 overflow-hidden shadow-inner mb-2">
                <View
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  style={{
                    width: `${((userProfile?.total_xp || 0) % 100)}%`,
                  }}
                />
              </View>
              <Text className="text-xs text-muted-foreground font-medium mb-4 font-typewriter">
                {(userProfile?.total_xp || 0) % 100}/100 XP to level {Math.min(Math.floor((userProfile?.total_xp || 0) / 100) + 2, 100)}
              </Text>
            </View>

            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 items-center p-3 bg-background/50 rounded-lg">
                <Text className="text-xl mb-1">⭐</Text>
                <Text className="font-bold text-lg font-typewriter">{userProfile?.total_xp || 0}</Text>
                <Text className="text-xs text-muted-foreground font-typewriter">Total XP</Text>
              </View>

              <View className="flex-1 items-center p-3 bg-background/50 rounded-lg">
                <Text className="text-xl mb-1">🏆</Text>
                <Text className="font-bold text-lg font-typewriter">{completedChallenges}</Text>
                <Text className="text-xs text-muted-foreground font-typewriter">Completed</Text>
              </View>

              <View className="flex-1 items-center p-3 bg-background/50 rounded-lg">
                <Text className="text-xl mb-1">🔥</Text>
                <Text className="font-bold text-lg font-typewriter">{userProfile?.current_streak || 0}</Text>
                <Text className="text-xs text-muted-foreground font-typewriter">Day Streak</Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.navigate('/leaderboard')}
                className="flex-1 bg-yellow-500/10 border-yellow-500/30"
              >
                <Crown size={14} className="mr-1 text-yellow-700" />
                <Text className="text-yellow-700 font-typewriter">Leaderboard</Text>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowFeaturesModal(true)}
                className="flex-1 bg-success/10 border-success/30"
              >
                <Target size={14} color="hsl(69,82%,35%)" className="mr-2" />
                <Text className="text-[hsl(69,82%,35%)] font-typewriter">Badges</Text>
              </Button>
            </View>
          </View>

          {/* Quick Wins Section */}
          {quickWinsChallenges.length > 0 && (
            <View className="-mx-4">
              <ChallengeRail
                title="⚡ 5 Minute Wins"
                challenges={quickWinsChallenges}
                onChallengeClick={(challenge) => router.navigate(`/challenge/${challenge.id}`)}
                onBookmarkToggle={handleBookmarkToggle}
                isBookmarked={isBookmarked}
                size="compact"
                hideMetadata={false}
              />
            </View>
          )}

          {/* New Challenges Carousel */}
          <NewChallengesCarousel
            challenges={newChallenges}
            onBookmarkToggle={handleBookmarkToggle}
            isBookmarked={isBookmarked}
          />

          {/* In Progress Section */}
          <View className="px-4 py-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Play size={20} color="hsl(var(--primary))" />
              <Text className="text-lg font-bold font-cooper uppercase">In Progress</Text>
            </View>
            {inProgressChallenges.length > 0 ? (
              <View className="gap-3">
                {inProgressChallenges.map((session) => (
                  <Card
                    key={session.id}
                    className="p-4"
                  >
                    <TouchableOpacity onPress={() => handleInProgressChallengeClick(session)}>
                      <View className="flex-row items-start gap-3">
                        {session.challenge.image_url && (
                          <View className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                            <Image
                              source={{ uri: session.challenge.image_url }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="font-medium text-sm mb-1 font-typewriter" numberOfLines={1}>
                            {session.challenge.title}
                          </Text>
                          <View className="flex-row items-center gap-2">
                            <View className="flex-row items-center gap-1">
                              <Clock size={12} />
                              <Text className="text-xs text-muted-foreground font-typewriter">
                                {session.challenge.duration_minutes}m
                              </Text>
                            </View>
                            <Badge className={difficultyColors[session.challenge.difficulty as keyof typeof difficultyColors]}>
                              <Text className="text-xs font-typewriter">{session.challenge.difficulty}</Text>
                            </Badge>
                            <View className="flex-row items-center gap-1">
                              <Star size={12} />
                              <Text className="text-xs text-muted-foreground font-typewriter">
                                {session.challenge.points}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Button size="sm" variant="outline" className="min-w-[70px]">
                          <Text className="text-xs font-typewriter">Continue</Text>
                        </Button>
                      </View>
                    </TouchableOpacity>
                  </Card>
                ))}
              </View>
            ) : (
              <Card className="p-6 items-center">
                <Text className="text-4xl mb-3">🎯</Text>
                <Text className="text-sm text-muted-foreground mb-4 text-center font-typewriter">
                  No challenges in progress yet
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.navigate('/challenges')}
                >
                  <Text className="text-xs font-typewriter">Start a Challenge</Text>
                </Button>
              </Card>
            )}
          </View>

          {/* Bookmarks Button */}
          <View className="gap-4">
            <Button
              variant="outline"
              onPress={() => router.navigate('/bookmarks')}
              className="h-20 flex-col gap-2 px-4 py-3"
            >
              <Bookmark size={20} />
              <Text className="text-sm font-typewriter">My Bookmarks</Text>
            </Button>
          </View>

          {/* Continue Your Journey */}
          <Card className="p-4">
            <Text className="font-semibold mb-3 font-typewriter">Continue Your Journey</Text>
            <Text className="text-sm text-muted-foreground mb-4 font-typewriter">
              Explore themed challenge series and build lasting habits
            </Text>
            <Button
              variant="secondary"
              onPress={() => router.navigate('/challenges')}
              className="w-full bg-[#f5a300] h-12 px-6 py-3"
            >
              <Text className="text-white font-typewriter">View Challenges</Text>
            </Button>
          </Card>
        </View>
      </View>

      <FeaturesComingSoonModal
        isOpen={showFeaturesModal}
        onClose={() => setShowFeaturesModal(false)}
      />

      {userProfile && (
        <>
          <FollowersModal
            open={followersModalOpen}
            onOpenChange={setFollowersModalOpen}
            userId={userProfile.user_id}
            type="followers"
            title="Followers"
            onCountsUpdate={refreshProfileCounts}
          />
          <FollowersModal
            open={followingModalOpen}
            onOpenChange={setFollowingModalOpen}
            userId={userProfile.user_id}
            type="following"
            title="Following"
            onCountsUpdate={refreshProfileCounts}
          />
        </>
      )}
    </ScrollView>
  );
}