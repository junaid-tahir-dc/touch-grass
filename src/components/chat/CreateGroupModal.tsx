import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { Users, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartAvatar } from '@/components/ui/smart-avatar';
import { UserSearchModal } from './UserSearchModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { isOnlineFromLastSeen } from '@/lib/utils';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (groupId: string) => void;
}

interface SelectedUser {
  user_id: string;
  username: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  last_seen_at?: string | null;
}


const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(100, "Group name must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters").optional()
});

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setGroupName('');
      setDescription('');
      setSelectedUsers([]);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    try {
      groupSchema.parse({
        name: groupName,
        description: description || undefined
      });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { name?: string; description?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'name') fieldErrors.name = err.message;
          if (err.path[0] === 'description') fieldErrors.description = err.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleAddUser = async (userId: string) => {
    try {
      // Check if user is already selected
      if (selectedUsers.find(u => u.user_id === userId)) {
        toast({
          title: "User already added",
          description: "This user is already in the group",
          variant: "destructive"
        });
        return;
      }

      // Fetch user details
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, username, display_name, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setSelectedUsers(prev => [...prev, data]);
      setShowUserSearch(false);
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: "Failed to add user to group",
        variant: "destructive"
      });
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.user_id !== userId));
  };

  const createGroup = async () => {
    if (!validateForm()) return;

    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please add at least one user to the group",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Create the group chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          type: 'group',
          name: groupName.trim(),
          description: description.trim() || null,
          created_by: user.user.id
        })
        .select('id')
        .single();

      if (chatError) throw chatError;

      // Add creator as admin
      const { error: creatorError } = await supabase
        .from('chat_participants')
        .insert({
          chat_id: chat.id,
          user_id: user.user.id,
          role: 'admin'
        });

      if (creatorError) throw creatorError;

      // Add all selected users using the function
      const userIds = selectedUsers.map(u => u.user_id);
      const { error: participantError } = await supabase.rpc('add_chat_participants', {
        p_chat_id: chat.id,
        p_user_ids: userIds
      });

      if (participantError) throw participantError;

      toast({
        title: "Group created",
        description: `${groupName} has been created successfully`
      });

      onGroupCreated(chat.id);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-background">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-border">
            <View className="flex-row items-center gap-2">
              <Users size={20} color="hsl(var(--foreground))" />
              <Text className="text-base font-semibold font-inter">Create Group Chat</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={20} color="hsl(var(--muted-foreground))" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
          >
            <View className="space-y-5">
              {/* Group Details */}
              <View className="space-y-4">
                <View className="space-y-2">
                  <Text className="text-sm font-medium font-inter">Group Name *</Text>
                  <TextInput
                    placeholder="Enter group name..."
                    placeholderTextColor="hsl(var(--muted-foreground))"
                    value={groupName}
                    onChangeText={setGroupName}
                    className={`py-3 px-4 bg-background border rounded-lg text-foreground font-inter ${errors.name ? "border-destructive" : "border-input"
                      }`}
                  />
                  {errors.name && (
                    <Text className="text-xs text-destructive font-inter">{errors.name}</Text>
                  )}
                </View>

                <View className="space-y-2">
                  <Text className="text-sm font-medium font-inter">Description (Optional)</Text>
                  <TextInput
                    placeholder="Describe what this group is about..."
                    placeholderTextColor="hsl(var(--muted-foreground))"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    className={`py-3 px-4 bg-background border rounded-lg text-foreground font-inter ${errors.description ? "border-destructive" : "border-input"
                      }`}
                    style={{ textAlignVertical: 'top', minHeight: 80 }}
                  />
                  {errors.description && (
                    <Text className="text-xs text-destructive font-inter">{errors.description}</Text>
                  )}
                </View>
              </View>

              {/* Add Members */}
              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium font-inter">
                    Members ({selectedUsers.length})
                  </Text>
                  <Button
                    onPress={() => setShowUserSearch(true)}
                    size="sm"
                    variant="outline"
                    className="flex-row gap-1.5 h-8 px-3"
                  >
                    <Plus size={14} color="hsl(var(--foreground))" />
                    <Text className="text-foreground font-inter">Add Member</Text>
                  </Button>
                </View>

                {selectedUsers.length === 0 ? (
                  <Card className="p-6 items-center justify-center border-dashed border-border">
                    <Users size={24} color="hsl(var(--muted-foreground))" className="mb-2" />
                    <Text className="text-sm text-muted-foreground font-inter text-center">
                      No members added yet
                    </Text>
                  </Card>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    showsVerticalScrollIndicator={false}
                    className="pr-1"
                  >
                    <View className="space-y-2">
                      {selectedUsers.map((user) => (
                        <Card key={user.user_id} className="p-3 bg-card">
                          <View className="flex-row items-center gap-3">
                            <View className="relative">
                              <SmartAvatar
                                avatarUrl={user.avatar_url}
                                fallbackText={user.username || user.display_name || 'User'}
                                size="sm"
                                className="flex-shrink-0"
                              />
                              {isOnlineFromLastSeen(user.last_seen_at) && (
                                <View className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
                              )}
                            </View>

                            <View className="flex-1 min-w-0 space-y-0.5">
                              <Text className="text-sm font-medium leading-none font-inter" numberOfLines={1}>
                                {user.username || user.display_name}
                              </Text>
                              <Text className="text-xs text-muted-foreground leading-none font-inter" numberOfLines={1}>
                                @{user.username}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleRemoveUser(user.user_id)}
                              className="p-1.5 rounded-md"
                              style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)' }}
                            >
                              <Trash2 size={14} color="hsl(var(--destructive))" />
                            </TouchableOpacity>
                          </View>
                        </Card>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="px-6 py-4 border-t border-border bg-background">
            <View className="flex-row gap-3">
              <Button
                variant="outline"
                onPress={onClose}
                className="flex-1 h-10"
                disabled={isCreating}
              >
                <Text className="font-inter">Cancel</Text>
              </Button>
              <Button
                onPress={createGroup}
                disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
                className="flex-1 h-10"
              >
                <Text className="text-white font-inter">
                  {isCreating ? "Creating..." : "Create Group"}
                </Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onSelectUser={handleAddUser}
      />
    </>
  );
};