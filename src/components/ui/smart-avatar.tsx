import React from "react";
import { View, Text, Image } from "react-native";
import { cn } from "@/lib/utils";

interface SmartAvatarProps {
  avatarUrl?: string | null;
  fallbackText?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12", 
  xl: "h-16 w-16",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

/**
 * SmartAvatar component that handles both URL-based images and emoji avatars
 * If avatar_url is a valid HTTP URL, it displays it as an image
 * If avatar_url is an emoji or text, it displays it directly
 * Falls back to the first character of fallbackText if no avatar
 */
export const SmartAvatar: React.FC<SmartAvatarProps> = ({
  avatarUrl,
  fallbackText = "?",
  className,
  size = "md",
}) => {
  const isValidUrl = avatarUrl && avatarUrl.startsWith("http");

  return (
    <View className={cn(
      "bg-gradient-to-br from-blue-500 via-blue-400 to-blue-600 rounded-full items-center justify-center overflow-hidden",
      sizeClasses[size],
      className
    )}>
      {isValidUrl ? (
        <Image 
          source={{ uri: avatarUrl }} 
          className="w-full h-full rounded-full"
          resizeMode="cover"
        />
      ) : avatarUrl ? (
        <Text className={cn("font-bold text-white", textSizeClasses[size])}>
          {avatarUrl}
        </Text>
      ) : (
        <View className="w-full h-full bg-gray-300 rounded-full items-center justify-center">
          <Text className={cn("font-bold text-gray-600", textSizeClasses[size])}>
            {fallbackText?.charAt(0) || '?'}
          </Text>
        </View>
      )}
    </View>
  );
};