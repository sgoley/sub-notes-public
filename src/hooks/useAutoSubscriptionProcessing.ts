/**
 * Hook to automatically process subscriptions on app startup
 * 
 * Runs once when the Dashboard is first loaded after authentication.
 * Checks all enabled subscriptions for new content since last_checked_at.
 */

import { useEffect, useRef } from 'react';
import { processAllSubscriptions } from '@/services/subscriptionProcessingService';
import { toast } from '@/hooks/use-toast';

export function useAutoSubscriptionProcessing() {
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Only run once per app session
    if (hasProcessed.current) {
      return;
    }

    const processSubscriptions = async () => {
      try {
        console.log('[AutoProcessing] Starting subscription check on app startup');
        
        const result = await processAllSubscriptions();
        
        // Show toast notification if new content was found
        if (result.contentFound > 0) {
          toast({
            title: "New content found!",
            description: `Found ${result.contentFound} new items from your subscriptions. Processing ${result.contentProcessed} of them.`,
          });
        } else if (result.subscriptionsChecked > 0) {
          console.log('[AutoProcessing] No new content found from subscriptions');
        }

        if (result.errors > 0) {
          console.warn(`[AutoProcessing] Completed with ${result.errors} errors`);
        }

        hasProcessed.current = true;
      } catch (error) {
        console.error('[AutoProcessing] Failed to process subscriptions:', error);
      }
    };

    // Delay processing by 2 seconds to allow dashboard to load first
    const timeoutId = setTimeout(() => {
      processSubscriptions();
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
}
