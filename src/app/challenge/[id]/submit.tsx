import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Upload, FileText, MessageCircle, Video, Eye, EyeOff, X } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { getChallengeById, type ChallengeItem } from '@/api/challenges';
import { completeChallengeSession } from '@/api/challengeSessions';
import { createPost, uploadPostMedia } from '@/api/posts';
import { toast } from '@/hooks/use-toast';
import { validateSingleImage, formatFileSize, FileValidationError, getAcceptAttribute } from '@/lib/fileValidation';
import { ChatModal } from '@/components/chat/ChatModal';
import { supabase } from '@/integrations/supabase/client';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system";


interface ReactNativeFile {
  uri: string;
  type: string;
  name: string;
  size: number;
}

export default function ChallengeSubmit() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [challenge, setChallenge] = useState<ChallengeItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<ReactNativeFile | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<ReactNativeFile | null>(null);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

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

  const handlePhotoUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        toast({
          title: "Permission Required",
          description: "Please allow access to your photos to upload images",
          variant: "destructive",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });


      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imageUri = asset.uri;


        const file: ReactNativeFile = {
          uri: imageUri,
          type: asset.mimeType || 'image/png',
          name: asset.fileName || `photo_${Date.now()}.png`,
          size: asset.fileSize || 0,
        };


        const validation = validateSingleImage(file as any);

        if (!validation.isValid) {
          setValidationErrors(validation.errors);
          toast({
            title: "Image Upload Error",
            description: validation.errors[0].message,
            variant: "destructive"
          });
          return;
        }

        setPhotoUrl(imageUri);
        setSelectedFile(file);


        toast({
          title: "Photo uploaded! 📸",
          description: "Looking good!"
        });
      }

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };


  const handleVideoUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        toast({
          title: "Permission Required",
          description: "Please allow access to your media to upload videos",
          variant: "destructive"
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        setValidationErrors([]);

        if (!asset.type?.startsWith('video')) {
          toast({
            title: "Invalid file type",
            description: "Please select a video file",
            variant: "destructive"
          });
          return;
        }

        if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: "Please select a video smaller than 50MB",
            variant: "destructive"
          });
          return;
        }

        const file: ReactNativeFile = {
          uri: asset.uri,
          type: asset.type || 'video/mp4',
          name: `video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
        };

        setVideoUrl(asset.uri);
        setSelectedVideoFile(file);

        toast({
          title: "Video uploaded! 🎥",
          description: "Great capture!"
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setSelectedFile(null);
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setSelectedVideoFile(null);
  };

  const handleSubmit = async () => {
    if (!challenge) return;

    const hasPhoto = !!photoUrl;
    const hasVideo = !!videoUrl;
    const hasDescription = !!description.trim();

    let isValid = false;
    let errorMessage = "";

    switch (challenge.media_requirement) {
      case 'photo':
        isValid = hasPhoto;
        errorMessage = "This challenge requires a photo submission";
        break;
      case 'video':
        isValid = hasVideo;
        errorMessage = "This challenge requires a video submission";
        break;
      case 'none':
      default:
        isValid = hasPhoto || hasVideo || hasDescription;
        errorMessage = "Add a photo, video, or description to submit";
        break;
    }

    if (!isValid) {
      toast({
        title: "Submission Required",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const mediaFiles: ReactNativeFile[] = [];
      let mediaType: 'text' | 'image' | 'video' = 'text';

      if (selectedFile) {
        mediaFiles.push(selectedFile);
        mediaType = 'image';
      } else if (selectedVideoFile) {
        mediaFiles.push(selectedVideoFile);
        mediaType = 'video';
      }

      const postContent = description.trim()
        ? description.trim()
        : `✅ Completed this challenge!`;

      const newPost = await createPost({
        content: postContent,
        media_type: mediaType,
        media_files: mediaFiles.length > 0 ? (mediaFiles as any) : undefined,
        is_anonymous: isAnonymous,
        challenge_id: challenge.id
      });

      const { analytics } = await import('@/services/analytics');
      analytics.trackChallengeSubmit(challenge.id, challenge.title);
      if (newPost?.id) {
        analytics.trackPostCreate(newPost.id, mediaFiles.length > 0);
      }

      const submissions = JSON.parse(localStorage?.getItem('touchgrass_submissions') || '[]');
      const newSubmission = {
        challengeId: challenge.id,
        text: description.trim() || undefined,
        photoUrl: photoUrl || undefined,
        videoUrl: videoUrl || undefined,
        submittedAt: new Date().toISOString(),
        pointsAwarded: challenge.points
      };

      submissions.push(newSubmission);
      localStorage?.setItem('touchgrass_submissions', JSON.stringify(submissions));

      const { data: { user } } = await supabase.auth.getUser();
      const { count: previousCompletions } = await supabase
        .from('user_challenge_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id || '')
        .eq('challenge_id', challenge.id)
        .not('completed_at', 'is', null);

      const isRepeatCompletion = (previousCompletions || 0) > 0;

      try {
        const { data: activeSession } = await supabase
          .from('user_challenge_sessions')
          .select('id')
          .eq('user_id', user?.id || '')
          .eq('challenge_id', challenge.id)
          .eq('is_active', true)
          .is('completed_at', null)
          .maybeSingle();

        if (activeSession?.id) {
          await supabase
            .from('user_challenge_sessions')
            .delete()
            .eq('user_id', user?.id || '')
            .eq('challenge_id', challenge.id)
            .eq('is_active', false);

          await supabase
            .from('user_challenge_sessions')
            .update({
              completed_at: new Date().toISOString(),
              is_active: false,
              posted_anonymously: isAnonymous
            })
            .eq('id', activeSession.id);
        } else {
          await completeChallengeSession(challenge.id, isAnonymous);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('challenge-sessions-changed'));
        }
      } catch (sessionError) {
        console.warn('Could not complete session, but post was created:', sessionError);
      }

      if (isRepeatCompletion) {
        toast({
          title: "Amazing work! 🎉",
          description: "Great job practicing and building this habit!"
        });
      } else {
        toast({
          title: "Amazing work! 🎉",
          description: `+${challenge.points} XP earned and shared with the community!`
        });
      }

      router.push(`/challenge/${id}/reflect`);
    } catch (error) {
      console.error('Submission error:', error);

      let errorMessage = 'Please try again';

      if (error instanceof Error) {
        errorMessage = error.message;

        if (error.message.includes('fetch')) {
          errorMessage = 'Network error - check your connection and try again';
        } else if (error.message.includes('size')) {
          errorMessage = 'File is too large - please try a smaller image';
        } else if (error.message.includes('format') || error.message.includes('type')) {
          errorMessage = 'Invalid file format - please use JPG, PNG, or HEIC';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Upload failed - please check your connection and try again';
        }
      }

      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSubmissionRequirements = () => {
    switch (challenge?.media_requirement) {
      case 'photo':
        return !photoUrl;
      case 'video':
        return !videoUrl;
      case 'none':
      default:
        return !photoUrl && !videoUrl && !description.trim();
    }
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

  return (
    <View className="flex-1 bg-gradient-subtle">
      <Header showBack title="Submit Proof" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Card className="p-6 card-gradient mb-6">
          <View className="flex-col md:flex-row md:items-center md:justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xl font-bold mb-2 font-typewriter">{challenge.title}</Text>
              <Text className="text-muted-foreground text-sm font-typewriter">
                Show us how you completed this challenge!
              </Text>
            </View>

            <View className="flex items-center justify-center p-4 bg-primary/10 rounded-lg md:min-w-[140px] mt-4 md:mt-0">
              <View className="text-center">
                <Text className="text-2xl font-bold text-primary mb-1 font-typewriter">+{challenge.points}</Text>
                <Text className="text-xs text-muted-foreground font-typewriter">XP Points</Text>
              </View>
            </View>
          </View>
        </Card>

        <View className="space-y-6">
          <Card className="p-6 card-gradient">
            <View className="flex-row items-center gap-2 mb-4">
              <FileText size={18} color="hsl(var(--foreground))" />
              <Text className="text-base font-medium font-typewriter">
                Description {challenge.media_requirement !== 'none' && '(Optional)'}
              </Text>
            </View>

            <TextInput
              placeholder="Tell us about your experience... What happened? How did it feel? Any surprises?"
              placeholderTextColor="hsl(var(--muted-foreground))"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              className="py-3 px-4 bg-background border border-input rounded-lg text-foreground font-typewriter mb-4"
              style={{ textAlignVertical: 'top', minHeight: 120 }}
              maxLength={500}
            />

            <Text className="text-xs text-muted-foreground text-right font-typewriter">
              {description.length}/500 characters
            </Text>
          </Card>

          {(challenge.media_requirement === 'photo' || challenge.media_requirement === 'none') && (
            <Card className="p-6 card-gradient">
              <View className="flex-row items-center gap-2 mb-4">
                <Camera size={18} color="hsl(var(--foreground))" />
                <Text className="text-base font-medium font-typewriter">
                  {challenge.media_requirement === 'photo' ? 'Photo Required' : 'Photo Proof (Recommended)'}
                </Text>
              </View>

              {photoUrl ? (
                <View className="relative mb-4">
                  <View className="w-full mb-4 aspect-square bg-gray-200 rounded-xl overflow-hidden">
                    <Image
                      source={{ uri: photoUrl }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={handleRemovePhoto}
                    className="absolute top-2 right-2 bg-black/80 rounded-full p-2"
                  >
                    <X size={16} color="white" />
                  </TouchableOpacity>
                  {selectedFile && (
                    <View className="absolute bottom-2 left-2 bg-black/80 rounded-lg px-3 py-2">
                      <Text className="text-white text-xs font-typewriter">
                        {selectedFile.name}
                      </Text>
                      <Text className="text-white/80 text-xs font-typewriter">
                        {formatFileSize(selectedFile.size)}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="mb-4">
                  <TouchableOpacity
                    onPress={handlePhotoUpload}
                    className="border-2 border-dashed border-muted rounded-xl p-8 items-center justify-center"
                  >
                    <Camera size={32} color="hsl(var(--muted-foreground))" className="mb-4" />
                    <Text className="text-muted-foreground mb-4 text-center font-typewriter">
                      {challenge.media_requirement === 'photo'
                        ? 'Upload a photo to complete this challenge'
                        : 'Share a photo of your challenge experience'
                      }
                    </Text>
                  </TouchableOpacity>
                  <View className="mt-4">
                    <Button onPress={handlePhotoUpload} variant="outline" className="w-full">
                      <Upload size={16} color="hsl(var(--foreground))" className="mr-2" />
                      <Text className="font-typewriter">Choose Photo</Text>
                    </Button>
                  </View>
                </View>
              )}

              <Text className="text-xs mt-6 text-muted-foreground font-typewriter">
                {challenge.media_requirement === 'photo'
                  ? 'A photo is required to complete this challenge'
                  : 'Photos help inspire others and build community connections'
                }
              </Text>
            </Card>
          )}

          {challenge.media_requirement === 'video' && (
            <Card className="p-6 card-gradient">
              <View className="flex-row items-center gap-2 mb-4">
                <Video size={18} color="hsl(var(--foreground))" />
                <Text className="text-base font-medium font-typewriter">Video Required</Text>
              </View>

              {videoUrl ? (
                <View className="relative mb-4">
                  <View className="w-full aspect-square bg-black rounded-xl items-center justify-center">
                    <Video size={48} color="white" />
                    <Text className="text-white mt-2 font-typewriter">Video Selected</Text>
                    {selectedVideoFile && (
                      <Text className="text-white/80 text-xs mt-1 font-typewriter">
                        {selectedVideoFile.name} • {formatFileSize(selectedVideoFile.size)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={handleRemoveVideo}
                    className="absolute top-2 right-2 bg-black/70 rounded-full p-1"
                  >
                    <X size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="mb-4">
                  <TouchableOpacity
                    onPress={handleVideoUpload}
                    className="border-2 border-dashed border-muted rounded-xl p-8 items-center justify-center"
                  >
                    <Video size={32} color="hsl(var(--muted-foreground))" className="mb-4" />
                    <Text className="text-muted-foreground mb-4 text-center font-typewriter">
                      Upload a video to complete this challenge
                    </Text>
                  </TouchableOpacity>
                  <View className="mt-4">
                    <Button onPress={handleVideoUpload} variant="outline" className="w-full">
                      <Upload size={16} color="hsl(var(--foreground))" className="mr-2" />
                      <Text className="font-typewriter">Choose Video</Text>
                    </Button>
                  </View>
                </View>
              )}

              <Text className="text-xs text-muted-foreground font-typewriter">
                A video is required to complete this challenge
              </Text>
            </Card>
          )}

          <Card className="p-4 card-gradient">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                {isAnonymous ? (
                  <EyeOff size={16} color="hsl(var(--muted-foreground))" />
                ) : (
                  <Eye size={16} color="hsl(var(--primary))" />
                )}
                <View className="flex-1">
                  <Text className="font-medium text-sm mb-1 font-typewriter">
                    Anonymous Posting
                  </Text>
                  <Text className="text-xs text-muted-foreground font-typewriter">
                    {isAnonymous
                      ? '🔒 Toggle is ON - Your name will be hidden from the community'
                      : '👤 Toggle is OFF - Your name will be visible to the community'}
                  </Text>
                </View>
              </View>
            </View>
          </Card>

          <TouchableOpacity onPress={() => setIsChatModalOpen(true)}>
            <Card className="p-4 card-gradient border-secondary/20 bg-secondary/5">
              <View className="flex-row items-center gap-3 mb-2">
                <MessageCircle size={16} color="hsl(var(--secondary))" />
                <Text className="font-medium text-sm font-typewriter">Share with the Community</Text>
              </View>
              <Text className="text-xs text-muted-foreground font-typewriter">
                Tap here to join the challenge discussion! Others would love to hear about your journey.
              </Text>
            </Card>
          </TouchableOpacity>

          <Card className="p-4 card-gradient border-muted">
            <Text className="text-sm text-muted-foreground text-center font-typewriter">
              {challenge.media_requirement === 'photo' && 'A photo is required to submit this challenge'}
              {challenge.media_requirement === 'video' && 'A video is required to submit this challenge'}
              {challenge.media_requirement === 'none' && 'You need at least a photo, video, or description to submit'}
            </Text>
          </Card>

          <Card className="p-4 card-gradient">
            <Button
              onPress={handleSubmit}
              disabled={submitting || getSubmissionRequirements()}
              className="w-full bg-primary py-4"
            >
              {submitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator size="small" color="white" className="mr-2" />
                  <Text className="font-typewriter">Submitting...</Text>
                </View>
              ) : (
                <Text className="font-typewriter text-base">Submit & Continue</Text>
              )}
            </Button>
          </Card>
        </View>
      </ScrollView>

      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </View>
  );
}