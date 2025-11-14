import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BookmarkedItem {
  id: string;
  type: 'challenge' | 'post' | 'article' | 'video';
  title: string;
  savedAt: string;
}

interface BookmarkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: BookmarkedItem[];
  removeBookmark: (id: string) => void;
}

export function BookmarkDeleteModal({ isOpen, onClose, bookmarks, removeBookmark }: BookmarkDeleteModalProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedItems(new Set(bookmarks.map(b => b.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
      setSelectAll(false);
    }
    setSelectedItems(newSelected);
    
    // Update select all state
    if (newSelected.size === bookmarks.length) {
      setSelectAll(true);
    }
  };

  const handleDelete = () => {
    if (selectedItems.size === 0) {
      toast({
        title: "No items selected",
        description: "Please select items to delete",
        variant: "destructive"
      });
      return;
    }

    const itemCount = selectedItems.size;
    selectedItems.forEach(itemId => {
      removeBookmark(itemId);
    });

    toast({
      title: "Bookmarks deleted",
      description: `${itemCount} item${itemCount > 1 ? 's' : ''} removed from bookmarks`
    });

    // Reset state and close modal
    setSelectedItems(new Set());
    setSelectAll(false);
    onClose();
  };

  const handleClose = () => {
    setSelectedItems(new Set());
    setSelectAll(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex-row items-center gap-2">
            <Trash2 size={20} className="text-destructive" />
            <Text className="text-lg font-semibold text-card-foreground font-cooper">
              Delete Bookmarks
            </Text>
          </DialogTitle>
          <DialogDescription>
            <Text className="text-sm text-muted-foreground font-typewriter">
              Select the bookmarks you want to delete. This action cannot be undone.
            </Text>
          </DialogDescription>
        </DialogHeader>

        <ScrollView className="flex-1 space-y-4">
          {/* Select All Option */}
          <View className="flex-row items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <Checkbox
              checked={selectAll}
              onChange={handleSelectAll}
              accessibilityLabel="Select all bookmarks"
            />
            <Text className="text-sm font-medium text-card-foreground font-typewriter">
              Select all ({bookmarks.length} items)
            </Text>
          </View>

          {/* Bookmark Items */}
          <View className="space-y-2">
            {bookmarks.map((bookmark) => (
              <TouchableOpacity
                key={bookmark.id}
                onPress={() => handleSelectItem(bookmark.id, !selectedItems.has(bookmark.id))}
                className={`p-3 border rounded-lg ${
                  selectedItems.has(bookmark.id) 
                    ? 'bg-destructive/5 border-destructive/20' 
                    : 'bg-card border-border'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Checkbox
                    checked={selectedItems.has(bookmark.id)}
                    onChange={(checked) => handleSelectItem(bookmark.id, checked)}
                    accessibilityLabel={`Select ${bookmark.title}`}
                  />
                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <View className="flex-row items-center gap-2 mb-1">
                      <Badge variant="outline" className="bg-secondary">
                        <Text className="text-xs text-secondary-foreground font-typewriter capitalize">
                          {bookmark.type}
                        </Text>
                      </Badge>
                    </View>
                    <Text 
                      className="text-sm font-medium text-card-foreground font-typewriter" 
                      numberOfLines={2}
                    >
                      {bookmark.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-typewriter mt-1">
                      Saved {formatDistanceToNow(new Date(bookmark.savedAt))} ago
                    </Text>
                  </View>
                  {selectedItems.has(bookmark.id) && (
                    <Check size={16} className="text-destructive" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" onPress={handleClose} className="flex-1">
            <Text className="text-card-foreground font-typewriter">Cancel</Text>
          </Button>
          <Button 
            variant="destructive" 
            onPress={handleDelete}
            disabled={selectedItems.size === 0}
            className="flex-1"
          >
            <Trash2 size={16} className="text-destructive-foreground mr-2" />
            <Text className="text-destructive-foreground font-typewriter">
              Delete {selectedItems.size > 0 ? `(${selectedItems.size})` : ''}
            </Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}