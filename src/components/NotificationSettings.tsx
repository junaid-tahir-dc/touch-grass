import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Bell, MessageSquare, Trophy, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences } from '@/hooks/use-notification-preferences';
import { notificationService } from '@/services/notifications';
import { pushNotificationService } from '@/services/pushNotifications';
import { useToast } from '@/hooks/use-toast';

export const NotificationSettings: React.FC = () => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [checkingPushStatus, setCheckingPushStatus] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initializePushNotifications = async () => {
      setCheckingPushStatus(true);
      try {
        const isSubscribed = await pushNotificationService.isSubscribed();
        setPushSubscribed(isSubscribed);
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      } finally {
        setCheckingPushStatus(false);
      }
    };

    initializePushNotifications();
  }, []);

  const handlePermissionRequest = async () => {
    setRequestingPermission(true);
    try {
      const granted = await notificationService.requestPermission();
      if (granted) {
        await updatePreferences({ browser_notifications: true });

        const pushSubscription = await pushNotificationService.subscribeToPush();
        if (pushSubscription) {
          setPushSubscribed(true);
          toast({
            title: "Notifications enabled",
            description: "You'll receive notifications on your device"
          });
        }
      } else {
        toast({
          title: "Permission denied",
          description: "Notifications are disabled. You can enable them in your device settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to request notification permissions",
        variant: "destructive"
      });
    } finally {
      setRequestingPermission(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        const subscription = await pushNotificationService.subscribeToPush();
        if (subscription) {
          setPushSubscribed(true);
          toast({
            title: "Push notifications enabled",
            description: "You'll receive notifications on your device",
          });
        }
      }
    } else {
      const success = await pushNotificationService.unsubscribeFromPush();
      if (success) {
        setPushSubscribed(false);
        toast({
          title: "Push notifications disabled",
          description: "You won't receive push notifications",
        });
      }
    }
  };

  const getPermissionStatus = () => {
    const isSupported = notificationService.isSupported();
    if (!isSupported) {
      return { status: 'unsupported', color: 'bg-gray-100', textColor: 'text-gray-600', text: 'Not Supported' };
    }

    const permission = notificationService.getPermissionStatus();
    switch (permission) {
      case 'granted':
        return { status: 'granted', color: 'bg-gray-100', textColor: 'text-gray-900', text: 'Enabled' };
      case 'denied':
        return { status: 'denied', color: 'bg-red-100', textColor: 'text-red-700', text: 'Blocked' };
      default:
        return { status: 'default', color: 'bg-gray-100', textColor: 'text-gray-600', text: 'Not Requested' };
    }
  };

  const permissionStatus = getPermissionStatus();

  const handleTestNotification = () => {
    notificationService.showNotification('Test Notification', {
      body: 'This is a test notification from TouchGrass!',
    });

    toast({
      title: "Test notification sent",
      description: "Check your notification panel"
    });
  };

  if (loading) {
    return (
      <View className="flex items-center justify-center p-6">
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }

  return (
    <View className="px-4 py-2">
      <View className="flex-row items-center gap-2 mb-3">
        <Bell color="#007AFF" size={16} />
        <Text className="font-medium text-sm text-gray-900">Notifications</Text>
      </View>

      <View className="space-y-4">
        {/* Push Notifications */}
        <View className="p-3 bg-gray-100/50 rounded-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Bell size={14} color="#007AFF" />
              <Text className="font-medium text-xs text-gray-900">Push Notifications</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className={`px-2 py-1 rounded-full ${permissionStatus.color}`}>
                <Text className={`text-xs font-medium ${permissionStatus.textColor}`}>
                  {permissionStatus.text}
                </Text>
              </View>
              {permissionStatus.status !== 'granted' && permissionStatus.status !== 'unsupported' && (
                <TouchableOpacity
                  onPress={handlePermissionRequest}
                  disabled={requestingPermission}
                  className="h-6 px-2 border border-gray-300 rounded-md justify-center"
                >
                  <Text className="text-xs text-gray-700 font-medium">
                    {requestingPermission ? 'Requesting...' : 'Enable'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text className="text-xs text-gray-600 mb-2">
            Get notifications on your device for important updates and messages
          </Text>

          {permissionStatus.status === 'granted' && (
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-900">Enable push notifications</Text>
              <Switch
                value={preferences.browser_notifications}
                onValueChange={(checked) => updatePreferences({ browser_notifications: checked })}
              />
            </View>
          )}
        </View>

        {/* Chat Messages */}
        <View className="p-3 bg-gray-100/50 rounded-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <MessageSquare size={14} color="#3B82F6" />
              <Text className="font-medium text-xs text-gray-900">Chat Messages</Text>
            </View>
            <Switch
              value={preferences.chat_messages}
              onValueChange={(checked) => updatePreferences({ chat_messages: checked })}
            />
          </View>
          <Text className="text-xs text-gray-600">
            Receive notifications for new chat messages in direct messages, groups, and challenge discussions
          </Text>
        </View>

        {/* Challenge Updates */}
        <View className="p-3 bg-gray-100/50 rounded-lg">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <Trophy size={14} color="#F59E0B" />
              <Text className="font-medium text-xs text-gray-900">Challenge Updates</Text>
            </View>
            <Switch
              value={preferences.challenge_updates}
              onValueChange={(checked) => updatePreferences({ challenge_updates: checked })}
            />
          </View>
          <Text className="text-xs text-gray-600">
            Get notified about new challenges, challenge completions, and leaderboard updates
          </Text>
        </View>

        {/* Test Notification Button */}
        {permissionStatus.status === 'granted' && preferences.browser_notifications && (
          <TouchableOpacity
            className="w-full h-8 border border-gray-300 rounded-md justify-center items-center"
            onPress={handleTestNotification}
          >
            <Text className="text-xs text-gray-700 font-medium">Send Test Notification</Text>
          </TouchableOpacity>
        )}

        {/* Device Settings Info */}
        <View className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <View className="flex-row items-center gap-2 mb-1">
            <Smartphone size={12} color="#3B82F6" />
            <Text className="text-xs font-medium text-blue-800">Device Settings</Text>
          </View>
          <Text className="text-xs text-blue-700">
            To manage notification permissions, go to your device Settings → Notifications → TouchGrass
          </Text>
        </View>
      </View>
    </View>
  );
};