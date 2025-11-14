import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const AlertDialog = ({ open, onOpenChange, children }: AlertDialogProps) => {
  return (
    <Modal
      visible={open}
      transparent={true}
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      {children}
    </Modal>
  );
};

interface AlertDialogTriggerProps {
  children: React.ReactNode;
  onPress?: () => void;
}

const AlertDialogTrigger = ({ children, onPress }: AlertDialogTriggerProps) => {
  return (
    <TouchableOpacity onPress={onPress}>
      {children}
    </TouchableOpacity>
  );
};

interface AlertDialogOverlayProps {
  className?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}

const AlertDialogOverlay = ({ className, children, onPress }: AlertDialogOverlayProps) => (
  <TouchableWithoutFeedback onPress={onPress}>
    <View
      className={cn(
        "absolute inset-0 z-50 bg-black/80",
        className
      )}
    >
      {children}
    </View>
  </TouchableWithoutFeedback>
);

interface AlertDialogContentProps {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

const AlertDialogContent = ({ className, children, onClose }: AlertDialogContentProps) => (
  <View className="flex-1 items-center justify-center p-4">
    <AlertDialogOverlay onPress={onClose} />
    <View
      className={cn(
        "z-50 w-full max-w-lg bg-background border border-border rounded-lg p-6 shadow-lg",
        className
      )}
    >
      {children}
    </View>
  </View>
);

interface AlertDialogHeaderProps {
  className?: string;
  children: React.ReactNode;
}

const AlertDialogHeader = ({ className, children }: AlertDialogHeaderProps) => (
  <View className={cn("flex flex-col space-y-2", className)}>
    {children}
  </View>
);

interface AlertDialogFooterProps {
  className?: string;
  children: React.ReactNode;
}

const AlertDialogFooter = ({ className, children }: AlertDialogFooterProps) => (
  <View className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}>
    {children}
  </View>
);

interface AlertDialogTitleProps {
  className?: string;
  children: React.ReactNode;
}

const AlertDialogTitle = ({ className, children }: AlertDialogTitleProps) => (
  <Text className={cn("text-lg font-semibold text-foreground", className)}>
    {children}
  </Text>
);

interface AlertDialogDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

const AlertDialogDescription = ({ className, children }: AlertDialogDescriptionProps) => (
  <Text className={cn("text-sm text-muted-foreground mt-2", className)}>
    {children}
  </Text>
);

interface AlertDialogActionProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  loading?: boolean;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';
  disabled?: boolean;
  size?: 'default' | 'lg' | 'sm' | 'icon';
  onPress?: () => void;
  testID?: string;
}

const AlertDialogAction = ({
  children,
  className,
  label,
  loading,
  variant = 'default',
  disabled,
  size = 'default',
  onPress,
  testID,
  ...props
}: AlertDialogActionProps) => (
  <Button
    label={label}
    loading={loading}
    variant={variant}
    disabled={disabled}
    size={size}
    onPress={onPress}
    testID={testID}
    className={className}
    {...props}
  >
    {children}
  </Button>
);

interface AlertDialogCancelProps {
  children: React.ReactNode;
  className?: string;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  size?: 'default' | 'lg' | 'sm' | 'icon';
  onPress?: () => void;
  testID?: string;
}

const AlertDialogCancel = ({
  children,
  className,
  label,
  loading,
  disabled,
  size = 'default',
  onPress,
  testID,
  ...props
}: AlertDialogCancelProps) => (
  <Button
    variant="outline"
    label={label}
    loading={loading}
    disabled={disabled}
    size={size}
    onPress={onPress}
    testID={testID}
    className={cn("mt-2 sm:mt-0", className)}
    {...props}
  >
    {children}
  </Button>
);

interface AlertDialogCloseProps {
  className?: string;
  onPress?: () => void;
}

const AlertDialogClose = ({ className, onPress }: AlertDialogCloseProps) => (
  <TouchableOpacity
    onPress={onPress}
    className={cn(
      "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      className
    )}
  >
    <X size={16} className="text-muted-foreground" />
    <Text className="sr-only">Close</Text>
  </TouchableOpacity>
);

export {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogClose,
};