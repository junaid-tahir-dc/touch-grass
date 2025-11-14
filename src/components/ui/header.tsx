import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useRouter } from "expo-router";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { ChatModal } from "../chat/ChatModal";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  leftAction?: React.ReactNode;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = true,
  showLogo = true,
  onBack,
  actions,
  leftAction,
  className,
}) => {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const hasUnreadMessages = useUnreadMessages();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View className={`sticky top-0 z-40 bg-white dark:bg-card border-b border-border ${className || ""}`}>
      <View className="flex-row items-center justify-between px-4 py-3">
        {/* Left side */}
        <View className="flex-row items-center min-w-0">
          {leftAction ||
            (showBack && (
              <TouchableOpacity
                onPress={handleBack}
                className="p-2 rounded-xl active:opacity-70"
                accessibilityLabel="Go back"
              >
                <ArrowLeft size={20} color="#000" />
              </TouchableOpacity>
            ))}
        </View>

        {/* Center - Logo or Title */}
        <View className="flex-1 items-center">
          {showLogo ? (
            <TouchableOpacity
              onPress={() => router.navigate("/feed")}
              className="active:opacity-70"
              accessibilityLabel="Go to home page"
            >
              <Text className="text-base font-cooper-bold text-black dark:text-white">
                TOUCH GRASS
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-base font-bold text-black dark:text-white" numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>

        {/* Right side */}
        <View className="flex-row items-center min-w-0">
          {actions || (
            <View className="relative">
              <TouchableOpacity
                onPress={() => setShowChat(true)}
                className="p-2 rounded-xl active:opacity-70"
                accessibilityLabel="Messages"
              >
                <MessageCircle size={20} color="#000" />
              </TouchableOpacity>
              {hasUnreadMessages && (
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
              )}
            </View>
          )}
        </View>
      </View>

      {/* Future modal for chat */}
      {showChat && <ChatModal isOpen={showChat} onClose={() => setShowChat(false)} />}
    </View>
  );
};
