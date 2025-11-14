// Comprehensive analytics tracking service for Google Analytics

export const analytics = {
  // Track page views (already handled by PageViewTracker in App.tsx)
  trackPageView: (pagePath: string, pageTitle: string) => {
    window.gtag?.('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  },

  // Challenge interactions
  trackChallengeView: (challengeId: string, challengeTitle: string) => {
    window.gtag?.('event', 'view_challenge', {
      challenge_id: challengeId,
      challenge_title: challengeTitle,
    });
  },

  trackChallengeStart: (challengeId: string, challengeTitle: string) => {
    window.gtag?.('event', 'start_challenge', {
      challenge_id: challengeId,
      challenge_title: challengeTitle,
    });
  },

  trackChallengeSubmit: (challengeId: string, challengeTitle: string) => {
    window.gtag?.('event', 'submit_challenge', {
      challenge_id: challengeId,
      challenge_title: challengeTitle,
    });
  },

  trackChallengeComplete: (challengeId: string, challengeTitle: string, points: number) => {
    window.gtag?.('event', 'complete_challenge', {
      challenge_id: challengeId,
      challenge_title: challengeTitle,
      points_earned: points,
    });
  },

  // Social interactions
  trackLike: (contentType: 'post' | 'comment', contentId: string) => {
    window.gtag?.('event', 'like', {
      content_type: contentType,
      content_id: contentId,
    });
  },

  trackUnlike: (contentType: 'post' | 'comment', contentId: string) => {
    window.gtag?.('event', 'unlike', {
      content_type: contentType,
      content_id: contentId,
    });
  },

  trackComment: (postId: string) => {
    window.gtag?.('event', 'comment', {
      post_id: postId,
    });
  },

  trackFollow: (userId: string) => {
    window.gtag?.('event', 'follow_user', {
      target_user_id: userId,
    });
  },

  trackUnfollow: (userId: string) => {
    window.gtag?.('event', 'unfollow_user', {
      target_user_id: userId,
    });
  },

  // Content interactions
  trackBookmark: (contentType: 'post' | 'challenge' | 'content', contentId: string) => {
    window.gtag?.('event', 'bookmark', {
      content_type: contentType,
      content_id: contentId,
    });
  },

  trackUnbookmark: (contentType: 'post' | 'challenge' | 'content', contentId: string) => {
    window.gtag?.('event', 'remove_bookmark', {
      content_type: contentType,
      content_id: contentId,
    });
  },

  trackContentView: (contentId: string, contentTitle: string, contentType: 'article' | 'video') => {
    window.gtag?.('event', 'view_content', {
      content_id: contentId,
      content_title: contentTitle,
      content_type: contentType,
    });
  },

  trackVideoPlay: (contentId: string, contentTitle: string) => {
    window.gtag?.('event', 'video_play', {
      content_id: contentId,
      content_title: contentTitle,
    });
  },

  // Post creation
  trackPostCreate: (postId: string, hasMedia: boolean) => {
    window.gtag?.('event', 'create_post', {
      post_id: postId,
      has_media: hasMedia,
    });
  },

  // Search
  trackSearch: (query: string, resultCount: number, searchType: 'challenges' | 'content' | 'users') => {
    window.gtag?.('event', 'search', {
      search_term: query,
      result_count: resultCount,
      search_type: searchType,
    });
  },

  // Profile interactions
  trackProfileView: (userId: string) => {
    window.gtag?.('event', 'view_profile', {
      profile_user_id: userId,
    });
  },

  trackProfileEdit: () => {
    window.gtag?.('event', 'edit_profile');
  },

  // Chat/Messaging
  trackMessageSend: (chatType: 'direct' | 'group' | 'challenge') => {
    window.gtag?.('event', 'send_message', {
      chat_type: chatType,
    });
  },

  trackChatOpen: (chatType: 'direct' | 'group' | 'challenge', chatId: string) => {
    window.gtag?.('event', 'open_chat', {
      chat_type: chatType,
      chat_id: chatId,
    });
  },

  trackGroupCreate: (memberCount: number) => {
    window.gtag?.('event', 'create_group_chat', {
      member_count: memberCount,
    });
  },

  // Authentication
  trackSignUp: (method: string) => {
    window.gtag?.('event', 'sign_up', {
      method: method,
    });
  },

  trackSignIn: (method: string) => {
    window.gtag?.('event', 'login', {
      method: method,
    });
  },

  trackSignOut: () => {
    window.gtag?.('event', 'logout');
  },

  // Navigation
  trackNavigation: (destination: string, source: string) => {
    window.gtag?.('event', 'navigation', {
      destination: destination,
      source: source,
    });
  },

  // Errors
  trackError: (errorType: string, errorMessage: string, context?: string) => {
    window.gtag?.('event', 'error', {
      error_type: errorType,
      error_message: errorMessage,
      context: context,
    });
  },

  // Leaderboard
  trackLeaderboardView: () => {
    window.gtag?.('event', 'view_leaderboard');
  },

  // Settings
  trackSettingsChange: (settingType: string) => {
    window.gtag?.('event', 'change_setting', {
      setting_type: settingType,
    });
  },

  // Share
  trackShare: (contentType: 'challenge' | 'post' | 'content', contentId: string) => {
    window.gtag?.('event', 'share', {
      content_type: contentType,
      content_id: contentId,
    });
  },
};
