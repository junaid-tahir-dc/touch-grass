import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Crown, Trophy, Medal, Flame, Star, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'expo-router';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface LeaderboardUser {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url?: string;
  follower_count: number;
  total_xp: number;
  completed_challenges: number;
  current_streak: number;
  last_seen_at?: string | null;
  is_online?: boolean;
}

export default function Leaderboard() {
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'xp' | 'challenges'>('xp');

  useEffect(() => {
    loadLeaderboardData();
    
    // Track analytics
    // import('@/services/analytics').then(({ analytics }) => {
    //   analytics.trackLeaderboardView();
    // });
  }, [sortBy]);

  useEffect(() => {
    const handler = () => loadLeaderboardData();
    // React Native equivalent for event listeners - you might need to adjust this
    // based on your actual implementation
    return () => {};
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      
      // Get user profiles who have opted into the leaderboard
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, display_name, username, avatar_url, follower_count, total_xp, current_streak, show_on_leaderboard, is_online')
        .eq('show_on_leaderboard', true);

      if (error) throw error;

      // Get completed challenges count via server-side function (bypasses RLS)
      const leaderboardPromises = (profiles || []).map(async (profile) => {
        let completed_challenges = 0;
        try {
          const { data: count } = await supabase
            .rpc('get_user_completed_challenges', { user_id_param: profile.user_id });
          completed_challenges = typeof count === 'number' ? count : 0;
        } catch (e) {
          completed_challenges = 0;
        }

        return {
          user_id: profile.user_id,
          display_name: profile.display_name || '',
          username: profile.username || '',
          avatar_url: profile.avatar_url || undefined,
          follower_count: profile.follower_count,
          total_xp: profile.total_xp || 0,
          completed_challenges,
          current_streak: profile.current_streak || 0,
          is_online: profile.is_online || false,
        };
      });

      const leaderboardData = await Promise.all(leaderboardPromises);

      // Sort by selected criteria
      const sortedData = leaderboardData.sort((a, b) => {
        switch (sortBy) {
          case 'xp':
            return b.total_xp - a.total_xp;
          case 'challenges':
            return b.completed_challenges - a.completed_challenges;
          default:
            return b.total_xp - a.total_xp;
        }
      });

      setLeaderboardData(sortedData);

      // Find current user's rank
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userRank = sortedData.findIndex(u => u.user_id === user.id) + 1;
        setCurrentUserRank(userRank > 0 ? userRank : null);
      }

    } catch (error) {
      console.error('Error loading leaderboard:', error);
      toast({
        title: "Error loading leaderboard",
        description: "Please try refreshing the page",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-500" size={24} />;
      case 2:
        return <Trophy className="text-gray-400" size={24} />;
      case 3:
        return <Medal className="text-amber-600" size={24} />;
      default:
        return <Text className="font-bold text-lg text-muted-foreground">#{rank}</Text>;
    }
  };

  const getSortValue = (user: LeaderboardUser) => {
    switch (sortBy) {
      case 'xp':
        return `${user.total_xp.toLocaleString()} XP`;
      case 'challenges':
        return `${user.completed_challenges} Challenges`;
      default:
        return `${user.total_xp.toLocaleString()} XP`;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Leaderboard" showBack />
            <div className="min-h-screen bg-gradient-subtle scrollable">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="Leaderboard" showBack />
      
      <ScrollView 
        className="flex-1"
        contentContainerClassName="p-4"
        showsVerticalScrollIndicator={false}
      >
        
        {/* Header */}
     {/* Header */}
{/* <Card className="p-6 bg-card rounded-2xl border-border border mb-6 items-center">
  <View className="flex-row items-center justify-center gap-3 mb-4">
    <Trophy size={32} className="text-warning" />
    <Text className="text-2xl font-cooper font-bold uppercase text-card-foreground">
      Community Leaderboard
    </Text>
  </View>
  <Text className="text-muted-foreground text-center mb-4 font-typewriter text-base">
    See how you rank among other challenge enthusiasts!
  </Text>
  {currentUserRank && (
    <Badge variant="secondary" className="bg-secondary px-3 py-1 rounded-full">
      <Text className="text-secondary-foreground font-typewriter text-sm">
        You're ranked #{currentUserRank}
      </Text>
    </Badge>
  )}
</Card> */}

{/* Sort Options */}
{/* <Card className="p-4 bg-card rounded-2xl border-border border mb-6">
  <Text className="font-typewriter font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">
    Sort By
  </Text>
  <View className="flex-row flex-wrap gap-2">
    <Button
      variant={sortBy === 'xp' ? 'default' : 'outline'}
      size="sm"
      onPress={() => setSortBy('xp')}
      className={`flex-row items-center gap-2 px-3 py-2 rounded-lg ${
        sortBy === 'xp' 
          ? 'bg-primary border-primary' 
          : 'bg-transparent border-primary border'
      }`}
    >
      <Star 
        size={16} 
        className={sortBy === 'xp' ? 'text-primary-foreground' : 'text-primary'} 
      />
      <Text className={`font-typewriter ${
        sortBy === 'xp' ? 'text-primary-foreground' : 'text-primary'
      }`}>
        Total XP
      </Text>
    </Button>
    <Button
      variant={sortBy === 'challenges' ? 'default' : 'outline'}
      size="sm"
      onPress={() => setSortBy('challenges')}
      className={`flex-row items-center gap-2 px-3 py-2 rounded-lg ${
        sortBy === 'challenges' 
          ? 'bg-primary border-primary' 
          : 'bg-transparent border-primary border'
      }`}
    >
      <Trophy 
        size={16} 
        className={sortBy === 'challenges' ? 'text-primary-foreground' : 'text-primary'} 
      />
      <Text className={`font-typewriter ${
        sortBy === 'challenges' ? 'text-primary-foreground' : 'text-primary'
      }`}>
        Challenges
      </Text>
    </Button>
  </View>
</Card> */}

 <View className="flex-row items-start gap-3 mb-4">
    {/* <Trophy size={32} className="text-warning" /> */}
    <Text className="text-xl font-cooper font-bold uppercase text-card-foreground">
      Leaderboard
    </Text>
  </View>

        {/* Leaderboard */}
        {leaderboardData.length > 0 ? (
          <View className="space-y-3 mb-6">
            {leaderboardData.map((user, index) => {
              // Calculate actual rank based on score
              const currentScore = sortBy === 'xp' ? user.total_xp : user.completed_challenges;
              const prevScore = index > 0 
                ? (sortBy === 'xp' ? leaderboardData[index - 1].total_xp : leaderboardData[index - 1].completed_challenges)
                : null;
              
              // Determine rank: if score is same as previous user, use same rank
              let actualRank = index + 1;
              if (index > 0 && currentScore === prevScore) {
                // Find the rank of the first user with this score
                for (let i = index - 1; i >= 0; i--) {
                  const iScore = sortBy === 'xp' ? leaderboardData[i].total_xp : leaderboardData[i].completed_challenges;
                  if (iScore === currentScore) {
                    actualRank = i + 1;
                  } else {
                    break;
                  }
                }
              }
              
              return (
                <TouchableOpacity 
                  key={user.user_id}
                  onPress={() => router.navigate(`/user/${user.username}`)}
                >
                  <Card 
                    className={`p-4 bg-card rounded-2xl border mb-2 ${
                      actualRank <= 3 
                        ? 'border-warning/20 bg-warning/5 border-2' 
                        : 'border-border'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      
                      {/* Rank */}
                      <View className="w-10 items-center justify-center flex-shrink-0">
                        {getRankIcon(actualRank)}
                      </View>

                      {/* Avatar & Info */}
                      <View className="flex-row items-center gap-3 flex-1">
                        <View className="relative">
                          <SmartAvatar 
                            avatarUrl={user.avatar_url}
                            fallbackText={user.username || user.display_name || 'U'}
                            className="h-12 w-12 rounded-full"
                            size="md"
                          />
                          {user.is_online && (
                            <View className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                          )}
                        </View>
                        
                        <View className="flex-1">
                          <Text 
                            className="font-typewriter font-semibold text-card-foreground text-base leading-5" 
                            numberOfLines={1}
                          >
                            {user.username || user.display_name}
                          </Text>
                          <Text 
                            className="font-typewriter text-muted-foreground text-sm leading-4" 
                            numberOfLines={1}
                          >
                            @{user.username}
                          </Text>
                        </View>
                      </View>

                      {/* Stats */}
                      <View className="items-end flex-shrink-0">
                        <Text className="font-typewriter font-bold text-card-foreground text-base">
                          {getSortValue(user)}
                        </Text>
                        {sortBy === 'xp' && (
                          <Text className="font-typewriter text-muted-foreground text-xs">
                            {user.completed_challenges} challenges
                          </Text>
                        )}
                        {sortBy === 'challenges' && (
                          <Text className="font-typewriter text-muted-foreground text-xs">
                            {user.total_xp.toLocaleString()} XP
                          </Text>
                        )}
                      </View>

                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Card className="p-8 bg-card rounded-2xl border-border border items-center mb-6">
            <Trophy size={48} className="text-muted-foreground mb-4" />
            <Text className="font-cooper font-bold text-card-foreground text-xl uppercase mb-2 text-center">
              No Leaderboard Data
            </Text>
            <Text className="font-typewriter text-muted-foreground text-base text-center">
              No users have opted into the leaderboard yet. Be the first to enable leaderboard visibility in your profile settings!
            </Text>
          </Card>
        )}

        {/* Info Card */}
        <Card className="p-4 bg-primary/5 rounded-2xl border-primary/20 border">
          <View className="flex-row items-start gap-3">
            <View className="w-8 h-8 bg-primary/20 rounded-full items-center justify-center flex-shrink-0">
              <Star size={16} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="font-typewriter font-medium text-card-foreground text-sm mb-1">
                Privacy Note
              </Text>
              <Text className="font-typewriter text-muted-foreground text-xs leading-5 mb-3">
                Only users who have enabled "Show on Leaderboard" in their profile settings are visible here.
              </Text>
              <Button 
                variant="outline" 
                size="sm"
                onPress={() => router.navigate('/profile')}
                className="border-primary/50 px-3 py-1 rounded-lg"
              >
                <Text className="font-typewriter text-primary text-xs">
                  Manage Privacy Settings
                </Text>
              </Button>
            </View>
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}