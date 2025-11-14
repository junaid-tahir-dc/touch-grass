import React from 'react';
import { View, Text } from 'react-native';

interface TypingUser {
  user_id: string;
  username: string;
  display_name?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null;

  const getDisplayName = (user: TypingUser) => {
    return user.username || user.display_name || 'Someone';
  };

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${getDisplayName(typingUsers[0])} is typing`;
    } else if (typingUsers.length === 2) {
      return `${getDisplayName(typingUsers[0])} and ${getDisplayName(typingUsers[1])} are typing`;
    } else {
      return `${getDisplayName(typingUsers[0])} and ${typingUsers.length - 1} others are typing`;
    }
  };

  return (
    <View className="flex-row items-center gap-2 px-4 py-2">
      <View className="flex-row gap-1">
        <View className="w-1.5 h-1.5 bg-muted-foreground rounded-full opacity-60" />
        <View className="w-1.5 h-1.5 bg-muted-foreground rounded-full opacity-80" />
        <View className="w-1.5 h-1.5 bg-muted-foreground rounded-full" />
      </View>
      <Text className="text-sm text-muted-foreground font-inter">
        {getTypingText()}
      </Text>
    </View>
  );
};