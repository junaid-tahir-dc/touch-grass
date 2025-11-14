import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Clock, Star, Bookmark } from "lucide-react";
import { cn } from '@/lib/utils';
import { ChallengeItem } from '@/api/challenges';

interface ChallengeCardProps {
  challenge: ChallengeItem;
  completed?: boolean;
  onPress?: () => void;
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  className?: string;
  hideMetadata?: boolean;
  size?: 'default' | 'compact';
}

// Updated to match your CSS color variables
const difficultyColors = {
  easy: 'bg-green-500/20 text-green-600',
  medium: 'bg-yellow-500/10 text-yellow-600',
  hard: 'bg-red-500/10 text-red-600'
};

// Updated to match your CSS border colors
const borderColorClasses = [
  'border-lime-500',
  'border-teal-500',
  'border-orange-500',
  'border-purple-500',
  'border-pink-500'
];

// Generate stable border color based on challenge ID
const getBorderColor = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return borderColorClasses[hash % borderColorClasses.length];
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  completed = false,
  onPress,
  onBookmarkToggle,
  isBookmarked = false,
  className,
  hideMetadata = false,
  size = 'default'
}) => {
  const borderColor = getBorderColor(challenge.id);
  
  const handleBookmarkPress = () => {
    onBookmarkToggle?.();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(
        "bg-card rounded-xl overflow-hidden border card-gradient",
        borderColor,
        className
      )}
      activeOpacity={0.7}
    >
      {/* Image Container */}
      <View className="aspect-[4/3] bg-muted relative overflow-hidden">
        {challenge.image_url ? (
          <Image 
            source={{ uri: challenge.image_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gradient-to-br from-primary to-primary/80 items-center justify-center">
            <Star color="white" size={size === 'compact' ? 16 : 20} />
          </View>
        )}
        
        {/* Bookmark Button */}
        {onBookmarkToggle && (
          <TouchableOpacity
            onPress={handleBookmarkPress}
            className={cn(
              "absolute top-1.5 left-1.5 p-1.5 rounded-full backdrop-blur-sm",
              isBookmarked 
                ? "bg-primary/90" 
                : "bg-card/90"
            )}
          >
            <Bookmark 
              size={size === 'compact' ? 10 : 12} 
              color={isBookmarked ? "white" : "hsl(var(--muted-foreground))"}
              fill={isBookmarked ? "white" : "none"}
            />
          </TouchableOpacity>
        )}
        
        {/* Completion badge */}
        {completed && (
          <View className="absolute top-1.5 right-1.5 bg-success px-1.5 py-0.5 rounded-full">
            <Text className="text-success-foreground text-xs font-medium">✓</Text>
          </View>
        )}
        
        {/* Points badge */}
        <View className="absolute bottom-1.5 right-1.5 bg-primary px-1.5 py-0.5 rounded-full">
          <Text className="text-primary-foreground text-xs font-semibold">
            {challenge.points}
          </Text>
        </View>
      </View>
      
      {/* Content */}
      <View className="p-2.5">
        <Text className="font-semibold text-xs mb-1.5 font-typewriter" numberOfLines={2}>
          {challenge.title}
        </Text>
        
        {!hideMetadata && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <Clock size={10} color="hsl(var(--muted-foreground))" />
              <Text className="text-[10px] text-muted-foreground font-typewriter">
                {challenge.duration_minutes}m
              </Text>
            </View>
            
            <View className={cn(
              "px-1.5 py-0.5 rounded-full",
              difficultyColors[challenge.difficulty]
            )}>
              <Text className="text-[10px] font-medium capitalize font-typewriter">
                {challenge.difficulty}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};