import { supabase } from '@/integrations/supabase/client';
import { pushNotificationService } from './pushNotifications';

export interface NotificationPreferences {
  chat_messages: boolean;
  challenge_updates: boolean;
  browser_notifications: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  constructor() {
    this.checkPermission();
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    console.log('Notification permission result:', permission);
    return permission === 'granted';
  }

  async showNotification(title: string, options?: {
    body?: string;
    icon?: string;
    tag?: string;
    data?: any;
    onClick?: () => void;
  }) {
    if (!('Notification' in window) || this.permission !== 'granted') {
      console.log('showNotification blocked', { supported: 'Notification' in window, permission: this.permission });
      return null;
    }

    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || '/favicon.ico',
      tag: options?.tag,
      data: options?.data,
    });
    console.log('Native notification created', { title, tag: options?.tag });

    if (options?.onClick) {
      notification.onclick = options.onClick;
    }

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }

  async showChatNotification(senderName: string, message: string, chatId: string, chatType: 'direct' | 'group' | 'challenge') {
    console.log('showChatNotification called:', {
      senderName,
      message: message.substring(0, 50),
      chatId,
      chatType,
      permission: this.permission,
      isSupported: this.isSupported()
    });

    const title = `New message from ${senderName}`;
    const body = message.length > 100 ? `${message.substring(0, 100)}...` : message;
    
    const notification = await this.showNotification(title, {
      body,
      tag: `chat-${chatId}`,
      data: { chatId, chatType },
      onClick: () => {
        // Focus the window and potentially navigate to the chat
        window.focus();
        // You could add navigation logic here
      }
    });

    console.log('Notification created:', !!notification);
    return notification;
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  isSupported(): boolean {
    return 'Notification' in window;
  }
}

export const notificationService = NotificationService.getInstance();