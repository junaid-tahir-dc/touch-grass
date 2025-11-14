import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Sparkles, Trophy, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturesComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeaturesComingSoonModal: React.FC<FeaturesComingSoonModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-4">
        <View className="bg-card rounded-lg w-full max-w-md border border-border">
          {/* Header */}
          <View className="p-6 border-b border-border">
            <View className="flex-row items-center gap-2 mb-2">
              <Sparkles color="#0000ff" size={24} />
              <Text className="text-xl font-bold">Features Coming Soon!</Text>
            </View>
            <Text className="text-muted-foreground text-center">
              We're working hard to bring you exciting new features
            </Text>
          </View>
          
          {/* Features List */}
          <View className="p-6 gap-4">
            <View className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Trophy color="orange" size={20} />
              <View className="flex-1">
                <Text className="font-medium">Achievement Badges</Text>
                <Text className="text-sm text-muted-foreground">
                  Unlock badges for completing challenges
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Star color="#0000ff" size={20} />
              <View className="flex-1">
                <Text className="font-medium">Progress Tracking</Text>
                <Text className="text-sm text-muted-foreground">
                  Detailed insights into your journey
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Sparkles color="#6b7280" size={20} />
              <View className="flex-1">
                <Text className="font-medium">And Much More!</Text>
                <Text className="text-sm text-muted-foreground">
                  Stay tuned for more amazing features
                </Text>
              </View>
            </View>
          </View>
          
          {/* Button */}
          <View className="p-6 pt-0">
            <Button onPress={onClose} className="w-full">
              <Text className="text-white font-medium">Got it!</Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};