import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Crown,
  MoreHorizontal,
  Trash2,
  X,
  Plus,
  Camera,
  Settings,
  Edit3,
  Flame,
  Bookmark
} from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCurrentUserProfile, UserProfile } from '@/api/user';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { useAdmin } from '@/hooks/use-admin';
import { EditProfileModal } from '@/components/EditProfileModal';
import { ChangePasswordModal } from '@/components/ChangePasswordModal';
import { DeleteAccountModal } from '@/components/DeleteAccountModal';
import { NotificationSettings } from '@/components/NotificationSettings';
import { FollowersModal } from '@/components/FollowersModal';
import { z } from 'zod';
import tailwindConfig from 'tailwind.config';

// Input validation schema
const interestSchema = z.object({
  interest: z.string()
    .trim()
    .min(1, { message: "Interest cannot be empty" })
    .max(50, { message: "Interest must be less than 50 characters" })
    .regex(/^[a-zA-Z0-9\s&-]+$/, { message: "Interest can only contain letters, numbers, spaces, & and -" })
});

export default function Profile() {
  const router = useRouter();
  const { } = useBookmarks();
  const { isAdmin } = useAdmin();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedChallenges, setCompletedChallenges] = useState(0);
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editField, setEditField] = useState<'display_name' | 'username' | 'bio'>('display_name');
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleAddInterest = () => {
    try {
      const validation = interestSchema.safeParse({ interest: newInterest });
      if (!validation.success) {
        toast({
          title: "Invalid interest",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      const trimmedInterest = newInterest.trim();
      if (userInterests.includes(trimmedInterest)) {
        toast({
          title: "Duplicate interest",
          description: "This interest already exists",
          variant: "destructive"
        });
        return;
      }

      if (userInterests.length >= 10) {
        toast({
          title: "Too many interests",
          description: "You can only have up to 10 interests",
          variant: "destructive"
        });
        return;
      }

      const updatedInterests = [...userInterests, trimmedInterest];
      setUserInterests(updatedInterests);
      setNewInterest('');

      toast({
        title: "Interest added",
        description: `${trimmedInterest} has been added to your interests`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add interest",
        variant: "destructive"
      });
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    const updatedInterests = userInterests.filter(interest => interest !== interestToRemove);
    setUserInterests(updatedInterests);

    toast({
      title: "Interest removed",
      description: `${interestToRemove} has been removed from your interests`
    });
  };

  const handleToggleLeaderboard = async () => {
    if (!userProfile) return;

    const newValue = !showOnLeaderboard;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ show_on_leaderboard: newValue })
        .eq('user_id', userProfile.user_id);

      if (error) throw error;

      setShowOnLeaderboard(newValue);

      toast({
        title: newValue ? "Added to leaderboard" : "Removed from leaderboard",
        description: newValue ? "Your progress is now visible to others" : "Your progress is now private"
      });
    } catch (error) {
      console.error('Error updating leaderboard setting:', error);
      toast({
        title: "Error",
        description: "Failed to update leaderboard setting. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleClearAllInterests = () => {
    setUserInterests([]);
    toast({
      title: "All interests cleared",
      description: "All interests have been removed"
    });
  };

  const handleImageUpload = async () => {
    Alert.alert('Feature Coming Soon', 'Image upload will be available in the next update');
  };

  const refreshProfileCounts = async () => {
    try {
      const profile = await getCurrentUserProfile();
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const profile = await getCurrentUserProfile();
        setUserProfile(profile);
        setUserInterests(profile?.interests || []);
        setShowOnLeaderboard(profile?.show_on_leaderboard || false);

        if (profile?.user_id) {
          const { count } = await supabase
            .from('user_challenge_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .not('completed_at', 'is', null);
          setCompletedChallenges(count || 0);
        } else {
          setCompletedChallenges(0);
        }

      } catch (error) {
        toast({
          title: "Error loading profile",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);
  const primaryColor = tailwindConfig?.theme?.extend?.colors?.primary.DEFAULT;


  if (loading) {

    return (

      <View className="flex-1 bg-gradient-subtle">
        <Header title="Profile" />
        <View className="flex items-center justify-center py-20">
          <ActivityIndicator size="large" className={primaryColor} />
        </View>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <View className="flex-1 bg-gradient-subtle">
        <Header title="Profile" />
        <View className="flex items-center justify-center py-20">
          <Text className="text-muted-foreground">Profile not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-subtle pb-20">
      <Header title="Profile" />

      <ScrollView className="p-4 space-y-6" showsVerticalScrollIndicator={false}>
        <Card className="p-6 mb-6 card-gradient border-2 border-secondary rounded-xl">
          <View className="items-center">
            <View className="relative mb-3">
              <TouchableOpacity
                className="w-20 h-20 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full items-center justify-center mx-auto overflow-hidden shadow-lg"
                onPress={() => router.navigate(`/user/${userProfile?.user_id}`)}
                activeOpacity={0.8}
              >
                {userProfile?.avatar_url && userProfile.avatar_url.startsWith('http') ? (
                  <Image
                    source={{ uri: userProfile.avatar_url }}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : userProfile?.avatar_url ? (
                  <Text className="text-3xl font-bold text-white">
                    {userProfile.avatar_url}
                  </Text>
                ) : (
                  <Text className="text-3xl font-bold text-white">
                    {(userProfile?.username || userProfile?.display_name || 'U').charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-secondary rounded-full items-center justify-center shadow-lg border-2 border-background"
                onPress={handleImageUpload}
                disabled={isUploadingImage}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" className={primaryColor} />
                ) : (
                  <Camera size={14} className="text-muted-foreground" />
                )}
              </TouchableOpacity>
            </View>
            <Text className="text-3xl mb-2 font-cooper text-foreground text-center">
              {userProfile?.username || userProfile?.display_name?.split(' ')[0] || 'friend'}! 👋
            </Text>
            <Text className="text-muted-foreground text-lg text-center">
              @{userProfile?.username || 'user'}
            </Text>

            {userProfile && (
              <View className="flex-row gap-4 mt-3 items-center">
                <TouchableOpacity
                  onPress={() => setFollowersModalOpen(true)}
                  className="flex-row items-center"
                >
                  <Text className="font-semibold text-foreground">{userProfile.follower_count || 0}</Text>
                  <Text className="text-muted-foreground"> followers</Text>
                </TouchableOpacity>
                <View className="h-4 w-px bg-border" />
                <TouchableOpacity
                  onPress={() => setFollowingModalOpen(true)}
                  className="flex-row items-center"
                >
                  <Text className="font-semibold text-foreground">{userProfile.following_count || 0}</Text>
                  <Text className="text-muted-foreground"> following</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Card>

        {/* Admin Panel Access */}
        {isAdmin && (
          <Card className="p-6 mb-6 card-gradient border-2 border-primary/20 rounded-xl">
            <View className="flex-row items-center gap-2 mb-4">
              <Crown size={20} className="text-warning" />
              <Text className="font-semibold text-foreground">Admin Panel</Text>
            </View>
            <Text className="text-sm text-muted-foreground mb-4">
              You have admin access to manage content and challenges
            </Text>
            <Button
              onPress={() => router.navigate('/admin')}
              className="w-full"
            >
              <Text className="text-primary-foreground font-medium">Open Admin Panel</Text>
            </Button>
          </Card>
        )}

        {/* Account Settings */}
        <Card className="p-6 mb-6 card-gradient rounded-xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Settings size={20} className="text-primary" />
            <Text className="font-semibold text-foreground">Account Settings</Text>
          </View>

          <View className="space-y-4">
            {/* Profile Information */}
            <View className="p-4 bg-muted/30 rounded-lg">
              <Text className="font-medium text-sm mb-3 text-foreground">Profile Information</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm font-medium text-foreground">Display Name</Text>
                    <Text className="text-xs text-muted-foreground">{userProfile?.display_name || 'Not set'}</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditField('display_name');
                      setEditModalOpen(true);
                    }}
                  >
                    <Edit3 size={14} className="text-muted-foreground" />
                  </Button>
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm font-medium text-foreground">Username</Text>
                    <Text className="text-xs text-muted-foreground">@{userProfile?.username || 'user'}</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditField('username');
                      setEditModalOpen(true);
                    }}
                  >
                    <Edit3 size={14} className="text-muted-foreground" />
                  </Button>
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm font-medium text-foreground">Bio</Text>
                    <Text className="text-xs text-muted-foreground">{userProfile?.bio || 'Add a bio to tell others about yourself'}</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      setEditField('bio');
                      setEditModalOpen(true);
                    }}
                  >
                    <Edit3 size={14} className="text-muted-foreground" />
                  </Button>
                </View>
              </View>
            </View>

            {/* Notification Settings */}
            <View className="p-4 bg-muted/30 rounded-lg">
              <NotificationSettings />
            </View>

            {/* App Preferences */}
            <View className="p-4 bg-muted/30 rounded-lg">
              <Text className="font-medium text-sm mb-3 text-foreground">App Preferences</Text>
              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm font-medium text-foreground">Theme</Text>
                    <Text className="text-xs text-muted-foreground">System default</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      toast({
                        title: "Feature Coming Soon!",
                        description: "Theme customization will be available in a future update."
                      });
                    }}
                  >
                    <Text className="text-sm text-foreground">Change</Text>
                  </Button>
                </View>

                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-sm font-medium text-foreground">Language</Text>
                    <Text className="text-xs text-muted-foreground">English</Text>
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      toast({
                        title: "Feature Coming Soon!",
                        description: "Language selection will be available in a future update."
                      });
                    }}
                  >
                    <Text className="text-sm text-foreground">Change</Text>
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {/* Interests */}
        <Card className="p-6 mb-6 card-gradient rounded-xl">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-semibold text-foreground">Interests</Text>
            <TouchableOpacity
              onPress={() => setDropdownVisible(true)}
              className="h-8 w-8 items-center justify-center"
            >
              <MoreHorizontal size={16} className="text-foreground" />
            </TouchableOpacity>
          </View>

          {/* Dropdown Menu Modal */}
          <Modal
            visible={dropdownVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity
              className="flex-1 bg-black/50 justify-center items-center"
              activeOpacity={1}
              onPress={() => setDropdownVisible(false)}
            >
              <View className="bg-background border border-border rounded-lg p-1 w-48">
                {/* Add Interest Option */}
                <TouchableOpacity
                  className="flex-row items-center px-3 py-2 rounded-sm active:bg-accent"
                  onPress={() => {
                    setDropdownVisible(false);
                    setIsEditingInterests(true);
                  }}
                >
                  <Plus size={14} className="text-foreground mr-2" />
                  <Text className="text-foreground">Add Interest</Text>
                </TouchableOpacity>

                {/* Clear All Option */}
                {userInterests.length > 0 && (
                  <TouchableOpacity
                    className="flex-row items-center px-3 py-2 rounded-sm active:bg-accent border-t border-border"
                    onPress={handleClearAllInterests}
                  >
                    <Trash2 size={14} className="text-destructive mr-2" />
                    <Text className="text-destructive">Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Add Interest Modal */}
          <Modal
            visible={isEditingInterests}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsEditingInterests(false)}
          >
            <View className="flex-1 bg-black/50 justify-center items-center p-4">
              <View className="bg-background border border-border rounded-lg p-6 w-full max-w-sm">
                <Text className="text-lg font-semibold mb-4 text-foreground">Add New Interest</Text>

                <View className="space-y-4">
                  <View>
                    <TextInput
                      placeholder="Enter your interest..."
                      value={newInterest}
                      onChangeText={setNewInterest}
                      className="border border-border rounded-lg p-3 text-foreground bg-background"
                      placeholderTextColor="hsl(var(--muted-foreground))"
                      maxLength={50}
                      onSubmitEditing={handleAddInterest}
                      autoFocus
                    />
                    <Text className="text-xs text-muted-foreground mt-1">
                      {newInterest.length}/50 characters
                    </Text>
                  </View>

                  <View className="flex-row justify-end gap-2">
                    <Button
                      variant="outline"
                      onPress={() => {
                        setIsEditingInterests(false);
                        setNewInterest('');
                      }}
                      className="px-4 py-2"
                    >
                      <Text className="text-foreground">Cancel</Text>
                    </Button>
                    <Button
                      onPress={handleAddInterest}
                      className="px-4 py-2"
                      disabled={!newInterest.trim()}
                    >
                      <Text className="text-primary-foreground">Add Interest</Text>
                    </Button>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Interests List */}
          {userInterests.length > 0 ? (
            <View className="flex-row flex-wrap gap-2">
              {userInterests.map((interest) => (
                <View key={interest} className="relative">
                  <Badge variant="secondary" className="pr-6">
                    <Text className="text-foreground">{interest}</Text>
                  </Badge>
                  <TouchableOpacity
                    className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full items-center justify-center"
                    onPress={() => handleRemoveInterest(interest)}
                  >
                    <X size={10} className="text-destructive-foreground" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View className="items-center py-8">
              <Text className="text-2xl mb-2">🎯</Text>
              <Text className="text-sm text-muted-foreground">No interests added yet</Text>
              <Text className="text-xs mt-1 text-muted-foreground text-center">
                Add interests to help us personalize your experience
              </Text>
            </View>
          )}
        </Card>

        {/* Leaderboard Settings */}
        <Card className="p-6 mb-6 card-gradient rounded-xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Crown size={20} className="text-warning" />
            <Text className="font-semibold text-foreground">Leaderboard Settings</Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center justify-between p-4 bg-muted/30 rounded-lg">
              <View className="flex-1">
                <Text className="font-medium text-sm text-foreground">Show on Leaderboard</Text>
                <Text className="text-xs text-muted-foreground">Let others see your progress and compete with you</Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleLeaderboard}
                className={`w-12 h-6 rounded-full p-1 ${showOnLeaderboard ? 'bg-primary' : 'bg-muted'}`}
              >
                <View className={`w-4 h-4 bg-background rounded-full shadow-sm ${showOnLeaderboard ? 'ml-6' : 'ml-0'}`} />
              </TouchableOpacity>
            </View>

            <Button
              onPress={() => router.navigate('/leaderboard')}
              className="w-full"
              variant="outline"
            >
              <Crown size={16} className="text-muted-foreground mr-2" />
              <Text className="text-foreground">View Leaderboard</Text>
            </Button>

            <View className="items-center p-4 bg-primary/10 rounded-lg">
              <Text className="text-sm text-muted-foreground mb-2">Community Feature</Text>
              <Text className="font-semibold text-lg text-foreground">Compete & Connect</Text>
              <Text className="text-xs text-muted-foreground text-center">
                See how you stack up against other challenge enthusiasts
              </Text>
            </View>
          </View>
        </Card>

        {/* Badges */}
        <TouchableOpacity onPress={() => setBadgesModalOpen(true)}>
          <Card className="p-6 mb-6 card-gradient rounded-xl">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="font-semibold text-foreground">Badges</Text>
              <Text className="text-xs text-muted-foreground">Tap to view</Text>
            </View>
            <View className="items-center p-6 bg-muted/30 rounded-lg">
              <Text className="text-4xl mb-2">🏆</Text>
              <Text className="text-muted-foreground text-sm text-center">
                Badges coming soon!
              </Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Account Security */}
        <Card className="p-6 mb-6 card-gradient rounded-xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Settings size={20} className="text-primary" />
            <Text className="font-semibold text-foreground">Security</Text>
          </View>
          <View className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onPress={() => setChangePasswordModalOpen(true)}
            >
              <Text className="text-sm text-foreground">Change Password</Text>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onPress={async () => {
                try {
                  const { error } = await supabase.auth.signOut();
                  if (error) throw error;
                  router.navigate('/auth');
                  toast({
                    title: "Signed out",
                    description: "You have been successfully signed out"
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to sign out",
                    variant: "destructive"
                  });
                }
              }}
            >
              <Text className="text-sm text-foreground">Sign Out</Text>
            </Button>
          </View>
        </Card>

        {/* Privacy & Data */}
        <Card className="p-6 mb-6 card-gradient rounded-xl">
          <View className="flex-row items-center gap-2 mb-4">
            <Settings size={20} className="text-primary" />
            <Text className="font-semibold text-foreground">Privacy & Data</Text>
          </View>
          <View className="space-y-3">
            <Button
              variant="destructive"
              className="w-full justify-start"
              onPress={() => setDeleteAccountModalOpen(true)}
            >
              <Text className="text-sm text-destructive-foreground">Delete Account</Text>
            </Button>
          </View>
        </Card>

        {/* Legal Links */}
        <View className="flex-row justify-between px-4 py-6">
          <TouchableOpacity onPress={() => router.navigate('/community-guidelines')}>
            <Text className="text-xs text-muted-foreground">Community Guidelines</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.navigate('/terms')}>
            <Text className="text-xs text-muted-foreground">Terms & Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.navigate('/privacy')}>
            <Text className="text-xs text-muted-foreground">Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        userProfile={userProfile}
        onUpdate={setUserProfile}
        editField={editField}
      />

      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />

      <DeleteAccountModal
        isOpen={deleteAccountModalOpen}
        onClose={() => setDeleteAccountModalOpen(false)}
      />

      <Modal
        visible={badgesModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBadgesModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-background border border-border rounded-lg p-6 w-full max-w-sm">
            <Text className="text-lg font-semibold text-center mb-4 text-foreground">Badges</Text>
            <View className="items-center py-4">
              <Text className="text-6xl mb-4">🚀</Text>
              <Text className="text-lg font-semibold mb-2 text-center text-foreground">Feature Coming Soon!</Text>
              <Text className="text-muted-foreground text-sm text-center">
                We're working on an amazing badge system where you'll be able to earn and showcase your achievements. Stay tuned!
              </Text>
            </View>
            <Button
              onPress={() => setBadgesModalOpen(false)}
              className="mt-4 bg-primary"
            >
              <Text className="text-primary-foreground">Close</Text>
            </Button>
          </View>
        </View>
      </Modal>

      {/* Followers Modals */}
      {userProfile && (
        <FollowersModal
          open={followersModalOpen}
          onOpenChange={setFollowersModalOpen}
          userId={userProfile.user_id}
          type="followers"
          title="Your Followers"
          onCountsUpdate={refreshProfileCounts}
        />
      )}

      {userProfile && (
        <FollowersModal
          open={followingModalOpen}
          onOpenChange={setFollowingModalOpen}
          userId={userProfile.user_id}
          type="following"
          title="Following"
          onCountsUpdate={refreshProfileCounts}
        />
      )}
    </View>
  );
}