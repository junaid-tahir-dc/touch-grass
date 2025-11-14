import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions, Pressable, Modal } from 'react-native';
import { Check, ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  children, 
  open: controlledOpen, 
  onOpenChange 
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const triggerRef = useRef<View>(null);
  const [triggerLayout, setTriggerLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const handleTriggerLayout = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerLayout({ x, y, width, height });
    });
  };

  // Find trigger and other children
  let trigger: React.ReactElement | null = null;
  const otherChildren: React.ReactNode[] = [];

  React.Children.forEach(children, child => {
    if (React.isValidElement(child)) {
      if (child.type === DropdownMenuTrigger) {
        trigger = React.cloneElement(child as React.ReactElement<any>, {
          onLayout: handleTriggerLayout,
          onPress: () => handleOpenChange(!open),
          ref: triggerRef,
        });
      } else {
        otherChildren.push(child);
      }
    }
  });

  return (
    <View className="relative">
      {trigger}
      {open && (
        <Modal
          transparent
          animationType="fade"
          visible={open}
          onRequestClose={() => handleOpenChange(false)}
        >
          <Pressable 
            className="flex-1" 
            onPress={() => handleOpenChange(false)}
          >
            <View 
              className="absolute bg-card border border-border rounded-lg shadow-lg min-w-32 z-50"
              style={{
                top: triggerLayout.y + triggerLayout.height + 4,
                left: triggerLayout.x,
                maxWidth: Dimensions.get('window').width - triggerLayout.x - 16,
              }}
            >
              {otherChildren}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
};

// DropdownMenuTrigger with forwardRef
interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  onPress?: () => void;
  onLayout?: () => void;
}

export const DropdownMenuTrigger = React.forwardRef<View, DropdownMenuTriggerProps>(
  ({ children, onPress, onLayout }, ref) => {
    return (
      <Pressable onPress={onPress} onLayout={onLayout} ref={ref}>
        {children}
      </Pressable>
    );
  }
);

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

// Rest of the components remain the same...
interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  children, 
  align = 'start',
  className 
}) => {
  return (
    <ScrollView 
      className={cn("max-h-60", className)}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  inset?: boolean;
  className?: string;
  disabled?: boolean;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  children, 
  onPress,
  inset,
  className,
  disabled = false
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "flex-row items-center px-3 py-2 rounded-sm active:bg-muted/50",
        inset && "pl-8",
        disabled && "opacity-50",
        className
      )}
    >
      {children}
    </TouchableOpacity>
  );
};

