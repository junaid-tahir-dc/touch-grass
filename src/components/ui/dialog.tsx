import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent={true}
      onRequestClose={() => onOpenChange?.(false)}
    >
      {children}
    </Modal>
  );
};

export const DialogTrigger: React.FC<{ children: React.ReactNode; onPress?: () => void }> = ({ 
  children, 
  onPress 
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
};

export const DialogClose: React.FC<{ children: React.ReactNode; onPress?: () => void }> = ({ 
  children, 
  onPress 
}) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
};

export const DialogOverlay: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <View 
      className={cn(
        "absolute inset-0 bg-black/80 z-40", 
        className
      )}
    />
  );
};

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  hideCloseButton?: boolean;
  onClose?: () => void;
}

export const DialogContent = React.forwardRef<View, DialogContentProps>(
  ({ className, children, hideCloseButton, onClose }, ref) => {
    return (
      <View className="flex-1 justify-center items-center p-4 z-50"> {/* Higher z-index */}
        <DialogOverlay />
        <View
          ref={ref}
          className={cn(
            "bg-background border border-border rounded-lg w-full max-w-lg p-6 shadow-lg z-50", // Higher z-index
            className
          )}
        >
          {children}
          {!hideCloseButton && (
            <TouchableOpacity
              onPress={onClose}
              className="absolute right-4 top-4 rounded-sm opacity-70 active:opacity-100 z-50" // Higher z-index
            >
              <X size={16} className="text-muted-foreground" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

DialogContent.displayName = "DialogContent";

interface DialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ className, children }) => {
  return (
    <View className={cn("flex flex-col space-y-1.5 text-center", className)}>
      {children}
    </View>
  );
};

interface DialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ className, children }) => {
  return (
    <View className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4", className)}>
      {children}
    </View>
  );
};

interface DialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogTitle = React.forwardRef<Text, DialogTitleProps>(
  ({ className, children }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn("text-lg font-semibold leading-none tracking-tight text-foreground font-cooper", className)}
      >
        {children}
      </Text>
    );
  }
);

DialogTitle.displayName = "DialogTitle";

interface DialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const DialogDescription = React.forwardRef<Text, DialogDescriptionProps>(
  ({ className, children }, ref) => {
    return (
      <Text
        ref={ref}
        className={cn("text-sm text-muted-foreground font-typewriter", className)}
      >
        {children}
      </Text>
    );
  }
);

DialogDescription.displayName = "DialogDescription";

export const FilterButton: React.FC<{
  isActive: boolean;
  onPress: () => void;
  children: React.ReactNode;
}> = ({ isActive, onPress, children }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full border ${
        isActive 
          ? 'bg-primary border-primary' 
          : 'bg-card border-border'
      }`}
    >
      <Text className={`font-typewriter text-sm ${
        isActive 
          ? 'text-primary-foreground' 
          : 'text-foreground'
      }`}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};

export const DialogActionButton: React.FC<{
  variant?: 'primary' | 'secondary' | 'outline';
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ variant = 'primary', onPress, children, className }) => {
  const baseClasses = "px-4 py-2 rounded-full border flex-1 items-center";
  
  const variantClasses = {
    primary: 'bg-primary border-primary',
    secondary: 'bg-secondary border-secondary', 
    outline: 'bg-transparent border-border'
  };

  const textClasses = {
    primary: 'text-primary-foreground',
    secondary: 'text-secondary-foreground',
    outline: 'text-foreground'
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={cn(baseClasses, variantClasses[variant], className)}
    >
      <Text className={cn("font-typewriter text-sm", textClasses[variant])}>
        {children}
      </Text>
    </TouchableOpacity>
  );
};