import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";

interface SwitchProps {
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const Switch = React.forwardRef<React.ElementRef<typeof View>, SwitchProps>(
  ({ className, value, onValueChange, disabled, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        onPress={() => !disabled && onValueChange?.(!value)}
        disabled={disabled}
        className={cn(
          "w-12 h-6 rounded-full p-1 transition-colors",
          value ? 'bg-primary' : 'bg-muted',
          disabled && 'opacity-50',
          className
        )}
        {...props}
      >
        <View
          className={cn(
            "w-4 h-4 bg-background rounded-full shadow-sm transition-all",
            value ? 'ml-6' : 'ml-0'
          )}
        />
      </Pressable>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };