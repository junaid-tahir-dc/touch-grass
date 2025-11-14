import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { Search, Plus, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserSearchModal } from './UserSearchModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatUnreadCounts } from '@/hooks/useChatUnreadCounts';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface DirectMessagesProps {
  onChatSelect: (chatId: string) => void;
  onStartNewChat: (userId: string) => void;
}

interface DirectMessage {
  id: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
    last_seen_at?: string | null;
  };
  lastMessage?: {
    content: string;
    created_at: string;
    user_id: string;
  };
  unread_count: number;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({ onChatSelect, onStartNewChat }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const { toast } = useToast();
  const { getUnreadCount, markChatAsRead } = useChatUnreadCounts();

  useEffect(() => {
    fetchDirectMessages();
  }, []);

  const fetchDirectMessages = async () => {
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

      // Fetch direct message chats without relying on PostgREST embeds
      // 1) Find chat ids where current user participates
      const { data: participantRows, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', user.user.id);

      if (pErr) throw pErr;

      const chatIds = (participantRows || []).map((r: any) => r.chat_id);
      if (chatIds.length === 0) {
        setDirectMessages([]);
        return;
      }

      // 2) Get direct chats ordered by activity
      const { data: chats, error: cErr } = await supabase
        .from('chats')
        .select('id, updated_at')
        .eq('type', 'direct')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (cErr) throw cErr;

      const directChatIds = (chats || []).map((c: any) => c.id);

      // 3) Get all participants for these chats
      const { data: allParticipants, error: apErr } = await supabase
        .from('chat_participants')
        .select('chat_id, user_id')
        .in('chat_id', directChatIds);

      if (apErr) throw apErr;

      // 4) Build map of chat -> otherUserId and collect unique users
      const otherUserIdByChat = new Map<string, string>();
      const otherUserIdsSet = new Set<string>();

      // Group by chat
      const byChat: Record<string, string[]> = {};
      for (const cp of allParticipants || []) {
        if (!byChat[cp.chat_id]) byChat[cp.chat_id] = [];
        byChat[cp.chat_id].push(cp.user_id);
      }

      Object.entries(byChat).forEach(([cid, users]) => {
        const other = users.find((uid) => uid !== user.user.id);
        if (other) {
          otherUserIdByChat.set(cid, other);
          otherUserIdsSet.add(other);
        }
      });

      const otherUserIds = Array.from(otherUserIdsSet);

      // 5) Fetch profiles for the other users
      const { data: profiles, error: prErr } = await supabase
        .from('user_profiles')
        .select('id, user_id, username, display_name, avatar_url')
        .in('user_id', otherUserIds);

      if (prErr) throw prErr;

      const profileByUserId = new Map<string, any>();
      for (const p of profiles || []) {
        profileByUserId.set(p.user_id, p);
      }

      // 6) Fetch last messages for all chats
      const { data: msgs, error: mErr } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, user_id')
        .in('chat_id', directChatIds)
        .order('created_at', { ascending: false });

      if (mErr) throw mErr;

      const lastMsgByChat = new Map<string, any>();
      for (const m of msgs || []) {
        if (!lastMsgByChat.has(m.chat_id)) {
          lastMsgByChat.set(m.chat_id, {
            content: m.content,
            created_at: m.created_at,
            user_id: m.user_id,
          });
        }
      }

      // Remove empty chats (no messages) from the user's view by leaving them
      const emptyChatIds = (chats || [])
        .filter((c: any) => !lastMsgByChat.has(c.id))
        .map((c: any) => c.id);

      if (emptyChatIds.length > 0) {
        await supabase
          .from('chat_participants')
          .delete()
          .in('chat_id', emptyChatIds)
          .eq('user_id', user.user.id);
      }

      // 7) Assemble UI data
      const processedChats: DirectMessage[] = (chats || [])
        .map((chat: any) => {
          const otherId = otherUserIdByChat.get(chat.id);
          const profile = otherId ? profileByUserId.get(otherId) : null;
          const lastMessage = lastMsgByChat.get(chat.id) || null;
          return {
            id: chat.id,
            user: profile || {
              id: otherId,
              username: 'unknown',
              display_name: 'Unknown',
              avatar_url: undefined,
              last_seen_at: null,
            },
            lastMessage: lastMessage || undefined,
            unread_count: getUnreadCount(chat.id),
          } as DirectMessage;
        })
        .filter((dm) => !!dm.user && !!dm.lastMessage);

      setDirectMessages(processedChats);
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      toast({
        title: "Error",
        description: "Failed to load direct messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = directMessages.filter(dm =>
    dm.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dm.user.username?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleStartNewChat = async (userId: string) => {
    try {
      onStartNewChat(userId);
      setShowUserSearch(false);
    } catch (error) {
      console.error('Error starting new chat:', error);
      toast({
        title: "Error",
        description: "Failed to start new chat",
        variant: "destructive"
      });
    }
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
          <Text className="text-lg font-semibold font-inter">Direct Messages</Text>
          <Button onPress={() => setShowUserSearch(true)} size="sm" className="flex-row gap-2">
            <Plus size={16} color="white" />
            <Text className="text-white font-inter">New Chat</Text>
          </Button>
        </View>

        <View className="relative">
          <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            <Search size={18} color="hsl(var(--muted-foreground))" />
          </View>
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 py-3 bg-background border border-input rounded-lg text-foreground font-inter"
            style={{ paddingLeft: 40 }}
          />
        </View>
      </View>

      {/* Messages List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {filteredMessages.length === 0 ? (
          <View className="flex flex-col items-center justify-center h-64 px-6">
            <MessageCircle size={48} color="hsl(var(--muted-foreground))" className="mb-4" />
            <Text className="text-lg font-medium mb-2 font-inter text-center">No conversations yet</Text>
            <Text className="text-muted-foreground mb-4 text-center font-inter">
              Start a new conversation with someone from the community
            </Text>
            <Button onPress={() => setShowUserSearch(true)} className="flex-row gap-2">
              <Plus size={16} color="white" />
              <Text className="text-white font-inter">Start New Chat</Text>
            </Button>
          </View>
        ) : (
          <View className="p-3 space-y-2">
            {filteredMessages.map((dm) => (
              <TouchableOpacity
                key={dm.id}
                onPress={() => {
                  markChatAsRead(dm.id);
                  onChatSelect(dm.id);
                }}
                activeOpacity={0.7}
              >
                <Card className="p-3 border-0 shadow-sm bg-card">
                  <View className="flex-row items-start gap-3">
                    {/* Avatar */}
                    <View className="relative flex-shrink-0">
                      <View className="w-12 h-12 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center overflow-hidden">
                        {dm.user.avatar_url && dm.user.avatar_url.startsWith('http') ? (
                          <Image
                            source={{ uri: dm.user.avatar_url }}
                            alt={dm.user.username || dm.user.display_name}
                            className="w-full h-full rounded-full"
                            resizeMode="cover"
                          />
                        ) : dm.user.avatar_url ? (
                          <Text className="font-bold text-white font-inter">
                            {dm.user.avatar_url}
                          </Text>
                        ) : (
                          <Text className="font-bold text-white font-inter">
                            {(dm.user.username?.[0] || dm.user.display_name?.[0] || 'U').toUpperCase()}
                          </Text>
                        )}
                      </View>
                      {isOnlineFromLastSeen(dm.user.last_seen_at) && (
                        <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
                      )}
                    </View>

                    {/* Content */}
                    <View className="flex-1 min-w-0 space-y-1">
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="font-medium text-sm flex-1 leading-tight font-inter" numberOfLines={1}>
                          {dm.user.username || dm.user.display_name}
                        </Text>
                        {dm.lastMessage && (
                          <View className="flex-col items-end flex-shrink-0">
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(dm.lastMessage.created_at).date}
                            </Text>
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(dm.lastMessage.created_at).time}
                            </Text>
                            {getUnreadCount(dm.id) > 0 && (
                              <Badge variant="default" className="h-5 min-w-5 px-1 mt-1">
                                <Text className="text-xs text-white font-inter">
                                  {getUnreadCount(dm.id)}
                                </Text>
                              </Badge>
                            )}
                          </View>
                        )}
                      </View>

                      <Text
                        className="text-sm text-muted-foreground leading-tight font-inter"
                        numberOfLines={1}
                      >
                        {dm.lastMessage?.content || 'No messages yet'}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleStartNewChat}
      />
    </View>
  );
};