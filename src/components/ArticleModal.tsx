import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Linking,
  Alert,
  Platform 
} from 'react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, ExternalLink } from 'lucide-react';
import { ContentItem } from '@/api/content';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ContentItem;
}

export function ArticleModal({ isOpen, onClose, article }: ArticleModalProps) {
  const handleOpenInBrowser = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open the URL');
    }
  };

  const handleDownload = async () => {
    if (!article.file_path) return;
    
    try {
      const canOpen = await Linking.canOpenURL(article.file_path);
      if (canOpen) {
        await Linking.openURL(article.file_path);
      } else {
        Alert.alert('Error', 'Cannot download this file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      Alert.alert('Error', 'Failed to download the file');
    }
  };

  // Print functionality is not available in React Native
  const handlePrint = () => {
    Alert.alert('Print', 'Print functionality is not available in the app. Please use the share feature instead.');
  };

  const renderFilePreview = () => {
    if (!article.file_path) return null;

    const rawUrl = article.file_path;
    let fileExtension = '';
    
    try {
      const u = new URL(rawUrl);
      const pathname = u.pathname || '';
      fileExtension = pathname.split('.').pop()?.toLowerCase() || '';
    } catch {
      const pathNoQuery = rawUrl.split('?')[0].split('#')[0];
      fileExtension = pathNoQuery.split('.').pop()?.toLowerCase() || '';
    }

    // Handle images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
      return (
        <View className="w-full h-80 items-center justify-center p-4">
          <Image
            source={{ uri: rawUrl }}
            alt="Attached document preview"
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>
      );
    }

    // For PDFs and documents, show download option
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(fileExtension)) {
      return (
        <View className="w-full items-center justify-center p-8">
          <Text className="text-6xl mb-4">📄</Text>
          <Text className="text-lg font-medium text-foreground font-typewriter mb-2 text-center">
            Document File
          </Text>
          <Text className="text-sm text-muted-foreground font-typewriter mb-4 text-center">
            {fileExtension.toUpperCase()} file - Tap below to open
          </Text>
          <Button 
            onPress={() => handleOpenInBrowser(rawUrl)}
            variant="outline"
            className="flex-row items-center gap-2"
          >
            <Download size={16} className="text-foreground" />
            <Text className="text-foreground font-typewriter">Open Document</Text>
          </Button>
        </View>
      );
    }

    // Fallback for other file types
    return (
      <View className="w-full items-center justify-center p-8">
        <Text className="text-6xl mb-4">📄</Text>
        <Text className="text-lg font-medium text-foreground font-typewriter mb-2 text-center">
          Document File
        </Text>
        <Text className="text-sm text-muted-foreground font-typewriter mb-4 text-center">
          This file type can be opened in another app
        </Text>
        <Button 
          onPress={() => handleOpenInBrowser(rawUrl)}
          variant="outline"
          className="flex-row items-center gap-2"
        >
          <Download size={16} className="text-foreground" />
          <Text className="text-foreground font-typewriter">Open File</Text>
        </Button>
      </View>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex-1 max-w-full max-h-full">
        {/* Modal Header */}
        <View className="flex-row items-center justify-between p-6 border-b border-border bg-card">
          <View className="flex-1 pr-4">
            <DialogTitle className="text-xl font-bold text-card-foreground font-cooper">
              {article.title}
            </DialogTitle>
            <View className="flex-row items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-secondary">
                <Text className="text-xs text-secondary-foreground font-typewriter capitalize">
                  {article.content_type}
                </Text>
              </Badge>
              <Text className="text-sm text-muted-foreground font-typewriter">•</Text>
              <Text className="text-sm text-muted-foreground font-typewriter">
                {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            {article.file_path && (
              <>
                <TouchableOpacity
                  onPress={() => handleOpenInBrowser(article.file_path!)}
                  className="p-2 active:bg-muted rounded-lg"
                >
                  <ExternalLink size={16} className="text-muted-foreground" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDownload}
                  className="p-2 active:bg-muted rounded-lg"
                >
                  <Download size={16} className="text-muted-foreground" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={handlePrint}
              className="p-2 active:bg-muted rounded-lg"
            >
              <Printer size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Article Content */}
        <View className="flex-1 bg-background">
          <ScrollView className="flex-1 p-6">
            {article.file_path ? (
              <View className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Document Header */}
                <View className="flex-row items-center justify-between p-4 bg-muted/50 border-b border-border">
                  <View className="flex-row items-center gap-2">
                    <View className="w-6 h-6 bg-primary/10 rounded items-center justify-center">
                      <Text>📄</Text>
                    </View>
                    <Text className="text-sm font-medium text-foreground font-typewriter">
                      Attached Document
                    </Text>
                  </View>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onPress={() => handleOpenInBrowser(article.file_path!)}
                    className="flex-row items-center gap-1"
                  >
                    <Download size={14} className="text-foreground" />
                    <Text className="text-foreground font-typewriter text-xs">Open</Text>
                  </Button>
                </View>
                
                {/* Document Preview */}
                <View className="bg-muted/20 min-h-80">
                  {renderFilePreview()}
                </View>
              </View>
            ) : article.content ? (
              <View>
                <Text 
                  className="text-foreground font-typewriter leading-7 text-base whitespace-pre-wrap"
                >
                  {article.content}
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center py-16">
                <Text className="text-4xl mb-4">📄</Text>
                <Text className="text-lg text-muted-foreground font-typewriter mb-2 text-center">
                  No content available
                </Text>
                <Text className="text-sm text-muted-foreground font-typewriter text-center">
                  This article may be available at the original source.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </DialogContent>
    </Dialog>
  );
}