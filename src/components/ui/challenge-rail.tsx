import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ChallengeItem } from '@/api/challenges';
import { ChallengeCard } from './challenge-card';

interface ChallengeRailProps {
  title: string;
  challenges: ChallengeItem[];
  onChallengeClick: (challenge: ChallengeItem) => void;
  onBookmarkToggle?: (challenge: ChallengeItem) => void;
  isBookmarked?: (id: string) => boolean;
  completedChallenges?: Set<string>;
  size?: 'default' | 'compact';
  hideMetadata?: boolean;
}

export const ChallengeRail: React.FC<ChallengeRailProps> = ({
  title,
  challenges,
  onChallengeClick,
  onBookmarkToggle,
  isBookmarked,
  completedChallenges = new Set(),
  size = 'default',
  hideMetadata = false
}) => {
  if (challenges.length === 0) return null;

  const cardWidth = size === 'compact' ? 'w-28' : 'w-36';
  const gap = size === 'compact' ? 'gap-2' : 'gap-3';

  return (
    <View className="mb-6">
      <Text className={`font-bold mb-3 px-4 font-cooper-bold ${size === 'compact' ? 'text-base' : 'text-lg'}`}>
        {title}
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        className={`flex-row ${gap} px-4 pb-2`}
        contentContainerStyle={{ gap: size === 'compact' ? 8 : 12 }}
      >
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            completed={completedChallenges.has(challenge.id)}
            onPress={() => onChallengeClick(challenge)}
            onBookmarkToggle={onBookmarkToggle ? () => onBookmarkToggle(challenge) : undefined}
            isBookmarked={isBookmarked ? isBookmarked(challenge.id) : false}
            className={`${cardWidth}`}
            hideMetadata={hideMetadata}
            size={size}
          />
        ))}
      </ScrollView>
    </View>
  );
};