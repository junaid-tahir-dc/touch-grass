import React, { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Users, UserPlus, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { followUser, unfollowUser, checkIsFollowing, removeFollower } from '@/api/user';
import { isOnlineFromLastSeen } from '@/lib/utils';
import { useRouter } from 'expo-router';
import { SmartAvatar } from './ui/smart-avatar';

interface FollowerUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  last_seen_at?: string | null;
}

interface FollowersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  type: 'followers' | 'following';
  title: string;
  onCountsUpdate?: () => void;
}

export function FollowersModal({ 
  open, 
  onOpenChange, 
  userId, 
  type, 
  title,
  onCountsUpdate
}: FollowersModalProps) {
  const router = useRouter();
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, userId, type]);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUser = user?.id || null;
    setCurrentUserId(currentUser);
    
    await loadUsers(currentUser);
  };

  const loadUsers = async (currentUser: string | null) => {
    setLoading(true);
    try {
      let userIds: string[] = [];
      
      if (type === 'followers') {
        const { data: followData, error: followError } = await supabase
          .from('user_followers')
          .select('follower_id')
          .eq('following_id', userId);
        
        if (followError) throw followError;
        userIds = followData?.map(item => item.follower_id) || [];
      } else {
        const { data: followData, error: followError } = await supabase
          .from('user_followers')
          .select('following_id')
          .eq('follower_id', userId);
        
        if (followError) throw followError;
        userIds = followData?.map(item => item.following_id) || [];
      }

      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      const userList = profiles?.map((profile: any) => ({
        user_id: profile.user_id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        last_seen_at: profile.last_seen_at
      })) || [];

      setUsers(userList);

      if (currentUser) {
        const statusPromises = userList.map(async (user) => {
          if (user.user_id === currentUser) return [user.user_id, false];
          const isFollowing = await checkIsFollowing(user.user_id);
          return [user.user_id, isFollowing];
        });
        
        const statuses = await Promise.all(statusPromises);
        const statusMap = Object.fromEntries(statuses);
        setFollowingStatus(statusMap);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    if (!currentUserId) return;

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
        
        if (type === 'following' && userId === currentUserId) {
          setUsers(prev => prev.filter(u => u.user_id !== targetUserId));
        }
        
        if (type === 'followers' && userId !== currentUserId) {
          setUsers(prev => prev.filter(u => u.user_id !== currentUserId));
        }
        
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: false }));
        
        toast({
          title: "Unfollowed user",
          description: "You will no longer see their posts in your feed"
        });
      } else {
        await followUser(targetUserId);
        setFollowingStatus(prev => ({ ...prev, [targetUserId]: true }));
        
        toast({
          title: "Following user! 🎉",
          description: "You'll now see their posts in your feed"
        });
      }
      
      if (onCountsUpdate) {
        onCountsUpdate();
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

  const handleRemoveFollower = async (followerUserId: string) => {
    if (!currentUserId) return;

    try {
      await removeFollower(followerUserId);
      setUsers(prev => prev.filter(u => u.user_id !== followerUserId));
      
      toast({
        title: "Follower removed",
        description: "This user will no longer follow you"
      });
      
      if (onCountsUpdate) {
        onCountsUpdate();
      }
    } catch (error) {
      console.error('Error removing follower:', error);
      toast({
        title: "Error removing follower",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  };

  const handleUserClick = (user: FollowerUser) => {
    onOpenChange(false);
    router.navigate(`/user/${user.user_id}`);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className="bg-card rounded-lg w-full max-w-[425px] max-h-[80vh] border border-border">
          {/* Header with Close Button */}
          <View className="p-6 border-b border-border flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Users size={20} />
              <Text className="text-lg font-bold">{title}</Text>
            </View>
            <TouchableOpacity 
              onPress={handleClose}
              className="p-2 rounded-full hover:bg-muted/50"
              accessibilityLabel="Close modal"
              accessibilityRole="button"
            >
              <X size={20} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <View className="flex-1">
            {loading ? (
              <View className="items-center justify-center py-8">
                <View className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </View>
            ) : users.length === 0 ? (
              <View className="items-center py-8">
                <Users size={48} color="gray" className="mb-4" />
                <Text className="font-medium text-muted-foreground mb-1">
                  No {type} yet
                </Text>
                <Text className="text-sm text-muted-foreground text-center">
                  {type === 'followers' 
                    ? "No one is following this user yet" 
                    : "This user isn't following anyone yet"
                  }
                </Text>
              </View>
            ) : (
              <ScrollView className="flex-1">
                <View className="p-4 gap-3">
                  {users.map((user) => (
                    <View 
                      key={user.user_id} 
                      className="flex-row items-center gap-3 p-2 rounded-lg"
                    >
                      <TouchableOpacity 
                        className="relative"
                        onPress={() => handleUserClick(user)}
                      >
                        <SmartAvatar
                          avatarUrl={user.avatar_url}
                          fallbackText={user.display_name || user.username}
                          size="md"
                        />
                        {isOnlineFromLastSeen(user.last_seen_at) && (
                          <View className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        className="flex-1"
                        onPress={() => handleUserClick(user)}
                      >
                        <Text className="font-medium text-sm">
                          {user.username || user.display_name}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          @{user.username}
                        </Text>
                      </TouchableOpacity>

                      {currentUserId && user.user_id !== currentUserId && (
                        <>
                          {type === 'followers' && userId === currentUserId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onPress={() => handleRemoveFollower(user.user_id)}
                            >
                              <UserMinus size={14} className="mr-1" />
                              <Text className="text-xs">Remove</Text>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant={followingStatus[user.user_id] ? "outline" : "default"}
                              onPress={() => handleFollow(user.user_id, followingStatus[user.user_id])}
                            >
                              {followingStatus[user.user_id] ? (
                                <>
                                  <UserMinus size={14} className="mr-1" />
                                  <Text className="text-xs">Following</Text>
                                </>
                              ) : (
                                <>
                                  <UserPlus size={14} className="mr-1" />
                                  <Text className="text-xs">Follow</Text>
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                      
                      {user.user_id === currentUserId && (
                        <Badge variant="secondary">
                          <Text className="text-xs">You</Text>
                        </Badge>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}