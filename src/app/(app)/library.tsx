import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Search, ExternalLink, Bookmark } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getContent, ContentItem } from '@/api/content';
import { useAdmin } from '@/hooks/use-admin';
import { formatDistanceToNow } from 'date-fns';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { toast } from '@/hooks/use-toast';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'article', label: 'Articles' },
  { key: 'video', label: 'Videos' }
];

const borderColorClasses = [
  'border-lime-500',
  'border-teal-500',
  'border-orange-500',
  'border-purple-500',
  'border-pink-500'
];

// Generate stable border color based on resource ID
const getBorderColor = (id: string) => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return borderColorClasses[hash % borderColorClasses.length];
};

export default function Library() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [resources, setResources] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [highlightedResourceId, setHighlightedResourceId] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { isAdmin } = useAdmin();
  const scrollViewRef = useRef<ScrollView>(null);
  const resourceRefs = useRef<{ [key: string]: any }>({});

  const setResourceRef = (resourceId: string) => (ref: any) => {
    resourceRefs.current[resourceId] = ref;
  };

  // Handle highlighted resource from query parameter
  useEffect(() => {
    const highlightResource = params.highlightResource as string;

    if (highlightResource && resources.length > 0) {
      setHighlightedResourceId(highlightResource);

      const scrollToResource = () => {
        const resourceElement = resourceRefs.current[highlightResource];
        if (resourceElement && scrollViewRef.current) {
          resourceElement.measureLayout(
            scrollViewRef.current.getInnerViewNode(),
            (x: number, y: number, width: number, height: number) => {
              scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
            }
          );

          setTimeout(() => {
            toast({
              title: "Found your bookmarked content! 📌",
              description: "The highlighted item is from your bookmarks"
            });
          }, 100);

          setTimeout(() => {
            setHighlightedResourceId(null);
          }, 3000);
        } else {
          setTimeout(() => {
            toast({
              title: "Content not found in current view",
              description: "Try adjusting the filters to find your bookmarked content",
              variant: "destructive"
            });
          }, 100);
        }
      };

      setTimeout(scrollToResource, 500);
    }
  }, [params.highlightResource, resources]);

  const loadResources = async () => {
    try {
      const data = await getContent({
        type: selectedFilter as any,
        query: searchQuery || undefined
      });
      setResources(data);

      if (searchQuery) {
        const { analytics } = await import('@/services/analytics');
        analytics.trackSearch(searchQuery, data.length, 'content');
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadResources();
  }, []);

  useEffect(() => {
    loadResources();
  }, [selectedFilter, searchQuery]);

  const handleResourceClick = (resource: ContentItem) => {
    router.navigate(`/content/${resource.id}`);
  };

  const handleBookmark = (resource: ContentItem) => {
    toggleBookmark({
      id: resource.id,
      type: resource.content_type,
      title: resource.title
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background">
        <Header title="Library" />
        <View className="flex items-center justify-center py-20">
          <View className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Library"
        onBack={() => router.navigate('/')}
      />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4 border-b border-border bg-card/50 space-y-3 md:space-y-0">
          <View className="flex-col md:flex-row md:items-center gap-3 md:gap-4">
            {/* Search - Full width on mobile, flexible on desktop */}
            <View className="flex-1">
              <View className="relative">
                <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <Search size={16} className="text-muted-foreground" />
                </View>
                <TextInput
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  className="pl-9 bg-card border border-input rounded-lg py-3 px-3 text-foreground font-typewriter"
                  placeholderTextColor="hsl(215 20% 30%)"
                />
              </View>
            </View>

            {/* Filters - Full width on mobile, auto width on desktop */}
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-medium text-muted-foreground font-typewriter hidden md:flex">
                Filter:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 md:flex-none">
                <View className="flex-row gap-2">
                  {filterOptions.map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setSelectedFilter(option.key)}
                      className={`px-4 py-2 rounded-full border ${selectedFilter === option.key
                          ? 'bg-primary border-primary'
                          : 'bg-card border-border'
                        }`}
                    >
                      <Text className={`font-typewriter text-sm ${selectedFilter === option.key
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                        }`}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Resources Grid */}
        <View className="p-4">
          <View className="flex flex-col md:flex-row md:flex-wrap gap-4">
            {resources.map((resource) => {
              const borderColor = getBorderColor(resource.id);
              const isArticle = resource.content_type === 'article';

              return (
                <View
                  key={resource.id}
                  ref={setResourceRef(resource.id)}
                  className={`transition-all duration-500 w-full md:w-[calc(50%-8px)] ${highlightedResourceId === resource.id
                      ? 'border-2 border-primary rounded-lg'
                      : ''
                    }`}
                >
                  <TouchableOpacity
                    onPress={() => handleResourceClick(resource)}
                    className={`
                      bg-card rounded-xl overflow-hidden border card-gradient
                      ${borderColor}
                      active:bg-muted/50 relative
                    `}
                  >
                    <View className="flex-row gap-3 p-3">
                      {/* Image */}
                      <View className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {resource.thumbnail_url ? (
                          <Image
                            source={{ uri: resource.thumbnail_url }}
                            alt={resource.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                            <ExternalLink className="text-primary-foreground" size={16} />
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View className="flex-1 pr-2">
                        <View className="flex-row items-start justify-between gap-2 mb-2">
                          <Text className="font-semibold text-card-foreground text-sm font-typewriter flex-1" numberOfLines={2}>
                            {resource.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleBookmark(resource)}
                            className="p-1"
                          >
                            <Bookmark
                              size={16}
                              className={isBookmarked(resource.id) ? 'text-primary fill-primary' : 'text-muted-foreground'}
                            />
                          </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center gap-2">
                          <View className={`
                            px-2 py-1 rounded-full
                            ${isArticle
                              ? 'bg-white border border-gray-200'
                              : 'bg-white border border-gray-200'
                            }
                          `}>
                            <Text className={`
                              text-xs font-typewriter capitalize
                              ${isArticle
                                ? 'text-gray-900'
                                : 'text-gray-900'
                              }
                            `}>
                              {resource.content_type}
                            </Text>
                          </View>

                          <Text className="text-xs text-muted-foreground font-typewriter">
                            •
                          </Text>
                          <Text className="text-xs text-muted-foreground font-typewriter" numberOfLines={1}>
                            {formatDistanceToNow(new Date(resource.published_at), { addSuffix: true })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {resources.length === 0 && (
            <View className="items-center justify-center py-16">
              <Text className="text-4xl mb-4">📚</Text>
              <Text className="text-muted-foreground font-typewriter mb-2 text-center">
                No resources found
              </Text>
              {searchQuery && (
                <Text className="text-sm text-muted-foreground font-typewriter text-center">
                  Try adjusting your search or filters
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}