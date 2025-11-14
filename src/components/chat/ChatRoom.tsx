import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Users,
  Trophy,
  MessageCircle,
  Trash2,
  Pencil,
  UserCheck,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notifications';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { useChatUnreadCounts } from '@/hooks/useChatUnreadCounts';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { TypingIndicator } from './TypingIndicator';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface ChatRoomProps {
  chatId: string | null;
  newChatUserId?: string | null;
  chatType: 'direct' | 'group' | 'challenge';
  onBack: () => void;
  onChatCreated?: (chatId: string) => void;
  onChatDeleted?: () => void;
}

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user: {
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  is_own: boolean;
}

interface ChatInfo {
  id: string;
  name?: string | null;
  type: string;
  participant_count: number;
  other_user?: {
    user_id: string;
    username: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    last_seen_at?: string | null;
  };
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chatId,
  newChatUserId,
  chatType,
  onBack,
  onChatCreated,
  onChatDeleted
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [newChatUserInfo, setNewChatUserInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(chatId);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { toast } = useToast();
  const { preferences } = useNotificationPreferences();
  const { markChatAsRead } = useChatUnreadCounts();
  const { typingUsers, handleTyping, handleStopTyping } = useTypingIndicator(currentChatId);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (chatId) {
      setCurrentChatId(chatId);
      markChatAsRead(chatId);
      fetchChatInfo();
      fetchMessages().then(() => {
        cleanup = subscribeToMessages();
      });
    } else if (newChatUserId) {
      fetchNewChatUserInfo();
      setMessages([]);
      setIsLoading(false);
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [chatId, newChatUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const fetchNewChatUserInfo = async () => {
    if (!newChatUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .eq('user_id', newChatUserId)
        .single();

      if (error) throw error;
      setNewChatUserInfo(data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const fetchChatInfo = async () => {
    if (!currentChatId) return;

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: chat, error: chatErr } = await supabase
        .from('chats')
        .select('id, name, type')
        .eq('id', currentChatId)
        .maybeSingle();

      if (chatErr) throw chatErr;
      if (!chat) return;

      const { data: participants, error: partErr } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', currentChatId);

      if (partErr) throw partErr;

      const participant_count = participants?.length || 0;
      const otherUserId = participants?.find(p => p.user_id !== auth.user!.id)?.user_id || null;

      let otherUser = null;
      if (chat.type === 'direct' && otherUserId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_id, username, display_name, avatar_url, is_online')
          .eq('user_id', otherUserId)
          .maybeSingle();

        if (profile) {
          otherUser = {
            user_id: profile.user_id,
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          };
        }
      }

      setChatInfo({
        id: chat.id,
        name: chat.name,
        type: chat.type,
        participant_count,
        other_user: otherUser || undefined,
      });
    } catch (error) {
      console.error('Error fetching chat info:', error);
    }
  };

  const fetchMessages = async () => {
    if (!currentChatId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          user_id,
          created_at,
          user_profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('chat_id', currentChatId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      const processedMessages = data?.map(msg => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        created_at: msg.created_at,
        user: {
          username: msg.user_profiles?.username || 'Unknown',
          display_name: msg.user_profiles?.display_name,
          avatar_url: msg.user_profiles?.avatar_url
        },
        is_own: msg.user_id === user.user.id
      })) || [];

      setMessages(processedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    if (!currentChatId) return;

    const channelName = `chat-messages-${currentChatId}`;

    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${currentChatId}`
        },
        (payload) => {
          fetchNewMessage(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const fetchNewMessage = async (messageId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('id, content, user_id, created_at')
        .eq('id', messageId)
        .single();

      if (messageError) throw messageError;

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('username, display_name, avatar_url')
        .eq('user_id', messageData.user_id)
        .single();

      if (profileError) {
        console.warn('Could not fetch user profile:', profileError);
      }

      const newMessage = {
        id: messageData.id,
        content: messageData.content,
        user_id: messageData.user_id,
        created_at: messageData.created_at,
        user: {
          username: profileData?.username || 'Unknown',
          display_name: profileData?.display_name,
          avatar_url: profileData?.avatar_url
        },
        is_own: messageData.user_id === user.user.id
      };

      setMessages(prev => {
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });

      if (!newMessage.is_own && preferences.chat_messages && preferences.browser_notifications && currentChatId) {
        const senderName = newMessage.user.username || newMessage.user.display_name || 'Unknown User';
        await notificationService.showChatNotification(
          senderName,
          newMessage.content,
          currentChatId,
          chatType
        );
      }

      scrollToBottom();
    } catch (error) {
      console.error('Error fetching new message:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      let activeChatId = currentChatId;

      if (!activeChatId && newChatUserId) {
        const { data: chatId, error: chatError } = await supabase.rpc('create_or_get_direct_chat', {
          other_user_id: newChatUserId
        });

        if (chatError) throw chatError;

        activeChatId = chatId;
        setCurrentChatId(chatId);
        onChatCreated?.(chatId);

        setTimeout(async () => {
          await fetchChatInfo();
          await fetchMessages();
          subscribeToMessages();
        }, 100);
      }

      if (!activeChatId) return;

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          chat_id: activeChatId,
          user_id: user.user.id,
          content: newMessage.trim()
        })
        .select('id, content, user_id, created_at')
        .single();

      if (error) throw error;

      if (inserted) {
        const optimistic = {
          id: inserted.id,
          content: inserted.content,
          user_id: inserted.user_id,
          created_at: inserted.created_at,
          user: {
            username: 'You',
            display_name: undefined,
            avatar_url: undefined
          },
          is_own: true
        };
        setMessages(prev => (prev.some(m => m.id === optimistic.id) ? prev : [...prev, optimistic]));
        scrollToBottom();
      }

      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeChatId);

      setNewMessage('');
      handleStopTyping();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const fetchGroupMembers = async () => {
    if (!currentChatId || chatType !== 'group') return;

    try {
      const { data: participants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('user_id, role, joined_at')
        .eq('chat_id', currentChatId)
        .order('joined_at', { ascending: true });

      if (participantsError) throw participantsError;

      if (!participants || participants.length === 0) {
        setGroupMembers([]);
        return;
      }

      const userIds = participants.map(p => p.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url, is_online')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const membersWithProfiles = participants.map(participant => {
        const profile = profiles?.find(p => p.user_id === participant.user_id);
        return {
          user_id: participant.user_id,
          role: participant.role,
          joined_at: participant.joined_at,
          user_profiles: profile || {
            username: 'Unknown',
            display_name: 'Unknown User',
            avatar_url: null,
            is_online: false
          }
        };
      });

      setGroupMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        title: "Error",
        description: "Failed to load group members",
        variant: "destructive"
      });
    }
  };

  const updateGroupName = async () => {
    if (!currentChatId || !newGroupName.trim() || isUpdatingName) return;

    try {
      setIsUpdatingName(true);
      const { error } = await supabase
        .from('chats')
        .update({ name: newGroupName.trim() })
        .eq('id', currentChatId);

      if (error) throw error;

      setChatInfo(prev => prev ? { ...prev, name: newGroupName.trim() } : prev);

      toast({
        title: "Group updated",
        description: "Group name has been updated successfully"
      });

      setShowEditNameModal(false);
      setNewGroupName('');
    } catch (error) {
      console.error('Error updating group name:', error);
      toast({
        title: "Error",
        description: "Failed to update group name",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleShowMembers = () => {
    setShowMembersModal(true);
    fetchGroupMembers();
  };

  const handleEditName = () => {
    setNewGroupName(chatInfo?.name || '');
    setShowEditNameModal(true);
  };

  const deleteChat = async () => {
    if (!currentChatId || isDeleting) return;

    try {
      setIsDeleting(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      await supabase
        .from('messages')
        .delete()
        .eq('chat_id', currentChatId);

      await supabase
        .from('chat_participants')
        .delete()
        .eq('chat_id', currentChatId);

      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', currentChatId);

      if (error) throw error;

      toast({
        title: "Chat deleted",
        description: "The conversation has been deleted successfully",
      });

      onChatDeleted?.();
      onBack();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getChatIcon = () => {
    switch (chatType) {
      case 'group':
        return <Users size={20} color="hsl(var(--foreground))" />;
      case 'challenge':
        return <Trophy size={20} color="hsl(var(--foreground))" />;
      default:
        return <MessageCircle size={20} color="hsl(var(--foreground))" />;
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <View className="flex-row items-center gap-3">
            <Button variant="ghost" size="sm" onPress={onBack}>
              <ArrowLeft size={18} color="hsl(var(--foreground))" />
            </Button>
            <View className="flex-row items-center gap-2">
              {getChatIcon()}
              <View>
                <Text className="font-semibold text-sm font-inter">Loading...</Text>
                <Text className="text-xs text-muted-foreground font-inter">Connecting to chat</Text>
              </View>
            </View>
          </View>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Chat Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-border">
        <View className="flex-row items-center gap-3">
          <Button variant="ghost" size="sm" onPress={onBack}>
            <ArrowLeft size={18} color="hsl(var(--foreground))" />
          </Button>

          {chatInfo?.type === 'direct' && (chatInfo.other_user || newChatUserInfo) ? (
            <View className="flex-row items-center gap-3">
              <View className="relative">
                <SmartAvatar
                  avatarUrl={chatInfo.other_user?.avatar_url || newChatUserInfo?.avatar_url}
                  fallbackText={(chatInfo.other_user?.username || newChatUserInfo?.username) ||
                    (chatInfo.other_user?.display_name || newChatUserInfo?.display_name) || 'User'}
                  size="md"
                />
                {isOnlineFromLastSeen(chatInfo.other_user?.last_seen_at) && (
                  <View className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                )}
              </View>
              <View>
                <Text className="font-semibold text-sm font-inter">
                  {chatInfo.other_user?.username || newChatUserInfo?.username ||
                    chatInfo.other_user?.display_name || newChatUserInfo?.display_name || 'User'}
                </Text>
                <Text className="text-xs text-muted-foreground font-inter">
                  {isOnlineFromLastSeen(chatInfo.other_user?.last_seen_at) ? 'Active now' : 'Direct message'}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              {getChatIcon()}
              <View>
                <Text className="font-semibold text-sm font-inter">
                  {chatInfo?.name || newChatUserInfo?.username || newChatUserInfo?.display_name || 'Chat'}
                </Text>
                <Text className="text-xs text-muted-foreground font-inter">
                  {chatInfo ? `${chatInfo.participant_count} participants` : 'Start a conversation'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {currentChatId && (
          <View className="flex-row items-center gap-2">
            {chatType === 'group' && (
              <>
                <Button variant="ghost" size="sm" onPress={handleShowMembers}>
                  <Users size={18} color="hsl(var(--foreground))" />
                </Button>
                <Button variant="ghost" size="sm" onPress={handleEditName}>
                  <Pencil size={18} color="hsl(var(--foreground))" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onPress={() => setShowDeleteConfirm(true)}>
              <Trash2 size={18} color="hsl(var(--destructive))" />
            </Button>
          </View>
        )}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6">
            <Text className="text-lg font-semibold mb-2 font-inter">Delete Chat</Text>
            <Text className="text-muted-foreground mb-6 font-inter">
              Are you sure you want to delete this conversation? This action cannot be undone and will permanently remove all messages.
            </Text>
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={isDeleting}
              >
                <Text className="font-inter">Cancel</Text>
              </Button>
              <Button
                onPress={deleteChat}
                disabled={isDeleting}
                className="flex-1 bg-destructive"
              >
                <Text className="text-white font-inter">
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      {/* Members Modal */}
      <Modal
        visible={showMembersModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Users size={20} color="hsl(var(--foreground))" />
              <Text className="text-lg font-semibold font-inter">
                Group Members ({groupMembers.length})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowMembersModal(false)} className="p-2">
              <X size={20} color="hsl(var(--muted-foreground))" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            <View className="space-y-3">
              {groupMembers.map((member) => (
                <View key={member.user_id} className="flex-row items-center gap-3 p-2 rounded-lg">
                  <View className="relative">
                    <SmartAvatar
                      avatarUrl={member.user_profiles?.avatar_url}
                      fallbackText={member.user_profiles?.username || member.user_profiles?.display_name || 'User'}
                      size="md"
                    />
                    {isOnlineFromLastSeen(member.user_profiles?.last_seen_at) && (
                      <View className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </View>

                  <View className="flex-1 min-w-0">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm font-medium font-inter" numberOfLines={1}>
                        {member.user_profiles?.username || member.user_profiles?.display_name || 'Unknown User'}
                      </Text>
                      {member.role === 'admin' && (
                        <Badge variant="secondary" className="px-2 py-1">
                          <Text className="text-xs font-inter">Admin</Text>
                        </Badge>
                      )}
                    </View>
                    <Text className="text-xs text-muted-foreground font-inter" numberOfLines={1}>
                      @{member.user_profiles?.username || 'unknown'}
                    </Text>
                  </View>

                  <Text className="text-xs text-muted-foreground font-inter">
                    {isOnlineFromLastSeen(member.user_profiles?.last_seen_at) ? 'Online' : 'Offline'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Group Name Modal */}
      <Modal
        visible={showEditNameModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <View className="flex-1 bg-background">
          <View className="flex-row items-center justify-between p-4 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Pencil size={20} color="hsl(var(--foreground))" />
              <Text className="text-lg font-semibold font-inter">Edit Group Name</Text>
            </View>
            <TouchableOpacity onPress={() => setShowEditNameModal(false)} className="p-2">
              <X size={20} color="hsl(var(--muted-foreground))" />
            </TouchableOpacity>
          </View>

          <View className="p-6 space-y-4">
            <View>
              <Text className="text-sm font-medium mb-2 font-inter">Group Name</Text>
              <TextInput
                placeholder="Enter group name..."
                placeholderTextColor="hsl(var(--muted-foreground))"
                value={newGroupName}
                onChangeText={setNewGroupName}
                className="py-3 px-4 bg-background border border-input rounded-lg text-foreground font-inter"
              />
            </View>

            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => setShowEditNameModal(false)}
                className="flex-1"
              >
                <Text className="font-inter">Cancel</Text>
              </Button>
              <Button
                onPress={updateGroupName}
                disabled={!newGroupName.trim() || isUpdatingName}
                className="flex-1"
              >
                <Text className="text-white font-inter">
                  {isUpdatingName ? "Updating..." : "Update"}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="space-y-4">
          {messages.length === 0 && !currentChatId && newChatUserInfo && (
            <View className="flex flex-col items-center justify-center py-12">
              <SmartAvatar
                avatarUrl={newChatUserInfo.avatar_url}
                fallbackText={newChatUserInfo.username || newChatUserInfo.display_name || 'User'}
                size="xl"
                className="mb-4"
              />
              <Text className="text-lg font-semibold mb-2 font-inter text-center">
                {newChatUserInfo.username || newChatUserInfo.display_name}
              </Text>
              <Text className="text-muted-foreground mb-4 font-inter text-center">
                Start a conversation with {newChatUserInfo.username || newChatUserInfo.display_name}
              </Text>
            </View>
          )}
          {messages.map((message, index) => {
            const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id;
            const showTimestamp = index === 0 ||
              new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;

            return (
              <View key={message.id}>
                {showTimestamp && (
                  <View className="flex justify-center my-4">
                    <View className="bg-muted px-3 py-1 rounded-full">
                      <Text className="text-xs text-muted-foreground font-inter">
                        {formatTime(message.created_at)}
                      </Text>
                    </View>
                  </View>
                )}

                <View className={`flex-row gap-3 ${message.is_own ? 'flex-row-reverse' : ''}`}>
                  {showAvatar && !message.is_own && (
                    <SmartAvatar
                      avatarUrl={message.user.avatar_url}
                      fallbackText={message.user.username || message.user.display_name || 'User'}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  )}

                  <View className={`flex-col ${message.is_own ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {showAvatar && !message.is_own && (
                      <Text className="text-xs text-muted-foreground mb-1 font-inter">
                        {message.user.username || message.user.display_name}
                      </Text>
                    )}

                    <Card className={`p-3 ${message.is_own
                      ? 'bg-primary ml-auto'
                      : 'bg-muted'
                      }`}>
                      <Text className={`text-sm font-inter ${message.is_own ? 'text-primary-foreground' : 'text-foreground'
                        }`}>
                        {message.content}
                      </Text>
                    </Card>
                  </View>

                  {showAvatar && message.is_own && (
                    <SmartAvatar
                      avatarUrl={message.user.avatar_url}
                      fallbackText={message.user.username || message.user.display_name || 'User'}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Input */}
      <View className="p-4 border-t border-border">
        <View className="flex-row gap-2">
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            value={newMessage}
            onChangeText={(text) => {
              setNewMessage(text);
              if (text.trim()) {
                handleTyping();
              } else {
                handleStopTyping();
              }
            }}
            onKeyPress={handleKeyPress}
            onBlur={handleStopTyping}
            className="flex-1 py-3 px-4 bg-background border border-input rounded-lg text-foreground font-inter"
            multiline
            maxLength={500}
            editable={!isSending}
          />
          <Button
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="sm"
            className="px-4"
          >
            <Send size={16} color="white" />
          </Button>
        </View>
      </View>
    </View>
  );
};