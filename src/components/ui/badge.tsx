import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.ComponentProps<typeof View> {
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-primary border-transparent",
    secondary: "bg-secondary border-transparent",
    destructive: "bg-destructive border-transparent", 
    outline: "border-border bg-transparent"
  };

  const textStyles = {
    default: "text-primary-foreground",
    secondary: "text-secondary-foreground", 
    destructive: "text-destructive-foreground",
    outline: "text-foreground"
  };

  return (
    <View 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variantStyles[variant],
        className
      )} 
      {...props}
    >
      {typeof children === 'string' ? (
        <Text className={cn("text-xs font-semibold font-typewriter", textStyles[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export { Badge };