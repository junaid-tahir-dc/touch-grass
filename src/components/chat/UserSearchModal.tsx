import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Search, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

interface User {
  id: string;
  user_id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  last_seen_at?: string | null;
}

export const UserSearchModal: React.FC<UserSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectUser
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchRecentUsers();
      fetchAllUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const fetchRecentUsers = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Get recent chat participants separately to avoid complex embed queries
      const { data: participantData, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .neq('user_id', user.user.id);

      if (pErr) throw pErr;

      const chatIds = [...new Set(participantData?.map(p => p.chat_id))];
      if (chatIds.length === 0) return;

      // Get direct chats and their update times
      const { data: chatsData, error: cErr } = await supabase
        .from('chats')
        .select('id, type, updated_at')
        .eq('type', 'direct')
        .in('id', chatIds)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (cErr) throw cErr;

      // Get user IDs from recent chats
      const recentChatIds = chatsData?.map(c => c.id) || [];
      const recentUserIds = participantData
        ?.filter(p => recentChatIds.includes(p.chat_id) && p.user_id !== user.user.id)
        .map(p => p.user_id) || [];

      if (recentUserIds.length === 0) return;

      // Get user profiles
      const { data: profilesData, error: prErr } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', recentUserIds);

      if (prErr) throw prErr;

      setRecentUsers(profilesData || []);
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .neq('user_id', authUser.user.id)
        .order('display_name', { ascending: true })
        .limit(50);

      if (error) throw error;
      setAllUsers((data || []).filter((u: any) => !!u.user_id));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .neq('user_id', user.user.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;

      setUsers((data || []).filter((u: any) => !!u.user_id));
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    onSelectUser(userId);
    setSearchQuery('');
    setUsers([]);
  };

  const renderUserCard = (user: User) => (
    <TouchableOpacity
      key={user.id}
      onPress={() => handleUserSelect(user.user_id)}
      activeOpacity={0.7}
    >
      <Card className="p-3 bg-card">
        <View className="flex-row items-center gap-3">
          <View className="relative">
            <SmartAvatar
              avatarUrl={user.avatar_url}
              fallbackText={user.username || user.display_name || 'User'}
              size="md"
            />
            {isOnlineFromLastSeen(user.last_seen_at) && (
              <View className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
            )}
          </View>

          <View className="flex-1 min-w-0">
            <Text className="font-medium font-inter" numberOfLines={1}>
              {user.username || user.display_name}
            </Text>
            <Text className="text-sm text-muted-foreground font-inter" numberOfLines={1}>
              @{user.username}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {isOnlineFromLastSeen(user.last_seen_at) && (
              <Badge variant="secondary" className="px-2 py-1">
                <Text className="text-xs font-inter">Online</Text>
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="p-2">
              <MessageCircle size={16} color="hsl(var(--muted-foreground))" />
            </Button>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
          <Text className="text-lg font-semibold font-inter">Start New Chat</Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={20} color="hsl(var(--muted-foreground))" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="p-6 border-b border-border">
          <View className="relative">
            <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
              <Search size={18} color="hsl(var(--muted-foreground))" />
            </View>
            <TextInput
              placeholder="Search by username..."
              placeholderTextColor="hsl(var(--muted-foreground))"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="pl-10 py-3 bg-background border border-input rounded-lg text-foreground font-inter"
              style={{ paddingLeft: 40 }}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="flex items-center justify-center h-32">
              <ActivityIndicator size="large" color="hsl(var(--primary))" />
            </View>
          ) : searchQuery.trim() ? (
            <View className="p-4">
              <Text className="text-sm font-medium mb-3 text-muted-foreground font-inter">
                Search Results
              </Text>
              {users.length === 0 ? (
                <View className="items-center justify-center py-8">
                  <Text className="text-muted-foreground font-inter">No users found</Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {users.map(renderUserCard)}
                </View>
              )}
            </View>
          ) : (
            <View className="p-4">
              {recentUsers.length > 0 && (
                <>
                  <Text className="text-sm font-medium mb-3 text-muted-foreground font-inter">
                    Recent Conversations
                  </Text>
                  <View className="space-y-2 mb-6">
                    {recentUsers.map(renderUserCard)}
                  </View>
                </>
              )}

              <Text className="text-sm font-medium mb-3 text-muted-foreground font-inter">
                People
              </Text>
              {allUsers.length === 0 ? (
                <View className="items-center justify-center py-8">
                  <MessageCircle size={32} color="hsl(var(--muted-foreground))" className="mb-2" />
                  <Text className="text-sm text-muted-foreground text-center font-inter">
                    No other users yet. Invite someone or try searching.
                  </Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {allUsers.map(renderUserCard)}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};