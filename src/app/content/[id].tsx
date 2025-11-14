import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ExternalLink, Bookmark, Play } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getContentById, ContentItem } from '@/api/content';
import { formatDistanceToNow } from 'date-fns';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { toast } from '@/hooks/use-toast';
import { ArticleModal } from '@/components/ArticleModal';

export default function Content() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id || '6074ffd5-ad60-428c-924e-1eee20f0f0b7';

  const router = useRouter();
  const [resource, setResource] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const isAndroid = Platform.OS === 'android';

  useEffect(() => {
    const loadResource = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getContentById(id);
        setResource(data);

        // Track analytics
        if (data) {
          // const { analytics } = await import('@/services/analytics');
          // analytics.trackContentView(data.id, data.title, data.content_type);
        }
      } catch (error) {
        console.error('Error fetching resource:', error);
        toast({
          title: "Error loading content",
          description: "Failed to load the requested content",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [id]);

  const handleBookmark = () => {
    if (!resource) return;

    toggleBookmark({
      id: resource.id,
      type: resource.content_type,
      title: resource.title
    });
  };

  const handleViewOriginal = async () => {
    if (resource?.video_url) {
      try {
        // Track video play for videos
        if (resource.content_type === 'video') {
          // const { analytics } = await import('@/services/analytics');
          // analytics.trackVideoPlay(resource.id, resource.title);
        }

        const canOpen = await Linking.canOpenURL(resource.video_url);
        if (canOpen) {
          await Linking.openURL(resource.video_url);
        } else {
          Alert.alert('Error', 'Cannot open this URL');
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert('Error', 'Failed to open the video');
      }
    }
  };

  const handleReadFullArticle = () => {
    if (resource?.content_type === 'article') {
      setShowArticleModal(true);
    }
  };

  const openArticleInBrowser = async () => {
    if (!resource?.file_path) return;

    try {
      const url = resource.file_path.includes('/storage/v1/object')
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(resource.file_path)}&embedded=true`
        : resource.file_path;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening article:', error);
      Alert.alert('Error', 'Failed to open the article');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header
          title="Loading..."
          onBack={() => router.navigate('/library')}
        />
        <View className="flex items-center justify-center py-20">
          <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </View>
      </View>
    );
  }

  if (!resource) {
    return (
      <View className="flex-1 bg-background">
        <Header
          title="Content Not Found"
          onBack={() => router.navigate('/library')}
        />
        <View className="flex items-center justify-center py-20">
          <View className="items-center">
            <Text className="text-4xl mb-4">📄</Text>
            <Text className="text-muted-foreground font-typewriter">Content not found</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title={resource.content_type === 'video' ? 'Video' : 'Article'}
        onBack={() => router.navigate('/library')}
        actions={
          <TouchableOpacity
            onPress={handleBookmark}
            className={`p-2 ${isBookmarked(resource.id) ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Bookmark
              size={16}
              className={isBookmarked(resource.id) ? 'text-primary' : 'text-muted-foreground'}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView className="flex-1 p-4">
        <View className="bg-card border border-border rounded-xl p-6">
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-start gap-4 mb-4">
              {resource.thumbnail_url && (
                <View className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    source={{ uri: resource.thumbnail_url }}
                    alt={resource.title}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-xl font-bold text-card-foreground font-cooper mb-2 leading-6">
                  {resource.title}
                </Text>
                <View className="flex-row items-center gap-2">
                  <Badge variant="outline" className="bg-secondary">
                    <Text className="text-xs text-secondary-foreground font-typewriter capitalize">
                      {resource.content_type}
                    </Text>
                  </Badge>
                  <Text className="text-sm text-muted-foreground font-typewriter">•</Text>
                  <Text className="text-sm text-muted-foreground font-typewriter">
                    {formatDistanceToNow(new Date(resource.published_at), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="space-y-6">
            {resource.content_type === 'video' ? (
              <View className="bg-muted rounded-lg p-8 items-center">
                <Play size={64} className="text-muted-foreground mb-4" />
                <Text className="font-semibold text-foreground font-typewriter mb-2 text-center">
                  Video Content
                </Text>
                <Text className="text-muted-foreground font-typewriter mb-4 text-center">
                  Video content is available at the original source
                </Text>
                <Button onPress={handleViewOriginal} className="flex-row  bg-primary items-center gap-2">
                  <ExternalLink size={16} className="text-primary-foreground" />
                  <Text className="text-primary-foreground font-typewriter">Watch on Original Site</Text>
                </Button>
              </View>
            ) : (
              <View className="bg-muted rounded-lg p-8 items-center">
                <Text className="text-4xl mb-4">📄</Text>
                <Text className="font-semibold text-foreground font-typewriter mb-2 text-center">
                  Article Content
                </Text>
                <Text className="text-muted-foreground font-typewriter mb-4 text-center">
                  {resource.content || resource.file_path ?
                    "Click below to read the full article in a clean, readable format" :
                    "Full article content is available at the original source"
                  }
                </Text>
                {resource.content || resource.file_path ? (
                  resource.file_path && isAndroid ? (
                    <Button onPress={openArticleInBrowser} className="flex-row items-center bg-primary gap-2">
                      <Text className="text-4xl mr-2">📄</Text>
                      <Text className="text-primary-foreground font-typewriter">Read Full Article</Text>
                    </Button>
                  ) : (
                    <Button onPress={handleReadFullArticle} className="flex-row  bg-primary  items-center gap-2">
                      <Text className="text-4xl mr-2">📄</Text>
                      <Text className="text-primary-foreground font-typewriter">Read Full Article</Text>
                    </Button>
                  )
                ) : (
                  <Button onPress={handleViewOriginal} className="flex-row items-center  bg-primary gap-2">
                    <ExternalLink size={16} className="text-primary-foreground" />
                    <Text className="text-primary-foreground font-typewriter">Read Full Article</Text>
                  </Button>
                )}
              </View>
            )}

            {/* Content/Summary */}
            <View>
              {resource.content ? (
                <Text className="text-foreground font-typewriter leading-6 whitespace-pre-wrap">
                  {resource.content}
                </Text>
              ) : resource.summary ? (
                <Text className="text-muted-foreground font-typewriter leading-6">
                  {resource.summary}
                </Text>
              ) : (
                <Text className="text-muted-foreground font-typewriter leading-6">
                  This is a preview of the {resource.content_type}.
                  {resource.content_type === 'video' && resource.video_url &&
                    " Click the button above to watch the video."}
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Article Modal */}
      {resource && (
        <ArticleModal
          isOpen={showArticleModal}
          onClose={() => setShowArticleModal(false)}
          article={resource}
        />
      )}
    </View>
  );
}