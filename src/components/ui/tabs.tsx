import React, { createContext, useContext, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be rendered within Tabs component');
  }
  return context;
};

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const Tabs = ({ defaultValue, value, onValueChange, children, className }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = value !== undefined;

  const currentValue = isControlled ? value : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <View className={cn('flex-1', className)}>
        {children}
      </View>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

const TabsList = ({ children, className }: TabsListProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1 }}
      className={cn(
        'flex-row items-center rounded-md bg-muted p-1',
        className
      )}
    >
      {children}
    </ScrollView>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const TabsTrigger = ({ value, children, className, disabled }: TabsTriggerProps) => {
  const { value: currentValue, onValueChange } = useTabs();
  const isActive = currentValue === value;

  return (
    <TouchableOpacity
      onPress={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={cn(
        'flex-row items-center justify-center rounded-sm px-3 py-1.5',
        'ring-offset-background transition-all',
        isActive && 'bg-background text-foreground shadow-sm',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      style={{
        backgroundColor: isActive ? 'hsl(var(--background))' : 'transparent',
        shadowColor: isActive ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
        shadowOffset: isActive ? { width: 0, height: 1 } : { width: 0, height: 0 },
        shadowOpacity: isActive ? 1 : 0,
        shadowRadius: isActive ? 2 : 0,
        elevation: isActive ? 2 : 0,
      }}
    >
      {typeof children === 'string' ? (
        <Text
          className={cn(
            'text-sm font-medium font-inter',
            isActive ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const TabsContent = ({ value, children, className }: TabsContentProps) => {
  const { value: currentValue } = useTabs();

  if (currentValue !== value) {
    return null;
  }

  return (
    <View
      className={cn(
        'mt-2 ring-offset-background flex-1',
        className
      )}
    >
      {children}
    </View>
  );
};

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export { Tabs, TabsList, TabsTrigger, TabsContent };