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
import { Search, Trophy, Users, Bell, BellOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatUnreadCounts } from '@/hooks/useChatUnreadCounts';

interface ChallengeChatsProps {
  onChatSelect: (chatId: string) => void;
}

interface ChallengeChat {
  id: string;
  name: string;
  challenge_id: string;
  participant_count: number;
  is_subscribed: boolean;
  lastMessage?: {
    content: string;
    created_at: string;
    user_name: string;
  };
  unread_count: number;
  challenge_image?: string;
  challenge_title?: string;
}
interface ChallengeInfo {
  id: string;
  title: string;
  image_url?: string | null;
}


export const ChallengeChats: React.FC<ChallengeChatsProps> = ({ onChatSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [challengeChats, setChallengeChats] = useState<ChallengeChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { getUnreadCount, markChatAsRead } = useChatUnreadCounts();

  useEffect(() => {
    fetchChallengeChats();
  }, []);

  const fetchChallengeChats = async () => {
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
      const { data: participantRows, error: pErr } = await supabase
        .from('chat_participants')
        .select('chat_id, is_subscribed')
        .eq('user_id', user.user.id);

      if (pErr) throw pErr;

      const chatIds = (participantRows || []).map((r: any) => r.chat_id);
      const subscriptionMap = new Map<string, boolean>();
      for (const r of participantRows || []) {
        subscriptionMap.set(r.chat_id, r.is_subscribed);
      }

      if (chatIds.length === 0) {
        setChallengeChats([]);
        return;
      }

      // 2) Get challenge chats ordered by activity
      const { data: chats, error: cErr } = await supabase
        .from('chats')
        .select('id, name, challenge_id, updated_at')
        .eq('type', 'challenge')
        .in('id', chatIds)
        .order('updated_at', { ascending: false });

      if (cErr) throw cErr;

      const challengeChatIds = (chats || []).map((c: any) => c.id);

      // Get challenge data for images and titles
      // Get challenge data for images and titles
      const challengeIds = [...new Set((chats || []).map((c: any) => c.challenge_id).filter(Boolean))];

      let challengeData: { id: string; title: string; image_url?: string | null }[] = [];
      const challengeByIdMap = new Map<string, { id: string; title: string; image_url?: string | null }>();

      if (challengeIds.length > 0) {
        const { data: challenges, error: challengeErr } = await supabase
          .from('challenges')
          .select('id, title, image_url')
          .in('id', challengeIds);

        if (!challengeErr) {
          challengeData = challenges || [];
        }
      }

      // Fill the map (outside the if-block so it always exists)
      for (const challenge of challengeData) {
        challengeByIdMap.set(challenge.id, challenge);
      }

      // 3) Count participants for each chat
      const { data: allParticipants, error: apErr } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .in('chat_id', challengeChatIds);

      if (apErr) throw apErr;

      const participantCounts = new Map<string, number>();
      for (const cp of allParticipants || []) {
        participantCounts.set(cp.chat_id, (participantCounts.get(cp.chat_id) || 0) + 1);
      }

      // 4) Get last messages for all chats
      const { data: msgs, error: mErr } = await supabase
        .from('messages')
        .select('chat_id, content, created_at, user_id')
        .in('chat_id', challengeChatIds)
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
            user_name: profile?.username || profile?.display_name || 'Unknown'
          });
        }
      }

      // 5) Assemble UI data
      const processedChats: ChallengeChat[] = (chats || []).map((chat: any) => {
        const challengeInfo = challengeByIdMap.get(chat.challenge_id);
        return {
          id: chat.id,
          name: chat.name || 'Challenge Discussion',
          challenge_id: chat.challenge_id,
          participant_count: participantCounts.get(chat.id) || 0,
          is_subscribed: subscriptionMap.get(chat.id) || false,
          lastMessage: lastMsgByChat.get(chat.id) || undefined,
          unread_count: getUnreadCount(chat.id),
          challenge_image: challengeInfo?.image_url ?? undefined,
          challenge_title: challengeInfo?.title
        };
      });

      setChallengeChats(processedChats);
    } catch (error) {
      console.error('Error fetching challenge chats:', error);
      toast({
        title: "Error",
        description: "Failed to load challenge chats",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubscription = async (chatId: string, isCurrentlySubscribed: boolean) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      if (isCurrentlySubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('chat_participants')
          .update({ is_subscribed: false })
          .eq('chat_id', chatId)
          .eq('user_id', user.user.id);

        if (error) throw error;

        toast({
          title: "Unsubscribed",
          description: "You won't receive notifications from this challenge chat"
        });
      } else {
        // Subscribe - first check if record exists
        const { data: existingParticipant, error: checkError } = await supabase
          .from('chat_participants')
          .select('id')
          .eq('chat_id', chatId)
          .eq('user_id', user.user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingParticipant) {
          // Update existing record
          const { error } = await supabase
            .from('chat_participants')
            .update({ is_subscribed: true })
            .eq('chat_id', chatId)
            .eq('user_id', user.user.id);

          if (error) throw error;
        } else {
          // Insert new record
          const { error } = await supabase
            .from('chat_participants')
            .insert({
              chat_id: chatId,
              user_id: user.user.id,
              is_subscribed: true
            });

          if (error) throw error;
        }

        toast({
          title: "Subscribed",
          description: "You'll now receive notifications from this challenge chat"
        });
      }

      // Refresh the list
      fetchChallengeChats();
    } catch (error) {
      console.error('Error toggling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive"
      });
    }
  };

  const filteredChats = challengeChats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.challenge_id.toLowerCase().includes(searchQuery.toLowerCase())
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
          <Text className="text-lg font-semibold font-inter">Challenge Discussions</Text>
          <Badge variant="secondary" className="px-2 py-1">
            <Text className="text-xs font-inter">
              {challengeChats.filter(c => c.is_subscribed).length} subscribed
            </Text>
          </Badge>
        </View>

        <View className="relative">
          <View className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
            <Search size={18} color="hsl(var(--muted-foreground))" />
          </View>
          <TextInput
            placeholder="Search challenge discussions..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 py-3 bg-background border border-input rounded-lg text-foreground font-inter"
            style={{ paddingLeft: 40 }}
          />
        </View>
      </View>

      {/* Challenge Chats List */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {filteredChats.length === 0 ? (
          <View className="flex flex-col items-center justify-center h-64 px-6">
            <Trophy size={48} color="hsl(var(--muted-foreground))" className="mb-4" />
            <Text className="text-lg font-medium mb-2 font-inter text-center">No challenge discussions yet</Text>
            <Text className="text-muted-foreground text-center font-inter">
              Challenge discussions are created automatically when you start a challenge
            </Text>
          </View>
        ) : (
          <View className="p-2">
            {filteredChats.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                onPress={() => {
                  markChatAsRead(chat.id);
                  onChatSelect(chat.id);
                }}
                activeOpacity={0.7}
              >
                <Card className={`p-4 mb-2 ${chat.is_subscribed ? 'border-primary/20 bg-primary/5' : 'bg-card'
                  }`}>
                  <View className="flex-row items-center gap-3">
                    {/* Challenge Avatar */}
                    <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center overflow-hidden">
                      {chat.challenge_image ? (
                        <Image
                          source={{ uri: chat.challenge_image }}
                          alt={chat.challenge_title || 'Challenge'}
                          className="w-full h-full rounded-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Trophy size={20} color="hsl(var(--orange-600))" />
                      )}
                    </View>

                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center justify-between mb-1 gap-2">
                        <View className="flex-row items-center gap-2 flex-1">
                          <Text className="font-medium font-inter flex-1" numberOfLines={1}>
                            {chat.name}
                          </Text>
                          <Badge variant="outline" className="px-2 py-1 flex-row items-center">
                            <Users size={12} color="hsl(var(--foreground))" className="mr-1" />
                            <Text className="text-xs font-inter">{chat.participant_count}</Text>
                          </Badge>
                        </View>
                        {chat.lastMessage && (
                          <View className="flex-col items-end flex-shrink-0 ml-2">
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(chat.lastMessage.created_at).date}
                            </Text>
                            <Text className="text-xs text-muted-foreground font-inter">
                              {formatTime(chat.lastMessage.created_at).time}
                            </Text>
                            {getUnreadCount(chat.id) > 0 && (
                              <Badge variant="default" className="h-5 w-5 items-center justify-center mt-1">
                                <Text className="text-xs text-white font-inter">
                                  {getUnreadCount(chat.id)}
                                </Text>
                              </Badge>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Subscription button */}
                      <View className="flex-row items-center gap-2 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleSubscription(chat.id, chat.is_subscribed);
                          }}
                          className="h-7 px-2 flex-row items-center"
                        >
                          {chat.is_subscribed ? (
                            <>
                              <Bell size={14} color="hsl(var(--primary))" />
                              <Text className="text-xs text-primary font-inter ml-1">Subscribed</Text>
                            </>
                          ) : (
                            <>
                              <BellOff size={14} color="hsl(var(--muted-foreground))" />
                              <Text className="text-xs text-muted-foreground font-inter ml-1">Subscribe</Text>
                            </>
                          )}
                        </Button>
                      </View>

                      {/* Last message */}
                      <View>
                        <Text
                          className="text-sm text-muted-foreground font-inter"
                          numberOfLines={2}
                        >
                          {chat.lastMessage
                            ? `${chat.lastMessage.user_name}: ${chat.lastMessage.content}`
                            : 'No messages yet'
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
    </View>
  );
};