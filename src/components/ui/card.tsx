import * as React from "react";
import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

// Array of fun border colors for rotation - using NativeWind color classes
const borderColors = [
  'border-lime-500',
  'border-teal-500', 
  'border-orange-500',
  'border-purple-500',
  'border-pink-500'
];

// Use a stable counter for consistent color assignment
let colorIndex = 0;

interface CardProps extends React.ComponentProps<typeof View> {
  className?: string;
}

const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ className, ...props }, ref) => {
    // Use memo to pick a stable border color for this card instance
    const borderColor = React.useMemo(() => {
      const color = borderColors[colorIndex % borderColors.length];
      colorIndex++;
      return color;
    }, []);
    
    return (
      <View 
        ref={ref} 
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm", 
          borderColor, 
          className
        )} 
        {...props} 
      />
    );
  }
);
Card.displayName = "Card";

interface CardHeaderProps extends React.ComponentProps<typeof View> {
  className?: string;
}

const CardHeader = React.forwardRef<React.ElementRef<typeof View>, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <View 
      ref={ref} 
      className={cn("flex flex-col space-y-1.5 p-6", className)} 
      {...props} 
    />
  ),
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.ComponentProps<typeof Text> {
  className?: string;
}

const CardTitle = React.forwardRef<React.ElementRef<typeof Text>, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <Text 
      ref={ref} 
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)} 
      {...props} 
    />
  ),
);
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.ComponentProps<typeof Text> {
  className?: string;
}

const CardDescription = React.forwardRef<React.ElementRef<typeof Text>, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <Text 
      ref={ref} 
      className={cn("text-sm text-muted-foreground", className)} 
      {...props} 
    />
  ),
);
CardDescription.displayName = "CardDescription";

interface CardContentProps extends React.ComponentProps<typeof View> {
  className?: string;
}

const CardContent = React.forwardRef<React.ElementRef<typeof View>, CardContentProps>(
  ({ className, ...props }, ref) => (
    <View 
      ref={ref} 
      className={cn("p-6 pt-0", className)} 
      {...props} 
    />
  ),
);
CardContent.displayName = "CardContent";

interface CardFooterProps extends React.ComponentProps<typeof View> {
  className?: string;
}

const CardFooter = React.forwardRef<React.ElementRef<typeof View>, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <View 
      ref={ref} 
      className={cn("flex items-center p-6 pt-0", className)} 
      {...props} 
    />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };