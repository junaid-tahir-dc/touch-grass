import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  RefreshControl 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bookmark, Search, ExternalLink, Trash2 } from 'lucide-react';
import { Header } from '@/components/ui/header';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookmarkDeleteModal } from '@/components/BookmarkDeleteModal';
import { useBookmarks } from '@/hooks/use-bookmarks';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { getChallengeById } from '@/api/challenges';
import { getPostById } from '@/api/posts';
import { getContentById } from '@/api/content';

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'posts', label: 'Posts' },
  { key: 'articles', label: 'Articles' },
  { key: 'videos', label: 'Videos' }
];

interface BookmarkedItem {
  id: string;
  type: 'challenge' | 'post' | 'article' | 'video';
  title: string;
  savedAt: string;
}

export default function Bookmarks() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [query, setQuery] = useState<string>('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { bookmarks, removeBookmarkSilent } = useBookmarks();

  // Validate bookmarks against database and remove deleted items or fix bad titles
  useEffect(() => {
    const validateBookmarks = async () => {
      const invalidBookmarks: string[] = [];
      const bookmarksToUpdate: Array<{ id: string; newTitle: string }> = [];
      
      for (const bookmark of bookmarks) {
        try {
          let isValid = false;
          let needsTitleFix = bookmark.title === '...' || bookmark.title === '…' || bookmark.title.trim().length < 3;
          
          if (bookmark.type === 'challenge') {
            const challenge = await getChallengeById(bookmark.id);
            isValid = challenge !== null && !!challenge?.title;
            if (isValid && needsTitleFix && challenge?.title) {
              bookmarksToUpdate.push({ id: bookmark.id, newTitle: challenge.title });
            }
          } else if (bookmark.type === 'post') {
            const post = await getPostById(bookmark.id);
            isValid = post !== null && (!!post?.content || (post?.media_urls && post.media_urls.length > 0));
            if (isValid && needsTitleFix) {
              const raw = (post?.content || '').trim();
              let title = 'Community post';
              if (raw.length > 0) {
                title = raw.length > 50 ? raw.slice(0, 50) + '…' : raw;
              } else if (post?.media_urls?.[0]?.includes('image')) {
                title = 'Image post';
              } else if (post?.media_urls?.[0]?.includes('video')) {
                title = 'Video post';
              }
              bookmarksToUpdate.push({ id: bookmark.id, newTitle: title });
            }
          } else if (bookmark.type === 'article' || bookmark.type === 'video') {
            const content = await getContentById(bookmark.id);
            isValid = content !== null && !!content?.title;
            if (isValid && needsTitleFix && content?.title) {
              bookmarksToUpdate.push({ id: bookmark.id, newTitle: content.title });
            }
          }
          
          if (!isValid) {
            invalidBookmarks.push(bookmark.id);
          }
        } catch (error) {
          console.error(`Error validating bookmark ${bookmark.id}:`, error);
          invalidBookmarks.push(bookmark.id);
        }
      }
      
      // Update bookmarks with fixed titles
      if (bookmarksToUpdate.length > 0) {
        const updatedBookmarks = bookmarks.map(b => {
          const update = bookmarksToUpdate.find(u => u.id === b.id);
          return update ? { ...b, title: update.newTitle } : b;
        });
        // Update your storage mechanism here (AsyncStorage, etc.)
      }
      
      // Remove all invalid bookmarks
      if (invalidBookmarks.length > 0) {
        console.log(`Removing ${invalidBookmarks.length} invalid bookmark(s)`);
        invalidBookmarks.forEach(id => removeBookmarkSilent(id));
        
        toast({
          title: "Bookmarks cleaned up",
          description: `Removed ${invalidBookmarks.length} corrupted or deleted item${invalidBookmarks.length > 1 ? 's' : ''}`,
        });
      }
    };
    
    if (bookmarks.length > 0) {
      validateBookmarks();
    }
  }, [bookmarks.length]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // Add any refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const filteredItems: BookmarkedItem[] = useMemo(() => {
    const list: BookmarkedItem[] = bookmarks.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      savedAt: b.savedAt,
    }));

    const byType = activeFilter === 'all' ? list : list.filter((b) => {
      if (activeFilter === 'challenges') return b.type === 'challenge';
      if (activeFilter === 'posts') return b.type === 'post';
      if (activeFilter === 'articles') return b.type === 'article';
      if (activeFilter === 'videos') return b.type === 'video';
      return true;
    });

    const q = query.trim().toLowerCase();
    const filtered = q ? byType.filter((b) => (b.title || '').toLowerCase().includes(q)) : byType;
    
    // Sort by newest first (most recent savedAt timestamp)
    return filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [bookmarks, activeFilter, query]);

  const handleItemClick = async (item: BookmarkedItem) => {
    try {
      if (item.type === 'post') {
        const post = await getPostById(item.id);
        const isValid = !!post && ((post?.content && post.content.trim().length > 0) || (post?.media_urls && post.media_urls.length > 0));
        if (!isValid) {
          toast({
            title: "Bookmark no longer available",
            description: "This post was removed or is empty. Removing from bookmarks.",
            variant: "destructive"
          });
          removeBookmarkSilent(item.id);
          return;
        }
        router.navigate(`/community?highlightPost=${item.id}`);
        return;
      } else if (item.type === 'challenge') {
        router.navigate(`/challenge/${item.id}`);
      } else if (item.type === 'article' || item.type === 'video') {
        const content = await getContentById(item.id);
        if (!content || !content?.title) {
          toast({
            title: "Bookmark no longer available",
            description: "This content was removed. Removing from bookmarks.",
            variant: "destructive"
          });
          removeBookmarkSilent(item.id);
          return;
        }
        router.navigate(`/library?highlightResource=${item.id}`);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      toast({
        title: "Bookmark no longer available",
        description: "This item may have been removed or updated. Removing from bookmarks.",
        variant: "destructive"
      });
      removeBookmarkSilent(item.id);
    }
  };

  return (
    <View className="flex-1 bg-background pb-20">
      <Header title="My Bookmarks" />

      <ScrollView 
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-semibold text-foreground font-cooper">
            My Saved Items
          </Text>
        </View>

        {/* Search */}
        <View className="relative mb-4">
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search size={16} className="text-muted-foreground" />
          </View>
          <TextInput
            placeholder="Search bookmarks..."
            value={query}
            onChangeText={setQuery}
            className="pl-9 bg-card border border-input rounded-lg py-3 px-3 text-foreground font-typewriter"
            placeholderTextColor="hsl(215 20% 30%)"
          />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {filterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setActiveFilter(opt.key)}
                className={`px-4 py-2 rounded-full border ${
                  activeFilter === opt.key 
                    ? 'bg-primary border-primary' 
                    : 'bg-card border-border'
                }`}
              >
                <Text className={`font-typewriter text-sm ${
                  activeFilter === opt.key 
                    ? 'text-primary-foreground' 
                    : 'text-foreground'
                }`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Bookmark size={48} className="text-muted-foreground/50 mb-4" />
            <Text className="text-muted-foreground font-typewriter mb-2 text-base">
              No bookmarks found
            </Text>
            <Text className="text-sm text-muted-foreground font-typewriter">
              Try a different filter or search
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {filteredItems.map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => handleItemClick(b)}
                className="bg-card border border-border rounded-lg p-4 active:bg-muted/50"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <Text className="text-xs text-muted-foreground font-typewriter mb-1 capitalize">
                      {b.type}
                    </Text>
                    <Text 
                      className="font-medium text-card-foreground text-base font-typewriter" 
                      numberOfLines={2}
                    >
                      {b.title || 'Saved item'}
                    </Text>
                    <View className="flex-row items-center gap-1 mt-2">
                      <Text className="text-xs text-muted-foreground font-typewriter">
                        Saved {formatDistanceToNow(new Date(b.savedAt))} ago
                      </Text>
                      <ExternalLink size={12} className="text-muted-foreground opacity-60" />
                    </View>
                  </View>
                  <Badge variant="secondary" className="shrink-0 bg-secondary">
                    <Text className="text-xs text-secondary-foreground font-typewriter capitalize">
                      {b.type}
                    </Text>
                  </Badge>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Trash Button - only show if there are bookmarks */}
      {bookmarks.length > 0 && (
        <TouchableOpacity
          onPress={() => setIsDeleteModalOpen(true)}
          className="absolute bottom-24 right-4 h-12 w-12 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Trash2 size={20} className="text-muted-foreground hover:text-destructive transition-colors" />
        </TouchableOpacity>
      )}

      {/* Delete Modal */}
      <BookmarkDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        bookmarks={bookmarks.map(b => ({
          id: b.id,
          type: b.type,
          title: b.title,
          savedAt: b.savedAt
        }))}
        removeBookmark={removeBookmarkSilent}
      />
    </View>
  );
}