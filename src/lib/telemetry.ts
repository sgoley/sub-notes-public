/**
 * Telemetry utility for tracking product feature usage
 *
 * This tracks which features users engage with (NOT costs/tokens - that's "Usage Analytics").
 * Telemetry helps understand product usage patterns and is sent to external analytics providers.
 * 
 * Note: This is separate from "Usage Analytics" which tracks tokens, costs, and processing metrics
 * shown to users in their dashboard. Usage Analytics is stored in the database and visible to users.
 * 
 * Telemetry is for product insights only and supports multiple providers:
 * - Plausible Analytics (privacy-friendly, GDPR compliant)
 * - Google Analytics 4
 * - PostHog
 * - Custom endpoints
 */

export interface OutboundClickEvent {
  videoId: string;
  videoTitle: string;
  channelTitle?: string;
  source: 'summary_list' | 'other';
}

/**
 * Track page views
 */
export function trackPageView(page: string): void {
  console.log(`[Telemetry] Page view: ${page}`);

  // Plausible Analytics
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('pageview', {
      props: {
        url: window.location.pathname,
        title: page,
      },
    });
  }

  // Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_title: page,
      page_location: window.location.href,
    });
  }

  // PostHog
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('$pageview', {
      $current_url: window.location.href,
      page_title: page,
    });
  }
}

/**
 * Track when users click to view a video on YouTube
 * This helps demonstrate that Sub-Notes drives traffic back to content creators
 */
export function trackOutboundYouTubeClick(event: OutboundClickEvent): void {
  // Console logging for development/debugging
  console.log('[Telemetry] Outbound YouTube click:', {
    videoId: event.videoId,
    videoTitle: event.videoTitle,
    channelTitle: event.channelTitle,
    source: event.source,
    timestamp: new Date().toISOString(),
  });

  // Send to analytics providers if available
  // Plausible Analytics (if configured)
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Outbound YouTube Click', {
      props: {
        videoId: event.videoId,
        channelTitle: event.channelTitle || 'Unknown',
        source: event.source,
      },
    });
  }

  // Google Analytics 4 (if configured)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'outbound_youtube_click', {
      video_id: event.videoId,
      video_title: event.videoTitle,
      channel_title: event.channelTitle || 'Unknown',
      source: event.source,
    });
  }

  // PostHog (if configured)
  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('outbound_youtube_click', {
      video_id: event.videoId,
      video_title: event.videoTitle,
      channel_title: event.channelTitle || 'Unknown',
      source: event.source,
    });
  }

  // Custom analytics endpoint (if you want to log to your own database)
  // This could be a Supabase edge function that logs analytics events
  if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
    fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'outbound_youtube_click',
        ...event,
        timestamp: new Date().toISOString(),
      }),
      // Use keepalive to ensure the request completes even if the user navigates away
      keepalive: true,
    }).catch((error) => {
      console.error('[Telemetry] Failed to send event:', error);
    });
  }
}

export interface SummaryDownloadEvent {
  videoId: string;
  videoTitle: string;
  channelTitle?: string;
}

/**
 * Track when users download a summary
 */
export function trackSummaryDownload(event: SummaryDownloadEvent): void {
  console.log('[Telemetry] Summary download:', {
    videoId: event.videoId,
    videoTitle: event.videoTitle,
    channelTitle: event.channelTitle,
  });

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Summary Download', {
      props: {
        videoId: event.videoId,
        videoTitle: event.videoTitle,
        channelTitle: event.channelTitle || 'Unknown',
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'summary_download', {
      video_id: event.videoId,
      video_title: event.videoTitle,
      channel_title: event.channelTitle || 'Unknown',
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('summary_download', {
      video_id: event.videoId,
      video_title: event.videoTitle,
      channel_title: event.channelTitle || 'Unknown',
    });
  }
}

/**
 * Track when users process a new video
 */
export function trackVideoProcess(videoId: string, processType: 'dashboard' | 'email'): void {
  console.log('[Telemetry] Video process:', { videoId, processType });

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Video Process', {
      props: { videoId, processType },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'video_process', {
      video_id: videoId,
      process_type: processType,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('video_process', {
      video_id: videoId,
      process_type: processType,
    });
  }
}

export interface SubscriptionAddedEvent {
  channelId: string;
  channelTitle: string;
  channelUrl: string;
}

/**
 * Track when users add a new YouTube channel subscription
 */
export function trackSubscriptionAdded(event: SubscriptionAddedEvent): void {
  console.log('[Telemetry] Subscription added:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Subscription Added', {
      props: {
        channelId: event.channelId,
        channelTitle: event.channelTitle,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'subscription_added', {
      channel_id: event.channelId,
      channel_title: event.channelTitle,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('subscription_added', {
      channel_id: event.channelId,
      channel_title: event.channelTitle,
    });
  }
}

export type IntegrationType = 'google_drive' | 'obsidian' | 'notion';

export interface StorageIntegrationEvent {
  integrationType: IntegrationType;
  action: 'connected' | 'disconnected';
}

/**
 * Track when users connect or disconnect storage integrations
 */
export function trackStorageIntegration(event: StorageIntegrationEvent): void {
  console.log('[Telemetry] Storage integration:', event);

  const eventName = event.action === 'connected' 
    ? 'Storage Integration Connected'
    : 'Storage Integration Disconnected';

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, {
      props: {
        integration_type: event.integrationType,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.action === 'connected' ? 'integration_connected' : 'integration_disconnected', {
      integration_type: event.integrationType,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture(event.action === 'connected' ? 'integration_connected' : 'integration_disconnected', {
      integration_type: event.integrationType,
    });
  }
}

export interface VideoViewedEvent {
  videoId: string;
  videoTitle: string;
  contentType: string;
  source: 'summary_list' | 'detail_view' | 'other';
}

/**
 * Track when users view/open a video summary (not YouTube outbound, but viewing in-app)
 */
export function trackVideoViewed(event: VideoViewedEvent): void {
  console.log('[Telemetry] Video viewed:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Video Viewed', {
      props: {
        contentType: event.contentType,
        source: event.source,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'video_viewed', {
      video_id: event.videoId,
      content_type: event.contentType,
      source: event.source,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('video_viewed', {
      video_id: event.videoId,
      video_title: event.videoTitle,
      content_type: event.contentType,
      source: event.source,
    });
  }
}

// ============================================================================
// MONETIZATION & CONVERSION EVENTS
// ============================================================================

export interface TierSelectedEvent {
  tierLevel: number;
  tierName: string;
  price: number;
  action: 'upgrade' | 'downgrade' | 'initial_selection';
  fromTier?: number;
}

/**
 * Track when users select or upgrade to a different subscription tier
 * This is a critical conversion event for understanding pricing effectiveness
 */
export function trackTierSelected(event: TierSelectedEvent): void {
  console.log('[Telemetry] Tier selected:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Tier Selected', {
      props: {
        tier_level: event.tierLevel,
        tier_name: event.tierName,
        price: event.price,
        action: event.action,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'tier_selected', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      price: event.price,
      action: event.action,
      value: event.price, // For conversion tracking
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('tier_selected', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      price: event.price,
      action: event.action,
      from_tier: event.fromTier,
    });
  }
}

export interface CheckoutStartedEvent {
  tierLevel: number;
  tierName: string;
  price: number;
}

/**
 * Track when users initiate checkout process
 * Critical funnel metric for conversion analysis
 */
export function trackCheckoutStarted(event: CheckoutStartedEvent): void {
  console.log('[Telemetry] Checkout started:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Checkout Started', {
      props: {
        tier_level: event.tierLevel,
        tier_name: event.tierName,
        price: event.price,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'begin_checkout', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      value: event.price,
      currency: 'USD',
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('checkout_started', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      price: event.price,
    });
  }
}

export interface PurchaseCompletedEvent {
  tierLevel: number;
  tierName: string;
  price: number;
  paymentMethod?: string;
}

/**
 * Track successful purchase completion
 * Most important conversion event
 */
export function trackPurchaseCompleted(event: PurchaseCompletedEvent): void {
  console.log('[Telemetry] Purchase completed:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Purchase Completed', {
      props: {
        tier_level: event.tierLevel,
        tier_name: event.tierName,
        price: event.price,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'purchase', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      value: event.price,
      currency: 'USD',
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('purchase_completed', {
      tier_level: event.tierLevel,
      tier_name: event.tierName,
      price: event.price,
      payment_method: event.paymentMethod,
    });
  }
}

// ============================================================================
// ENGAGEMENT & FEATURE USAGE EVENTS
// ============================================================================

export interface FeatureRequestEvent {
  action: 'submitted' | 'voted' | 'viewed';
  category?: string;
  requestId?: string;
}

/**
 * Track feature request interactions
 * Helps understand user needs and product priorities
 */
export function trackFeatureRequest(event: FeatureRequestEvent): void {
  console.log('[Telemetry] Feature request:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Feature Request', {
      props: {
        action: event.action,
        category: event.category || 'unknown',
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'feature_request_' + event.action, {
      category: event.category,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('feature_request_' + event.action, {
      category: event.category,
      request_id: event.requestId,
    });
  }
}

export interface NotificationPreferenceEvent {
  preferenceType: 'email_notifications' | 'auto_email_summaries';
  enabled: boolean;
}

/**
 * Track notification preference changes
 * Helps understand how users want to receive information
 */
export function trackNotificationPreference(event: NotificationPreferenceEvent): void {
  console.log('[Telemetry] Notification preference:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Notification Preference Changed', {
      props: {
        preference_type: event.preferenceType,
        enabled: event.enabled,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'notification_preference_changed', {
      preference_type: event.preferenceType,
      enabled: event.enabled,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('notification_preference_changed', {
      preference_type: event.preferenceType,
      enabled: event.enabled,
    });
  }
}

export interface ApiKeyEvent {
  action: 'added' | 'updated' | 'removed';
  keyType: 'youtube' | 'vertex_ai' | 'service_account';
}

/**
 * Track API key management (BYOK tier)
 * Important for understanding BYOK tier adoption
 */
export function trackApiKeyManagement(event: ApiKeyEvent): void {
  console.log('[Telemetry] API key management:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('API Key Management', {
      props: {
        action: event.action,
        key_type: event.keyType,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'api_key_' + event.action, {
      key_type: event.keyType,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('api_key_' + event.action, {
      key_type: event.keyType,
    });
  }
}

export interface SearchFilterEvent {
  type: 'search' | 'filter' | 'sort';
  value?: string;
  filterType?: string;
}

/**
 * Track search and filter usage
 * Helps understand how users discover content
 */
export function trackSearchFilter(event: SearchFilterEvent): void {
  console.log('[Telemetry] Search/Filter:', event);

  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('Search Filter Used', {
      props: {
        type: event.type,
      },
    });
  }

  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'search_filter_used', {
      type: event.type,
      filter_type: event.filterType,
    });
  }

  if (typeof window !== 'undefined' && (window as any).posthog) {
    (window as any).posthog.capture('search_filter_used', {
      type: event.type,
      value: event.value,
      filter_type: event.filterType,
    });
  }
}
