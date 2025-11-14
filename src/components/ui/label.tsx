import * as React from "react";
import { Text, TextProps } from "react-native";
import { cn } from "@/lib/utils";

interface LabelProps extends TextProps {
  className?: string;
  disabled?: boolean;
}

const Label = React.forwardRef<React.ElementRef<typeof Text>, LabelProps>(
  ({ className, disabled, ...props }, ref) => (
    <Text
      ref={ref}
      className={cn(
        "text-sm font-medium leading-none",
        disabled && "opacity-50",
        className
      )}
      {...props}
    />
  )
);

Label.displayName = "Label";

export { Label };