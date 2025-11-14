import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { MessageCircle, Users, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { DirectMessages } from './DirectMessages';
import { GroupChats } from './GroupChats';
import { ChallengeChats } from './ChallengeChats';
import { ChatRoom } from './ChatRoom';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeChatType, setActiveChatType] = useState<'direct' | 'group' | 'challenge'>('direct');
  const [newChatUserId, setNewChatUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveChat(null);
      setNewChatUserId(null);
    }
  }, [isOpen]);

  const handleChatSelect = (chatId: string, type: 'direct' | 'group' | 'challenge') => {
    setActiveChat(chatId);
    setActiveChatType(type);
    setNewChatUserId(null);
  };

  const handleNewChatStart = (userId: string) => {
    setActiveChat(null);
    setActiveChatType('direct');
    setNewChatUserId(userId);
  };

  const handleBackToList = () => {
    setActiveChat(null);
    setNewChatUserId(null);
  };

  const handleChatCreated = (chatId: string) => {
    setActiveChat(chatId);
    setNewChatUserId(null);
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
          {!activeChat && !newChatUserId ? (
            <>
              <View className="flex-row items-center gap-2">
                <MessageCircle size={20} color="hsl(var(--foreground))" />
                <Text className="text-lg font-semibold font-inter">Messages</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={20} color="hsl(var(--muted-foreground))" />
              </TouchableOpacity>
            </>
          ) : (
            <View className="flex-row items-center justify-between w-full">
              <TouchableOpacity onPress={handleBackToList} className="p-2">
                <Text className="text-primary font-inter">Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X size={20} color="hsl(var(--muted-foreground))" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {!activeChat && !newChatUserId ? (
            // Chat List View
            <Tabs defaultValue="direct" className="flex-1">
              <View className="border-b border-border">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  className="py-4"
                >
                  <View className="flex-row gap-2">
                    <Tabs.Trigger value="direct" className="flex-row items-center gap-2 px-4 py-2 rounded-full">
                      <MessageCircle size={16} color="hsl(var(--foreground))" />
                      <Text className="font-inter">Direct</Text>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="group" className="flex-row items-center gap-2 px-4 py-2 rounded-full">
                      <Users size={16} color="hsl(var(--foreground))" />
                      <Text className="font-inter">Groups</Text>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="challenge" className="flex-row items-center gap-2 px-4 py-2 rounded-full">
                      <Trophy size={16} color="hsl(var(--foreground))" />
                      <Text className="font-inter">Challenges</Text>
                    </Tabs.Trigger>
                  </View>
                </ScrollView>
              </View>

              <View className="flex-1">
                <Tabs.Content value="direct" className="flex-1">
                  <DirectMessages
                    onChatSelect={(chatId) => handleChatSelect(chatId, 'direct')}
                    onStartNewChat={handleNewChatStart}
                  />
                </Tabs.Content>
                <Tabs.Content value="group" className="flex-1">
                  <GroupChats onChatSelect={(chatId) => handleChatSelect(chatId, 'group')} />
                </Tabs.Content>
                <Tabs.Content value="challenge" className="flex-1">
                  <ChallengeChats onChatSelect={(chatId) => handleChatSelect(chatId, 'challenge')} />
                </Tabs.Content>
              </View>
            </Tabs>
          ) : (
            // Chat Room View
            <View className="flex-1">
              <ChatRoom
                chatId={activeChat}
                newChatUserId={newChatUserId}
                chatType={activeChatType}
                onBack={handleBackToList}
                onChatCreated={handleChatCreated}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};