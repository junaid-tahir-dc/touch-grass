import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Home, Trash2 } from 'lucide-react';
import { z } from 'zod';

const deleteConfirmationSchema = z.object({
  confirmation: z.string().refine(
    (val) => val === "DELETE MY ACCOUNT",
    { message: "Please type 'DELETE MY ACCOUNT' to confirm" }
  ),
});

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDeleteAccount = async () => {
    setErrors({});

    // Validate confirmation text
    const validation = deleteConfirmationSchema.safeParse({ confirmation });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        fieldErrors[field] = error.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsDeleting(true);

    try {
      // Get current user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('No authenticated user found');
      }

      // Ensure we have a valid session token for the Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call Edge Function to delete user account with proper admin privileges
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { token: session.access_token },
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: "Account deleted successfully",
        description: "Your account and all associated data have been permanently deleted"
      });

      // Navigate to home page
      router.navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: "Failed to delete account",
        description: error.message || "Please contact support for assistance",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGoHome = () => {
    onClose();
    router.navigate('/');
  };

  const handleClose = () => {
    setConfirmation('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-background border border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex-row items-center gap-2">
            <AlertTriangle size={20} color="#EF4444" />
            <Text className="text-lg font-semibold text-destructive">Delete Account</Text>
          </DialogTitle>
        </DialogHeader>

        <ScrollView className="max-h-96">
          <View className="space-y-4">
            {/* Warning Message */}
            <View className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Text className="font-semibold text-destructive mb-2">⚠️ This action cannot be undone!</Text>
              <Text className="text-sm text-muted-foreground mb-2">
                Deleting your account will permanently remove:
              </Text>
              <View className="ml-4 space-y-1">
                <Text className="text-sm text-muted-foreground">• Your profile and personal information</Text>
                <Text className="text-sm text-muted-foreground">• All your posts and comments</Text>
                <Text className="text-sm text-muted-foreground">• Your challenge progress and submissions</Text>
                <Text className="text-sm text-muted-foreground">• All chat messages and conversations</Text>
                <Text className="text-sm text-muted-foreground">• Your bookmarks and saved content</Text>
              </View>
            </View>

            {/* Alternatives */}
            <View className="p-4 bg-muted/30 rounded-lg">
              <Text className="font-medium mb-2">Consider these alternatives:</Text>
              <Text className="text-sm text-muted-foreground mb-2">
                • Take a break and come back later
              </Text>
              <Text className="text-sm text-muted-foreground mb-2">
                • Update your privacy settings instead
              </Text>
              <Text className="text-sm text-muted-foreground">
                • Contact support if you're having issues
              </Text>
            </View>

            {/* Confirmation Input */}
            <View className="space-y-2">
              <Label className="text-sm">
                <Text>
                  To confirm deletion, type <Text className="font-semibold text-destructive">"DELETE MY ACCOUNT"</Text> below:
                </Text>
              </Label>
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                placeholder="DELETE MY ACCOUNT"
                placeholderTextColor="#9CA3AF"
                editable={!isDeleting}
                className={`
                  border rounded-lg p-3 text-foreground text-base
                  ${errors.confirmation ? 'border-destructive' : 'border-border'}
                  ${isDeleting ? 'opacity-50' : ''}
                `}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {errors.confirmation && (
                <Text className="text-sm text-destructive">{errors.confirmation}</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onPress={handleGoHome}
                disabled={isDeleting}
                className="flex-1"
              >
                <View className="flex-row items-center gap-2">
                  <Home size={16} color="#6B7280" />
                  <Text className="text-sm font-medium">Take me home</Text>
                </View>
              </Button>
              <Button
                onPress={handleDeleteAccount}
                disabled={isDeleting || confirmation !== "DELETE MY ACCOUNT"}
                variant="destructive"
                className="flex-1"
              >
                <View className="flex-row items-center gap-2">
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Trash2 size={16} color="#FFFFFF" />
                  )}
                  <Text className="text-white text-sm font-medium">
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Text>
                </View>
              </Button>
            </View>
          </View>
        </ScrollView>
      </DialogContent>
    </Dialog>
  );
}