import React from 'react';
import { View, Image, TouchableOpacity, Alert, Share } from 'react-native';
import { X, Download } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageAlt: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  open,
  onOpenChange,
  imageUrl,
  imageAlt
}) => {
  const handleDownload = async () => {
    try {
      await Share.share({
        url: imageUrl,
        message: imageAlt,
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Could not share image');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex-1 bg-black/95 p-0" hideCloseButton={true}>
        <View className="flex-1 items-center justify-center">
          {/* Close button */}
          <TouchableOpacity
            onPress={() => onOpenChange(false)}
            className="absolute top-12 right-4 z-10 bg-black/50 rounded-full p-2 active:bg-black/70"
          >
            <X size={20} className="text-white" />
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            onPress={handleDownload}
            className="absolute top-12 left-4 z-10 bg-black/50 rounded-full p-2 active:bg-black/70"
          >
            <Download size={20} className="text-white" />
          </TouchableOpacity>

          {/* Image */}
          <Image
            source={{ uri: imageUrl }}
            alt={imageAlt}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>
      </DialogContent>
    </Dialog>
  );
};