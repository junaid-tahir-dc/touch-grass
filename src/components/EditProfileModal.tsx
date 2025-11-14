import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserProfile, updateUserProfile } from '@/api/user';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

// Validation schema
const profileSchema = z.object({
  display_name: z.string()
    .trim()
    .min(1, { message: "Display name is required" })
    .max(50, { message: "Display name must be less than 50 characters" }),
  username: z.string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must be less than 30 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }),
  bio: z.string()
    .trim()
    .max(160, { message: "Bio must be less than 160 characters" })
    .optional()
});

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onUpdate: (updatedProfile: UserProfile) => void;
  editField?: 'display_name' | 'username' | 'bio';
}

export function EditProfileModal({
  isOpen,
  onClose,
  userProfile,
  onUpdate,
  editField = 'display_name'
}: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    display_name: userProfile?.display_name || '',
    username: userProfile?.username || '',
    bio: userProfile?.bio || ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (userProfile) {
      setFormData({
        display_name: userProfile.display_name || '',
        username: userProfile.username || '',
        bio: userProfile.bio || ''
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    try {
      // Validate the form data
      const validation = profileSchema.safeParse(formData);
      if (!validation.success) {
        toast({
          title: "Validation Error",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      setLoading(true);

      // Update only the fields that have changed
      const updates: Partial<UserProfile> = {};

      if (editField === 'display_name' && formData.display_name !== userProfile?.display_name) {
        updates.display_name = formData.display_name;
      } else if (editField === 'username' && formData.username !== userProfile?.username) {
        // Check if username is already taken by another user
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('user_id, username')
          .eq('username', formData.username.toLowerCase())
          .maybeSingle();

        if (existingUser && existingUser.user_id !== userProfile?.user_id) {
          toast({
            title: "Username taken",
            description: "This username is already in use. Please choose another one.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        updates.username = formData.username.toLowerCase();
      } else if (editField === 'bio' && formData.bio !== userProfile?.bio) {
        updates.bio = formData.bio;
      }

      if (Object.keys(updates).length === 0) {
        toast({
          title: "No changes",
          description: "No changes were made to your profile"
        });
        onClose();
        return;
      }

      const updatedProfile = await updateUserProfile(updates);

      if (updatedProfile) {
        onUpdate(updatedProfile);
        toast({
          title: "Profile updated",
          description: "Your profile has been successfully updated"
        });
        onClose();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = () => {
    switch (editField) {
      case 'display_name': return 'Display Name';
      case 'username': return 'Username';
      case 'bio': return 'Bio';
      default: return 'Field';
    }
  };

  const getFieldPlaceholder = () => {
    switch (editField) {
      case 'display_name': return 'Enter your display name';
      case 'username': return 'Enter your username';
      case 'bio': return 'Tell others about yourself...';
      default: return '';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center p-4">
        <View className="bg-background border border-border rounded-xl w-full max-w-md">
          {/* Header */}
          <View className="p-6 border-b border-border">
            <Text className="text-lg font-semibold text-center">
              Edit {getFieldLabel()}
            </Text>
          </View>

          <ScrollView className="p-6">
            <View className="space-y-4">
              <View>
                <Label className="mb-2">
                  <Text className="text-sm font-medium">{getFieldLabel()}</Text>
                </Label>

                {editField === 'bio' ? (
                  <TextInput
                    value={formData[editField]}
                    onChangeText={(value) => handleInputChange(editField, value)}
                    placeholder={getFieldPlaceholder()}
                    placeholderTextColor="#9CA3AF"
                    multiline={true}
                    numberOfLines={4}
                    maxLength={160}
                    className="border border-border rounded-lg p-3 text-foreground min-h-[100px] text-base leading-5"
                    textAlignVertical="top"
                  />
                ) : (
                  <TextInput
                    value={formData[editField]}
                    onChangeText={(value) => handleInputChange(editField, value)}
                    placeholder={getFieldPlaceholder()}
                    placeholderTextColor="#9CA3AF"
                    maxLength={editField === 'display_name' ? 50 : 30}
                    className="border border-border rounded-lg p-3 text-foreground text-base"
                  />
                )}

                {editField === 'username' && (
                  <Text className="text-xs text-muted-foreground mt-2">
                    Letters, numbers, and underscores only
                  </Text>
                )}

                {editField === 'bio' && (
                  <Text className="text-xs text-muted-foreground mt-2 text-right">
                    {formData.bio.length}/160 characters
                  </Text>
                )}
              </View>

              <View className="flex-row gap-3 pt-4">
                <Button
                  variant="outline"
                  onPress={onClose}
                  className="flex-1"
                >
                  <Text className="text-sm font-medium">Cancel</Text>
                </Button>
                <Button
                  onPress={handleSave}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
                  ) : null}
                  <Text className="text-white text-sm font-medium">
                    Save Changes
                  </Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}