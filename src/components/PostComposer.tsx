import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { X, Upload, Image as ImageIcon, Video, Type, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { createPost, CreatePostData, editPost as editSupabasePost, EditPostData } from '@/api/posts';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types';
import { validateFiles, getFileLimitText, getAcceptAttribute, formatFileSize, FileValidationError } from '@/lib/fileValidation';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';

// Validation schemas
const postContentSchema = z.object({
  content: z.string()
    .trim()
    .max(2000, 'Post content must be less than 2000 characters'),
  hasMedia: z.boolean()
}).refine(data => data.content.length > 0 || data.hasMedia, {
  message: 'Post must have either text content or media',
  path: ['content']
});

const captionSchema = z.object({
  content: z.string()
    .trim()
    .max(500, 'Caption must be less than 500 characters')
});

interface PostComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated?: () => void;
  editingPost?: Post | null;
  onClose?: () => void;
}

export function PostComposer({ open, onOpenChange, onPostCreated, editingPost, onClose }: PostComposerProps) {
  const [postType, setPostType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FileValidationError[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Initialize form with editing post data
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.body || '');
      const mediaType = editingPost.media?.type === 'image' ? 'image' :
        editingPost.media?.type === 'video' ? 'video' : 'text';
      setPostType(mediaType);
      const existingUrls = editingPost.media?.url ? [editingPost.media.url] : [];
      setExistingMediaUrls(existingUrls);
      setSelectedFiles([]);
    } else {
      resetForm();
    }
  }, [editingPost, open]);

  const handleFileSelect = async () => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (postType === 'image') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ correct enum
          allowsMultipleSelection: true,
          quality: 0.8,
          base64: false,
        });
      } else if (postType === 'video') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos, // ✅ correct enum
          allowsMultipleSelection: false,
          quality: 1,
          base64: false,
        });
      } else {
        return;
      }

      if (!result || result.canceled) return; // ✅ handles undefined + canceled safely

      const files = result.assets ?? [];
      if (files.length === 0) return;

      setValidationErrors([]);

      const fileObjects = files.map(asset => ({
        name: asset.fileName ?? `file_${Date.now()}`,
        type: asset.type === 'image' ? 'image/jpeg' : 'video/mp4',
        size: asset.fileSize ?? 0,
        uri: asset.uri,
        lastModified: Date.now(),
        webkitRelativePath: '',
      }));

      const fileType = postType;

      const validation = validateFiles(fileObjects as any, fileType, selectedFiles.length);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        toast({
          title: "File Upload Error",
          description: validation.errors[0].message,
          variant: "destructive",
        });
        return;
      }

      // Add valid files to selection
      if (fileType === 'image') {
        setSelectedFiles(prev => [...prev, ...validation.validFiles]);
      } else if (fileType === 'video') {
        setSelectedFiles(validation.validFiles); // Replace existing video
      }
    } catch (error) {
      console.error('Error picking files:', error);
      toast({
        title: "Error selecting files",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };


  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setValidationErrors([]);
  };

  const removeExistingMedia = (index: number) => {
    setExistingMediaUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const hasContent = content.trim().length > 0;
    const hasNewMedia = selectedFiles.length > 0;
    const hasExistingMedia = existingMediaUrls.length > 0;

    // Validate content based on post type
    try {
      if (postType === 'text') {
        postContentSchema.parse({
          content,
          hasMedia: hasNewMedia || hasExistingMedia
        });
      } else {
        captionSchema.parse({ content });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive"
        });
        return;
      }
    }

    if (!hasContent && !hasNewMedia && !hasExistingMedia) {
      toast({
        title: "Please add some content",
        description: "Your post needs either text or media",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingPost) {
        const editData: EditPostData = {
          content: content.trim(),
          media_type: postType,
          media_files: selectedFiles.length > 0 ? selectedFiles : undefined,
          keep_existing_media: existingMediaUrls.length > 0 && selectedFiles.length === 0,
          existing_media_urls: existingMediaUrls
        };
        await editSupabasePost(editingPost.id, editData);
      } else {
        const postData: CreatePostData = {
          content: content.trim(),
          media_type: postType,
          media_files: selectedFiles.length > 0 ? selectedFiles : undefined,
          is_anonymous: isAnonymous
        };
        const newPost = await createPost(postData);

        if (newPost?.id) {
          const { analytics } = await import('@/services/analytics');
          analytics.trackPostCreate(newPost.id, selectedFiles.length > 0);
        }
      }

      toast({
        title: editingPost ? "Post updated! ✨" : "Post created! 🎉",
        description: editingPost ? "Your changes have been saved" : "Your post has been shared with the community"
      });

      resetForm();
      onOpenChange(false);
      onPostCreated?.();

    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error creating post",
        description: error instanceof Error ? error.message : "Please try again later",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setSelectedFiles([]);
    setExistingMediaUrls([]);
    setPostType('text');
    setIsAnonymous(false);
    setValidationErrors([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
    onClose?.();
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View className="px-4 py-4 border-b border-border flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-foreground">
              {editingPost ? 'Edit Post' : 'Create a Post'}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">
              {editingPost ? 'Update your post content and media' : 'Share your thoughts, progress, or inspire others'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} className="w-8 h-8 items-center justify-center">
            <X size={20} className="text-muted-foreground" />
          </TouchableOpacity>
        </View>

        {/* Post Type Tabs */}
        <ScrollView className="flex-1 p-4">
          <View className="flex-row bg-muted/30 rounded-lg p-1 mb-4">
            {[
              { value: 'text', label: 'Text', icon: Type },
              { value: 'image', label: 'Images', icon: ImageIcon },
              { value: 'video', label: 'Video', icon: Video },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.value}
                onPress={() => {
                  setPostType(tab.value as any);
                  setSelectedFiles([]);
                }}
                className={`flex-1 flex-row items-center justify-center py-2 rounded-md ${postType === tab.value ? 'bg-background shadow-sm' : ''
                  }`}
              >
                <tab.icon size={16} className={
                  postType === tab.value ? 'text-foreground' : 'text-muted-foreground'
                } />
                <Text className={`ml-2 text-sm font-medium ${postType === tab.value ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Area */}
          {postType === 'text' && (
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  What's on your mind?
                </Text>
                <TextInput
                  placeholder="Share your thoughts, progress, or inspire others..."
                  placeholderTextColor="#6b7280"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={6}
                  className="min-h-[120px] p-3 bg-card border border-border rounded-lg text-foreground text-base"
                  maxLength={2000}
                />
                <Text className="text-xs text-muted-foreground mt-1">
                  {content.length}/2000 characters
                </Text>
              </View>
            </View>
          )}

          {(postType === 'image' || postType === 'video') && (
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  Caption (optional)
                </Text>
                <TextInput
                  placeholder={`Add a caption to your ${postType === 'image' ? 'images' : 'video'}...`}
                  placeholderTextColor="#6b7280"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={3}
                  className="min-h-[80px] p-3 bg-card border border-border rounded-lg text-foreground text-base"
                  maxLength={500}
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  {getFileLimitText(postType)}
                </Text>
                <TouchableOpacity
                  onPress={handleFileSelect}
                  className="flex-row items-center justify-center p-4 border-2 border-dashed border-border rounded-lg bg-muted/30"
                >
                  <Upload size={20} className="text-muted-foreground mr-2" />
                  <Text className="text-muted-foreground font-medium">
                    Select {postType === 'image' ? 'Images' : 'Video'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Existing Media */}
              {existingMediaUrls.length > 0 && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-2">
                    Existing {postType === 'image' ? 'Images' : 'Video'}
                  </Text>
                  {postType === 'image' ? (
                    <View className="flex-row flex-wrap gap-2">
                      {existingMediaUrls.map((url, index) => (
                        <View key={`existing-${index}`} className="relative">
                          <Image
                            source={{ uri: url }}
                            className="w-20 h-20 rounded-lg"
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeExistingMedia(index)}
                            className="absolute -top-2 -right-2 bg-destructive w-6 h-6 rounded-full items-center justify-center"
                          >
                            <X size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="relative">
                      <Image
                        source={{ uri: existingMediaUrls[0] }}
                        className="w-full h-40 rounded-lg"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removeExistingMedia(0)}
                        className="absolute top-2 right-2 bg-destructive w-8 h-8 rounded-full items-center justify-center"
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <View>
                  <Text className="text-sm text-muted-foreground mb-2">
                    New {postType === 'image' ? 'Images' : 'Video'}
                  </Text>
                  {postType === 'image' ? (
                    <View className="flex-row flex-wrap gap-2">
                      {selectedFiles.map((file, index) => (
                        <View key={`new-${index}`} className="relative">
                          <Image
                            source={{ uri: file.uri }}
                            className="w-20 h-20 rounded-lg"
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            onPress={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-destructive w-6 h-6 rounded-full items-center justify-center"
                          >
                            <X size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="relative">
                      <Image
                        source={{ uri: selectedFiles[0].uri }}
                        className="w-full h-40 rounded-lg"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removeFile(0)}
                        className="absolute top-2 right-2 bg-destructive w-8 h-8 rounded-full items-center justify-center"
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Anonymous Toggle */}
          {!editingPost && (
            <View className="flex-row items-center justify-between p-3 bg-muted/30 rounded-lg mt-4">
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  Post Anonymously
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">
                  Your identity will be hidden from other users
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsAnonymous(!isAnonymous)}
                className={`w-12 h-6 rounded-full px-1 justify-center ${isAnonymous ? 'bg-primary' : 'bg-muted'
                  }`}
              >
                <View className={`w-4 h-4 rounded-full bg-white transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'
                  }`} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-4 py-3 border-t border-border bg-background">
          <View className="flex-row justify-end gap-2">
            <TouchableOpacity
              onPress={handleClose}
              className="px-4 py-2 rounded-md border border-border"
            >
              <Text className="text-foreground font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || (!content.trim() && selectedFiles.length === 0 && existingMediaUrls.length === 0)}
              className={`px-4 py-2 rounded-md ${isSubmitting || (!content.trim() && selectedFiles.length === 0 && existingMediaUrls.length === 0)
                ? 'bg-muted'
                : 'bg-primary'
                }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-primary-foreground font-medium">
                  {editingPost ? "Update Post" : "Share Post"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}