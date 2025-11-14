import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { ChevronLeft, ChevronRight, Zap, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChallengeItem } from '@/api/challenges';
import { useRouter } from 'expo-router';
import { Badge } from './ui/badge';

interface NewChallengesCarouselProps {
  challenges: ChallengeItem[];
  onBookmarkToggle: (challenge: ChallengeItem) => void;
  isBookmarked: (challengeId: string) => boolean;
}

export function NewChallengesCarousel({ 
  challenges, 
  onBookmarkToggle, 
  isBookmarked 
}: NewChallengesCarouselProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % challenges.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + challenges.length) % challenges.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleStartChallenge = (challenge: ChallengeItem) => {
    // Track analytics
    // import('@/services/analytics').then(({ analytics }) => {
    //   analytics.trackChallengeView(challenge.id, challenge.title);
    // });
    router.navigate(`/challenge/${challenge.id}`);
  };

  if (challenges.length === 0) {
    return (
      <Card className="p-6 card-gradient">
        <View className="items-center py-8">
          <Text className="text-4xl mb-4">🌟</Text>
          <Text className="text-lg font-semibold mb-2 font-typewriter">New Challenges Coming Soon!</Text>
          <Text className="text-muted-foreground text-sm text-center font-typewriter">
            Check back for fresh challenges to help you grow.
          </Text>
        </View>
      </Card>
    );
  }

  const currentChallenge = challenges[currentIndex];

  return (
    <Card className="p-4 md:p-6 card-gradient">
      {/* Header: Title on its own line */}
      <View className="mb-4 items-center">
  <Text className="text-2xl md:text-3xl text-foreground font-cooper-bold uppercase">
    New Challenges
  </Text>
</View>


      {/* Carousel Count - Centered */}
      <View className="flex-row items-center justify-center mb-6 gap-2">
  <View className="w-2 h-2 bg-primary rounded-full" />
  <Badge variant="secondary" className="text-xs">
    <Text className="text-xs font-typewriter font-bold text-white">
      {challenges.length > 1 ? `${currentIndex + 1} of ${challenges.length}` : `${challenges.length} new`}
    </Text>
  </Badge>
</View>

      {/* Navigation Hint - Mobile Optimized */}
      {challenges.length > 1 && (
        <View className="flex-row items-center justify-center gap-2 mb-6 bg-muted/30 rounded-full py-2 px-4 md:hidden">
          <Text className="text-xs text-muted-foreground font-typewriter">
            Swipe to explore {challenges.length} challenges
          </Text>
        </View>
      )}

      {/* Desktop Navigation Hint */}
      {challenges.length > 1 && (
        <View className="hidden md:flex-row items-center justify-center gap-2 mb-6 bg-muted/30 rounded-full py-2 px-4">
          <ChevronLeft size={14} color="hsl(var(--muted-foreground))" />
          <Text className="text-xs text-muted-foreground font-typewriter">
            Swipe or tap to explore {challenges.length} challenges
          </Text>
          <ChevronRight size={14} color="hsl(var(--muted-foreground))" />
        </View>
      )}

      {/* Carousel Content */}
      <View className="relative px-0 md:px-20">
        {/* Mobile-Optimized Content */}
        <View className="md:hidden">
          <View className="mb-6">
            {/* Challenge with small image icon */}
            <View className="flex-row gap-3 mb-4">
              {currentChallenge.image_url && (
                <View className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                  <Image 
                    source={{ uri: currentChallenge.image_url }} 
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              )}
           <View className="flex-1">
  <TouchableOpacity onPress={() => handleStartChallenge(currentChallenge)}>
    <Text className="text-xl mb-2 leading-tight font-typewriter-bold">
      {currentChallenge.title}
    </Text>
  </TouchableOpacity>
</View>

            </View>
            
            <Text className="text-muted-foreground text-base mb-6 leading-relaxed font-typewriter" numberOfLines={3}>
              {currentChallenge.description}
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              className="mb-6"
            >
              <View className="flex-row gap-2">
              <Badge variant="secondary" className="px-2 py-1">
  <Text className="text-xs font-typewriter font-bold text-white">{currentChallenge.duration_minutes} min</Text>
</Badge>
<Badge variant="secondary" className="px-2 py-1">
  <Text className="text-xs font-typewriter font-bold text-white capitalize">{currentChallenge.difficulty}</Text>
</Badge>
<Badge className="bg-success px-2 py-1">
  <View className="flex-row items-center">
    <Zap size={12} color="hsl(var(--success-foreground))" className="mr-1" />
    <Text className="text-xs text-success-foreground font-typewriter font-bold">+{currentChallenge.points} XP</Text>
  </View>
</Badge>
              </View>
            </ScrollView>
          </View>

          {/* Mobile Touch-Friendly Dot Navigation */}
          {challenges.length > 1 && (
  <View className="flex-row items-center justify-center gap-4 mb-6 bg-background/60 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm mx-auto">
    {challenges.slice(0, 5).map((_, index) => (
      <TouchableOpacity
        key={index}
        onPress={() => goToSlide(index)}
        className={`w-4 h-4 rounded-full ${
          index === currentIndex 
            ? 'bg-primary scale-125' 
            : 'bg-muted'
        }`}
      />
    ))}
    {challenges.length > 5 && (
      <TouchableOpacity
        onPress={nextSlide}
        className="ml-1 p-1 rounded-full"
      >
        <ChevronRight size={16} color="hsl(var(--muted-foreground))" />
      </TouchableOpacity>
    )}
  </View>
)}

          {/* Mobile Action Buttons */}
          <View className="flex-row gap-4">
            <Button 
              onPress={() => handleStartChallenge(currentChallenge)}
              className="flex-1 bg-primary h-12"
            >
              <Text className="text-primary-foreground text-base font-semibold font-typewriter">Start Challenge</Text>
            </Button>
            <Button 
              variant="outline" 
              onPress={() => onBookmarkToggle(currentChallenge)}
              className={`px-4 h-12 ${
                isBookmarked(currentChallenge.id) 
                  ? 'bg-secondary border-secondary' 
                  : 'border-border'
              }`}
            >
              <Bookmark 
                size={18} 
                color={isBookmarked(currentChallenge.id) ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--foreground))'}
                fill={isBookmarked(currentChallenge.id) ? 'hsl(var(--secondary-foreground))' : 'none'}
              />
            </Button>
          </View>
        </View>

        {/* Desktop Content */}
<View className="hidden md:flex w-[500px] max-w-full mx-auto flex-col">
  {/* Swipe instruction text */}
  {challenges.length > 1 && (
    <View className="flex-row items-center justify-center gap-2 mb-6 bg-muted/30 rounded-full py-2 px-4">
      <ChevronLeft size={14} className="animate-bounce-horizontal" />
      <Text className="text-xs text-muted-foreground font-typewriter">
        Swipe or tap to explore {challenges.length} challenges
      </Text>
      <ChevronRight size={14} className="animate-bounce-horizontal" />
    </View>
  )}

  <View className="mb-4 relative w-full overflow-hidden">
    {/* Challenge with small image icon */}
    <View className="flex-row gap-4 mb-4">
      {currentChallenge.image_url && (
        <View className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <Image
            source={{ uri: currentChallenge.image_url }}
            className="w-full h-full"
            resizeMode="cover"
          />
        </View>
      )}
      <View className="flex-1 flex-shrink">
        <TouchableOpacity onPress={() => handleStartChallenge(currentChallenge)}>
          <Text className="text-2xl font-bold mb-2 font-typewriter">
            {currentChallenge.title}
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    <Text
      className="text-muted-foreground text-sm mb-4 leading-relaxed font-typewriter"
      style={{ flexShrink: 1, width: "100%" }}
      numberOfLines={3}
    >
      {currentChallenge.description}
    </Text>

    <View className="flex-row items-center gap-2 mb-6 flex-wrap">
      <Badge variant="secondary">
        <Text className="text-xs font-typewriter">{currentChallenge.duration_minutes}m</Text>
      </Badge>
      <Badge variant="secondary">
        <Text className="text-xs font-typewriter capitalize">{currentChallenge.difficulty}</Text>
      </Badge>
      <Badge className="bg-emerald-600 px-2 py-1">
        <View className="flex-row items-center">
          <Zap size={12} color="white" className="mr-1" />
          <Text className="text-xs text-white font-typewriter font-bold">
            +{currentChallenge.points} XP
          </Text>
        </View>
      </Badge>
    </View>

    {/* Desktop Navigation Arrows */}
    {challenges.length > 1 && (
      <>
        {/* Left Arrow */}
        <TouchableOpacity
          onPress={prevSlide}
          className="absolute left-0 top-0 z-10 h-full w-20 rounded-l-lg items-center justify-center"
          style={{
            backgroundColor: "transparent",
            backgroundImage:
              "linear-gradient(to right, rgba(20, 184, 166, 0.8), transparent)",
          }}
        >
          <View className="items-center justify-center w-full">
            <ChevronLeft size={32} color="white" />
          </View>
        </TouchableOpacity>

        {/* Right Arrow */}
        <TouchableOpacity
          onPress={nextSlide}
          className="absolute right-0 top-0 z-10 h-full w-20 rounded-r-lg items-center justify-center"
          style={{
            backgroundColor: "transparent",
            backgroundImage:
              "linear-gradient(to left, rgba(20, 184, 166, 0.8), transparent)",
          }}
        >
          <View className="items-center justify-center w-full">
            <ChevronRight size={32} color="white" />
          </View>
        </TouchableOpacity>
      </>
    )}

    {/* Desktop Dot Indicators */}
    {challenges.length > 1 && (
      <View className="flex-row items-center justify-center gap-3 mt-4 bg-background/60 rounded-full px-4 py-2 shadow-sm mx-auto">
        {challenges.slice(0, 5).map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? "bg-teal-600 shadow-md" : "bg-muted"
            }`}
          />
        ))}
        {challenges.length > 5 && (
          <TouchableOpacity onPress={nextSlide} className="ml-1 p-1 rounded-full">
            <ChevronRight size={14} color="hsl(var(--muted-foreground))" />
          </TouchableOpacity>
        )}
      </View>
    )}

    {/* Desktop Action Buttons */}
 <View className="flex-row items-center justify-center gap-3 mt-4">
  <TouchableOpacity
  onPress={() => handleStartChallenge(currentChallenge)}
  className="bg-primary h-10 px-8 rounded-md items-center justify-center"
>
  <Text className="text-primary-foreground text-sm font-semibold font-typewriter">
    Start Challenge
  </Text>
</TouchableOpacity>


  <TouchableOpacity
    onPress={() => onBookmarkToggle(currentChallenge)}
    className={`p-3 border rounded-md items-center justify-center ${
      isBookmarked(currentChallenge.id)
        ? "bg-gray-600 border-gray-600"
        : "border-gray-400"
    }`}
  >
    <Bookmark
      size={18}
      color={
        isBookmarked(currentChallenge.id)
          ? "white"
          : "hsl(var(--foreground))"
      }
      fill={isBookmarked(currentChallenge.id) ? "white" : "none"}
    />
  </TouchableOpacity>
</View>

  </View>
</View>

      </View>
    </Card>
  );
}