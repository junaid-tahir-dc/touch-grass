import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

interface BookmarkItem {
  id: string;
  type: 'challenge' | 'post' | 'article' | 'video';
  title: string;
  savedAt: string;
}

// Mock local storage key
const BOOKMARKS_KEY = 'app_bookmarks';

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Validate and clean bookmarks to remove invalid entries
  const validateBookmarks = (bookmarks: BookmarkItem[]): BookmarkItem[] => {
    return bookmarks.filter(bookmark => {
      // Remove items with old mock IDs (like r1, r2, p1, p2, etc.)
      const hasValidId = bookmark.id && 
                        !bookmark.id.match(/^[rp]\d+$/) && // Remove old mock IDs like r1, r2, p1, p2
                        bookmark.id.length > 5; // Ensure it's a real UUID-like ID
      
      // Ensure required fields exist and are valid
      return hasValidId &&
             bookmark.type && 
             bookmark.title && 
             bookmark.savedAt &&
             ['challenge', 'post', 'article', 'video'].includes(bookmark.type);
    });
  };

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BOOKMARKS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validated = validateBookmarks(Array.isArray(parsed) ? parsed : []);
        setBookmarks(validated);
        
        // If validation removed items, update localStorage immediately
        if (validated.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
          console.log(`Cleaned up ${(Array.isArray(parsed) ? parsed.length : 0) - validated.length} invalid bookmarks`);
          localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(validated));
        }
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      // Clear corrupted data
      localStorage.removeItem(BOOKMARKS_KEY);
      setBookmarks([]);
    } finally {
      // Mark as hydrated AFTER scheduling state updates
      setHydrated(true);
    }
  }, []);

  // Save bookmarks to localStorage whenever they change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }, [bookmarks, hydrated]);

  const isBookmarked = (id: string) => bookmarks.some(b => b.id === id);

  const addBookmark = (item: Omit<BookmarkItem, 'savedAt'>) => {
    if (isBookmarked(item.id)) return;
    const newBookmark: BookmarkItem = { ...item, savedAt: new Date().toISOString() };
    setBookmarks(prev => [...prev, newBookmark]);
    toast({ title: 'Saved to bookmarks! 📌', description: `${item.title} has been bookmarked` });
  };

  const addBookmarkSilent = (item: Omit<BookmarkItem, 'savedAt'>) => {
    if (isBookmarked(item.id)) return;
    const newBookmark: BookmarkItem = { ...item, savedAt: new Date().toISOString() };
    setBookmarks(prev => [...prev, newBookmark]);
    // No toast notification for silent addition
  };

  const removeBookmark = (id: string) => {
    console.log('removeBookmark called with ID:', id);
    console.log('Current bookmarks:', bookmarks.map(b => ({ id: b.id, title: b.title })));
    const bm = bookmarks.find(b => b.id === id);
    console.log('Found bookmark to remove:', bm);
    setBookmarks(prev => {
      const filtered = prev.filter(b => b.id !== id);
      console.log('New bookmarks after filter:', filtered.map(b => ({ id: b.id, title: b.title })));
      return filtered;
    });
    if (bm) toast({ title: 'Removed from bookmarks', description: `${bm.title} has been unbookmarked` });
  };

  const removeBookmarkSilent = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    // No toast notification for silent removal
  };

  const toggleBookmark = (item: Omit<BookmarkItem, 'savedAt'>) => {
    if (isBookmarked(item.id)) removeBookmark(item.id);
    else addBookmark(item);
  };

  return { bookmarks, isBookmarked, addBookmark, addBookmarkSilent, removeBookmark, removeBookmarkSilent, toggleBookmark };
};