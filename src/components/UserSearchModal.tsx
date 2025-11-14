import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Search, UserPlus, UserMinus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getCurrentUserProfile, followUser, unfollowUser, checkIsFollowing } from '@/api/user';
import { useRouter } from 'expo-router';
import { supabase } from '@/integrations/supabase/client';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface UserProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
}

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSearchModal({ open, onOpenChange }: UserSearchModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (open) {
      loadCurrentUser();
      setSearchQuery('');
      setSearchResults([]);

      // Auto-focus the search input when modal opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const performSearch = async () => {
    if (!currentUserId) return;

    setLoading(true);

    try {
      const query = searchQuery.toLowerCase();

      // Search user_profiles table
      const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url, total_xp, current_streak')
        .neq('user_id', currentUserId) // Exclude current user
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;

      // Fix TypeScript error by ensuring username is never null
      const processedProfiles: UserProfile[] = (profiles || []).map(profile => ({
        ...profile,
        username: profile.username || 'user', // Provide default if null
        display_name: profile.display_name || profile.username || 'User',
      }));

      setSearchResults(processedProfiles);

      // Load following status for all results
      if (processedProfiles.length > 0) {
        const statusPromises = processedProfiles.map(async (profile) => {
          const isFollowing = await checkIsFollowing(profile.user_id);
          return [profile.user_id, isFollowing] as [string, boolean];
        });

        const statuses = await Promise.all(statusPromises);
        const statusMap = Object.fromEntries(statuses);
        setFollowingStatus(statusMap);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Search error",
        description: "Failed to search users. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string, isCurrentlyFollowing: boolean) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: false }));
        toast({
          title: "Unfollowed user",
          description: "You will no longer see their posts in your following feed"
        });
      } else {
        await followUser(userId);
        setFollowingStatus(prev => ({ ...prev, [userId]: true }));
        toast({
          title: "Following user! 🎉",
          description: "You'll now see their posts in your following feed"
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast({
        title: "Error updating follow status",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    // Use setTimeout to ensure modal is closed before navigation
    setTimeout(() => {
      router.push(`/user/${userId}`);
    }, 100);
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => onOpenChange(false)}
    >
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View className="px-4 py-4 border-b border-border">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Search Users</Text>
            <TouchableOpacity
              onPress={() => onOpenChange(false)}
              className="w-8 h-8 items-center justify-center"
            >
              <Text className="text-lg text-muted-foreground">✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View className="px-4 py-3 border-b border-border">
          <View className="relative">
            <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
              <Search size={16} className="text-muted-foreground" />
            </View>
            <TextInput
              ref={searchInputRef}
              placeholder="Search users by name, handle, or interests..."
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-10 pr-4 py-3 bg-muted/50 rounded-lg text-foreground border border-border"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
            />
          </View>
        </View>

        {/* Search Results */}
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
        >
          {searchQuery.length < 2 ? (
            <View className="items-center py-12 px-4">
              <Search size={32} className="text-muted-foreground mb-3 opacity-50" />
              <Text className="text-muted-foreground text-center mb-1">
                Type at least 2 characters to search
              </Text>
            </View>
          ) : loading ? (
            <View className="flex justify-center py-12">
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : searchResults.length === 0 ? (
            <View className="items-center py-12 px-4">
              <Text className="text-2xl mb-3">🤔</Text>
              <Text className="text-muted-foreground text-center mb-1">
                No users found
              </Text>
              <Text className="text-muted-foreground text-sm text-center">
                Try searching with different keywords
              </Text>
            </View>
          ) : (
            <View className="p-3 space-y-2">
              {searchResults.map((user) => (
                <View
                  key={user.user_id}
                  className="flex-row items-center gap-3 p-3 rounded-lg bg-card border border-border"
                >
                  <TouchableOpacity
                    onPress={() => handleUserClick(user.user_id)}
                    className="flex-row items-center gap-3 flex-1"
                  >
                    <SmartAvatar
                      avatarUrl={user.avatar_url}
                      fallbackText={user.username}
                      size="md"
                    />
                    <View className="flex-1 min-w-0">
                      <Text className="font-medium text-sm text-foreground mb-1" numberOfLines={1}>
                        {user.display_name || user.username}
                      </Text>
                      <Text className="text-xs text-muted-foreground mb-1" numberOfLines={1}>
                        @{user.username}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {user.total_xp} XP • {user.current_streak} day streak
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleFollow(user.user_id, followingStatus[user.user_id])}
                    className={`px-4 py-2 rounded-md border ${followingStatus[user.user_id]
                      ? 'bg-transparent border-border'
                      : 'bg-primary border-primary'
                      }`}
                  >
                    <View className="flex-row items-center">
                      {followingStatus[user.user_id] ? (
                        <>
                          <UserMinus size={14} className="text-foreground mr-1" />
                          <Text className="text-foreground text-sm font-medium">Unfollow</Text>
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} className="text-primary-foreground mr-1" />
                          <Text className="text-primary-foreground text-sm font-medium">Follow</Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}