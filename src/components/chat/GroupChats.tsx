import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Search, Plus, Users, Settings, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateGroupModal } from './CreateGroupModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatUnreadCounts } from '@/hooks/useChatUnreadCounts';

interface GroupChatsProps {
  onChatSelect: (chatId: string) => void;
}

interface GroupChat {
  id: string;
  name: string;
  description?: string;
  participant_count: number;
  lastMessage?: {
    content: string;
    created_at: string;
    user_id: string;
    user_name: string;
  };
  unread_count: number;
  created_by: string;
}

export const GroupChats: React.FC<GroupChatsProps> = ({ onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { toast } = useToast();
  const { getUnreadCount, markChatAsRead } = useChatUnreadCounts();

  useEffect(() => {
    fetchGroupChats();
  }, []);

  const fetchGroupChats = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to access chat features",
          variant: "destructive"
        });
        return;
      }

      // Fetch group chats using separate queries to avoid RLS recursion
      // 1) Find chat ids where current user participates  
      const { data: participantRows, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.user.id);

      if (pErr) throw pErr;

      const chatIds = (participantRows || []).map((r: any) => r.chat_id);
      if (chatIds.length === 0) {
        setGroupChats([]);
        return;
      }

      // 2) Get group chats ordered by activity
      const { data: chats, error: cErr } = await supabase
        .from('chats')
        .select('id, name, description, created_by, updated_at')
        .eq('type', 'group')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (cErr) throw cErr;

      const groupChatIds = (chats || []).map((c: any) => c.id);

      // 3) Count participants for each chat
      const { data: allParticipants, error: apErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .in('chat_id', groupChatIds);

      if (apErr) throw apErr;

      const participantCounts = new Map<string, number>();
      for (const cp of allParticipants || []) {
        participantCounts.set(cp.chat_id, (participantCounts.get(cp.chat_id) || 0) + 1);
      }

      // 4) Get last messages for all chats
      const { data: msgs, error: mErr } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, user_id')
        .in('chat_id', groupChatIds)
        .order('created_at', { ascending: false });

      if (mErr) throw mErr;

      // Get user profiles for message authors
      const msgUserIds = [...new Set((msgs || []).map((m: any) => m.user_id))];
      const { data: msgProfiles, error: mpErr } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name')
        .in('user_id', msgUserIds);

      if (mpErr) throw mpErr;

      const profileByUserId = new Map<string, any>();
      for (const p of msgProfiles || []) {
        profileByUserId.set(p.user_id, p);
      }

      const lastMsgByChat = new Map<string, any>();
      for (const m of msgs || []) {
        if (!lastMsgByChat.has(m.chat_id)) {
          const profile = profileByUserId.get(m.user_id);
          lastMsgByChat.set(m.chat_id, {
            content: m.content,
            created_at: m.created_at,
            user_id: m.user_id,
            user_name: profile?.username || profile?.display_name || 'Unknown'
          });
        }
      }

      // 5) Assemble UI data
      const processedChats = (chats || []).map((chat: any) => ({
        id: chat.id,
        name: chat.name || 'Unnamed Group',
        description: chat.description,
        participant_count: participantCounts.get(chat.id) || 0,
        lastMessage: lastMsgByChat.get(chat.id) || undefined,
        unread_count: getUnreadCount(chat.id),
        created_by: chat.created_by
      }));

      setGroupChats(processedChats);
    } catch (error) {
      console.error('Error fetching group chats:', error);
      toast({
        title: "Error",
        description: "Failed to load group chats",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChats = groupChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return {
        date: 'Today',
        time: date.toLocaleString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      };
    }

    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const handleGroupCreated = (groupId: string) => {
    setShowCreateGroup(false);
    fetchGroupChats(); // Refresh the list
    onChatSelect(groupId); // Open the new group
  };

  if (isLoading) {
    return (
      <View className="flex items-center justify-center h-64">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="p-6 border-b border-border space-y-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold font-inter">Group Chats</Text>
          <Button
            onPress={() => setShowCreateGroup(true)}
            size="sm"
            className="flex-row gap-2"
          >
            <Plus size={16} color="white" />
            <Text className="text-white font-inter">Create Group</Text>
          </Button>
        </View>

        <View className="relative">
          <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            <Search size={18} color="hsl(var(--muted-foreground))" />
          </View>
          <TextInput
            placeholder="Search groups..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 py-3 bg-background border border-input rounded-lg text-foreground font-inter"
            style={{ paddingLeft: 40 }}
          />
        </View>
      </View>

      {/* Groups List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {filteredChats.length === 0 ? (
          <View className="flex flex-col items-center justify-center h-64 px-6">
            <Users size={48} color="hsl(var(--muted-foreground))" className="mb-4" />
            <Text className="text-lg font-medium mb-2 font-inter text-center">No group chats yet</Text>
            <Text className="text-muted-foreground mb-4 text-center font-inter">
              Create a group to start chatting with multiple people
            </Text>
            <Button
              onPress={() => setShowCreateGroup(true)}
              className="flex-row gap-2"
            >
              <Plus size={16} color="white" />
              <Text className="text-white font-inter">Create Group</Text>
            </Button>
          </View>
        ) : (
          <View className="p-2">
            {filteredChats.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => {
                  markChatAsRead(group.id);
                  onChatSelect(group.id);
                }}
                activeOpacity={0.7}
              >
                <Card className="p-4 mb-2 bg-card">
                  <View className="flex-row items-center gap-3">
                    {/* Group Avatar */}
                    <View className="w-12 h-12 bg-primary/20 rounded-full items-center justify-center">
                      <Users size={20} color="hsl(var(--primary))" />
                    </View>

                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center gap-2 flex-1">
                          <Text className="font-medium font-inter" numberOfLines={1}>
                            {group.name}
                          </Text>
                          <Badge variant="secondary" className="px-2 py-1">
                            <Text className="text-xs font-inter">{group.participant_count}</Text>
                          </Badge>
                        </View>
                        {group.lastMessage && (
                          <View className="flex-col items-end flex-shrink-0">
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(group.lastMessage.created_at).date}
                            </Text>
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(group.lastMessage.created_at).time}
                            </Text>
                            {getUnreadCount(group.id) > 0 && (
                              <Badge variant="default" className="h-5 w-5 items-center justify-center mt-1">
                                <Text className="text-xs text-white font-inter">
                                  {getUnreadCount(group.id)}
                                </Text>
                              </Badge>
                            )}
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Text
                          className="text-sm text-muted-foreground flex-1 font-inter"
                          numberOfLines={1}
                        >
                          {group.lastMessage
                            ? `${group.lastMessage.user_name}: ${group.lastMessage.content}`
                            : group.description || 'No messages yet'
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={handleGroupCreated}
      />
    </View>
  );
};