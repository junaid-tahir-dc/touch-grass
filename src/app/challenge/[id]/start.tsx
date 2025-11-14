import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, CheckCircle, X } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { getChallengeById, type ChallengeItem } from '@/api/challenges';
import { startChallengeSession, cancelChallengeSession } from '@/api/challengeSessions';
import { ChatModal } from '@/components/chat/ChatModal';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ChallengeStart() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [challengeChatId, setChallengeChat] = useState<string | null>(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const loadChallenge = async () => {
      if (!id) return;

      try {
        const challengeData = await getChallengeById(id);
        setChallenge(challengeData);
      } catch (error) {
        toast({
          title: "Challenge not found",
          variant: "destructive"
        });
        router.push('/challenges');
      } finally {
        setLoading(false);
      }
    };

    loadChallenge();
  }, [id]);

  // Auto-subscribe to challenge chat when starting
  useEffect(() => {
    const subscribeToChat = async () => {
      if (!challenge || !id || !supabase) return;

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data: chatId, error } = await supabase.rpc('subscribe_to_challenge_chat', {
          challenge_id_param: id,
          chat_name: `${challenge.title} Discussion`
        });

        if (error) {
          console.error('Failed to join challenge chat:', error);
          return;
        }

        setChallengeChat(chatId);
      } catch (error) {
        console.error('Error subscribing to challenge chat:', error);
      }
    };

    subscribeToChat();
  }, [challenge, id]);

  // Create challenge session when component mounts
  useEffect(() => {
    const createSession = async () => {
      if (!challenge || !id) return;

      try {
        await startChallengeSession(id);
      } catch (error) {
        console.error('Error creating challenge session:', error);
      }
    };

    createSession();
  }, [challenge, id]);

  const toggleStep = (stepIndex: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIndex)) {
      newCompleted.delete(stepIndex);
    } else {
      newCompleted.add(stepIndex);
    }
    setCompletedSteps(newCompleted);
  };

  const handleComplete = () => {
    router.push(`/challenge/${id}/submit`);
  };

  const handleCancelChallenge = async () => {
    if (!challenge || !id) return;

    try {
      await cancelChallengeSession(id);
      toast({
        title: "Challenge canceled",
        description: "You can restart this challenge anytime from the challenge page."
      });
      router.push(`/challenge/${id}`);
    } catch (error) {
      toast({
        title: "Error canceling challenge",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setShowCancelConfirm(false);
    }
  };

  const handleBack = () => {
    router.push(`/challenge/${id}`);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex items-center justify-center py-20">
          <ActivityIndicator size="large" color="hsl(var(--primary))" />
        </View>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header showBack />
        <View className="flex items-center justify-center py-20">
          <Text className="text-muted-foreground font-typewriter">Challenge not found</Text>
        </View>
      </View>
    );
  }

  // Create task steps from challenge tasks field or fallback to description
  const taskSteps = challenge.tasks
    ? challenge.tasks.split('\n').map(t => t.trim()).filter(t => t.length > 0)
    : [challenge.description];

  const progressPercentage = (completedSteps.size / taskSteps.length) * 100;

  return (
    <View className="flex-1 bg-gradient-subtle">
      <Header
        showBack
        title="In Progress"
        onBack={handleBack}
      />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Challenge Header - Full Width */}
        <Card className="p-6 card-gradient items-center mb-6">
          <View className="flex-col items-center gap-4">
            <View className="items-center">
              <TouchableOpacity onPress={() => router.push(`/challenge/${id}`)}>
                <Text className="text-xl font-bold mb-2 font-typewriter text-center">
                  {challenge.title}
                </Text>
              </TouchableOpacity>
              <Text className="text-muted-foreground text-sm font-typewriter text-center">
                Estimated time: {challenge.duration_minutes} minutes
              </Text>
            </View>
          </View>
        </Card>

        {/* Main Content */}
        <View className="space-y-6">
          {/* Task Checklist */}
          <Card className="p-6 card-gradient">
            <View className="flex-row items-center gap-2 mb-4">
              <CheckCircle size={20} color="hsl(var(--primary))" />
              <Text className="font-semibold text-lg font-typewriter">Task Checklist</Text>
            </View>

            <View className="space-y-4">
              {taskSteps.map((step, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => toggleStep(index)}
                  className="flex-row items-start gap-3 p-3 rounded-lg"
                  style={{ backgroundColor: 'hsla(var(--muted) / 0.3)' }}
                >
                  <Checkbox
                    checked={completedSteps.has(index)}
                    onChange={() => toggleStep(index)}
                    accessibilityLabel={`Mark step ${index + 1} as ${completedSteps.has(index) ? 'incomplete' : 'complete'}`} />
                  <Text
                    className={`flex-1 text-sm leading-relaxed font-typewriter ${completedSteps.has(index) ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    numberOfLines={3}
                  >
                    {step}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Progress */}
          <Card className="p-4 card-gradient">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-medium font-typewriter">Progress</Text>
              <Text className="text-xs text-muted-foreground font-typewriter">
                {completedSteps.size} / {taskSteps.length} completed
              </Text>
            </View>
            <View className="w-full bg-muted rounded-full h-2">
              <View
                className="bg-primary rounded-full h-2"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>
          </Card>

          {/* Reflection Questions */}
          {(challenge.reflection_questions && challenge.reflection_questions.length > 0) && (
            <Card className="p-6 card-gradient">
              <Text className="text-lg font-semibold font-typewriter mb-2">Reflection Prompts</Text>
              <Text className="text-xs text-muted-foreground text-center mb-4 font-typewriter">
                ⭐ You'll answer these after completing the challenge
              </Text>
              <View className="space-y-3">
                {challenge.reflection_questions.map((question, index) => (
                  <View key={index} className="flex-row items-start gap-3 p-4 rounded-lg bg-muted/30">
                    <View className="w-6 h-6 bg-primary/10 rounded-full items-center justify-center flex-shrink-0 mt-0.5">
                      <Text className="text-primary font-semibold text-xs font-typewriter">
                        {index + 1}
                      </Text>
                    </View>
                    <Text className="text-sm text-muted-foreground leading-relaxed flex-1 font-typewriter">
                      {question}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Safety Note */}
          {challenge.safety_note && (
            <Card className="p-4 card-gradient border-warning/20 bg-warning/5">
              <View className="flex-row items-start gap-3">
                <Text className="text-warning text-base">⚠️</Text>
                <View className="flex-1">
                  <Text className="font-medium text-sm mb-1 font-typewriter">Remember</Text>
                  <Text className="text-xs text-muted-foreground font-typewriter">
                    {challenge.safety_note}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Challenge Community */}
          {challengeChatId && (
            <TouchableOpacity onPress={() => setIsChatModalOpen(true)}>
              <Card className="p-4 card-gradient border-secondary/20">
                <View className="flex-row items-center gap-3 mb-3">
                  <MessageCircle size={20} color="hsl(var(--secondary))" />
                  <View className="flex-1">
                    <Text className="font-medium text-sm font-typewriter">Challenge Community</Text>
                    <Text className="text-xs text-muted-foreground font-typewriter">
                      Connect with others taking on this challenge
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground text-center font-typewriter">
                  Tap to join the discussion
                </Text>
              </Card>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View className="space-y-4">
            <Button
              onPress={handleComplete}
              className="w-full bg-primary py-4"
            >
              <Text className="font-typewriter">I'm Done! Submit Proof</Text>
            </Button>

            <Button
              variant="outline"
              onPress={() => setShowCancelConfirm(true)}
              className="w-full border-2 border-teal-500/30 py-4"
            >
              <Text className="text-teal-600 font-typewriter">Cancel Challenge</Text>
            </Button>

            <Text className="text-center text-xs text-muted-foreground font-typewriter">
              You can complete this challenge at your own pace
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelConfirm(false)}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <Card className="w-full max-w-sm p-6">
            <Text className="text-lg font-semibold mb-2 font-typewriter">Cancel Challenge?</Text>
            <Text className="text-muted-foreground mb-6 font-typewriter text-center">
              Are you sure you want to cancel this challenge? Your progress will be lost, but you can restart it anytime.
            </Text>
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                <Text className="font-typewriter">Keep Challenge</Text>
              </Button>
              <Button
                onPress={handleCancelChallenge}
                className="flex-1 bg-destructive"
              >
                <Text className="text-white font-typewriter">Cancel Challenge</Text>
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </View>
  );
}