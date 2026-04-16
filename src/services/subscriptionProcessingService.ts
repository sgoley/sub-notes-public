/**
 * Client-side subscription processing service
 * 
 * Runs on Electron app startup to check all enabled subscriptions
 * for new content since last_checked_at timestamp.
 * 
 * Replaces the server-side pg_cron approach which couldn't access
 * local file system for transcript fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import { getSystemYouTubeApiKey } from './vaultService';

export interface ProcessingResult {
  subscriptionsChecked: number;
  contentFound: number;
  contentProcessed: number;
  errors: number;
}

/**
 * Process all enabled subscriptions for the current user
 * Called on app startup after authentication
 */
export async function processAllSubscriptions(): Promise<ProcessingResult> {
  try {
    console.log('[SubscriptionProcessing] Starting auto-processing on app startup');

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('[SubscriptionProcessing] No authenticated user', userError);
      return { subscriptionsChecked: 0, contentFound: 0, contentProcessed: 0, errors: 1 };
    }

    // Get all enabled subscriptions for this user
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('enabled', true);

    if (subsError) {
      console.error('[SubscriptionProcessing] Error fetching subscriptions:', subsError);
      return { subscriptionsChecked: 0, contentFound: 0, contentProcessed: 0, errors: 1 };
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[SubscriptionProcessing] No enabled subscriptions found');
      return { subscriptionsChecked: 0, contentFound: 0, contentProcessed: 0, errors: 0 };
    }

    console.log(`[SubscriptionProcessing] Found ${subscriptions.length} enabled subscriptions`);

    let totalContentFound = 0;
    let totalContentProcessed = 0;
    let totalErrors = 0;

    // Process each subscription with rate limiting
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      
      try {
        console.log(`[SubscriptionProcessing] Checking ${subscription.source_type}: ${subscription.source_title} (${i + 1}/${subscriptions.length})`);

        let result;
        if (subscription.source_type === 'youtube') {
          result = await processYouTubeSubscription(subscription);
        } else if (subscription.source_type === 'substack') {
          result = await processSubstackSubscription(subscription);
        } else {
          console.log(`[SubscriptionProcessing] Unsupported source type: ${subscription.source_type}`);
          continue;
        }

        totalContentFound += result.contentFound;
        totalContentProcessed += result.contentProcessed;
        totalErrors += result.errors;

        // Update last_checked_at timestamp
        await supabase
          .from('subscriptions')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', subscription.id);

        // Log processing results
        await supabase
          .from('subscription_processing_log')
          .insert({
            subscription_id: subscription.id,
            content_found: result.contentFound,
            content_processed: result.contentProcessed,
            errors: result.errors,
            status: result.errors > 0 ? 'partial' : 'success',
          });

        // Rate limiting: Wait 1 second between subscriptions (YouTube API breathing room)
        // This is especially important for YouTube subscriptions to avoid quota issues
        if (i < subscriptions.length - 1) {
          console.log(`[SubscriptionProcessing] Waiting 1 second before next subscription (rate limiting)...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`[SubscriptionProcessing] Error processing subscription ${subscription.id}:`, error);
        totalErrors++;

        await supabase
          .from('subscription_processing_log')
          .insert({
            subscription_id: subscription.id,
            content_found: 0,
            content_processed: 0,
            errors: 1,
            status: 'failed',
          });
      }
    }

    const result = {
      subscriptionsChecked: subscriptions.length,
      contentFound: totalContentFound,
      contentProcessed: totalContentProcessed,
      errors: totalErrors,
    };

    console.log('[SubscriptionProcessing] Auto-processing complete:', result);
    return result;

  } catch (error) {
    console.error('[SubscriptionProcessing] Fatal error:', error);
    return { subscriptionsChecked: 0, contentFound: 0, contentProcessed: 0, errors: 1 };
  }
}

/**
 * Process a single YouTube subscription
 */
async function processYouTubeSubscription(subscription: any): Promise<ProcessingResult> {
  const result = { contentFound: 0, contentProcessed: 0, errors: 0 };

  try {
    // Get user's YouTube API key or use system key
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_youtube_api_key')
      .eq('id', subscription.user_id)
      .single();

    const { data: tierData } = await supabase
      .from('subscription_tiers')
      .select('tier_level')
      .eq('user_id', subscription.user_id)
      .single();

    // BYOK tier users must provide their own key
    if (tierData?.tier_level === 99 && !profile?.user_youtube_api_key) {
      console.log('[YouTube] BYOK user missing API key, skipping');
      result.errors++;
      return result;
    }

    // Get API key: user's own key (BYOK) or system key from Vault
    const youtubeApiKey = profile?.user_youtube_api_key || await getSystemYouTubeApiKey();
    if (!youtubeApiKey) {
      console.error('[YouTube] No YouTube API key available (neither user BYOK nor system Vault key)');
      result.errors++;
      return result;
    }

    // Build YouTube API request for latest videos
    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    videosUrl.searchParams.set('part', 'snippet');
    videosUrl.searchParams.set('channelId', subscription.source_id);
    videosUrl.searchParams.set('order', 'date');
    videosUrl.searchParams.set('maxResults', '5');
    videosUrl.searchParams.set('type', 'video');
    videosUrl.searchParams.set('key', youtubeApiKey);

    // If we have a last_checked_at, only get videos published after that
    if (subscription.last_checked_at) {
      videosUrl.searchParams.set('publishedAfter', new Date(subscription.last_checked_at).toISOString());
    }

    const response = await fetch(videosUrl.toString());
    if (!response.ok) {
      console.error(`[YouTube] API error for channel ${subscription.source_id}:`, response.status);
      result.errors++;
      return result;
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      console.log(`[YouTube] No new videos for ${subscription.source_title}`);
      return result;
    }

    result.contentFound = data.items.length;
    console.log(`[YouTube] Found ${data.items.length} new videos for ${subscription.source_title}`);

    // Process each new video
    for (const video of data.items) {
      const videoId = video.id.videoId;

      // Check if already processed
      const { data: existing } = await supabase
        .from('content_summaries')
        .select('id')
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .eq('user_id', subscription.user_id)
        .maybeSingle();

      if (existing) {
        console.log(`[YouTube] Video ${videoId} already processed, skipping`);
        continue;
      }

      console.log(`[YouTube] Processing new video: ${video.snippet.title} (${videoId})`);

      // Create pending content summary
      const { data: summary, error: summaryError } = await supabase
        .from('content_summaries')
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          content_type: 'video',
          content_id: videoId,
          content_title: video.snippet.title,
          content_url: `https://youtube.com/watch?v=${videoId}`,
          author: video.snippet.channelTitle,
          thumbnail_url: video.snippet.thumbnails?.default?.url || null,
          published_at: video.snippet.publishedAt,
          status: 'pending',
          processing_type: 'auto',
        })
        .select()
        .single();

      if (summaryError) {
        console.error(`[YouTube] Error creating summary:`, summaryError);
        result.errors++;
        continue;
      }

      // Fetch transcript via Electron IPC, then trigger summary generation
      // We do this asynchronously so it doesn't block processing other subscriptions
      (async () => {
        try {
          // Fetch transcript using Electron
          const { fetchTranscript } = await import('@/services/transcriptService');
          const transcriptResult = await fetchTranscript(videoId);

          if (!transcriptResult.success || !transcriptResult.transcript) {
            console.error(`[YouTube] Failed to fetch transcript for ${videoId}:`, transcriptResult.error);
            
            // Update summary status to failed
            await supabase
              .from('content_summaries')
              .update({ 
                status: 'failed',
                error_message: transcriptResult.error || 'Failed to fetch transcript'
              })
              .eq('id', summary.id);
            return;
          }

          console.log(`[YouTube] Transcript fetched for ${videoId}, calling generate-summary`);

          // Now call generate-summary with the transcript
          const response = await supabase.functions.invoke('generate-summary', {
            body: {
              summaryId: summary.id,
              videoId: videoId,
              videoTitle: video.snippet.title,
              transcript: transcriptResult.transcript, // Pass transcript from Electron
            },
          });

          if (response.error) {
            console.error(`[YouTube] Error generating summary for ${videoId}:`, response.error);
          } else {
            console.log(`[YouTube] Summary generation started for ${videoId}`);
          }
        } catch (err) {
          console.error(`[YouTube] Failed to process ${videoId}:`, err);
          
          // Update summary status to failed
          await supabase
            .from('content_summaries')
            .update({ 
              status: 'failed',
              error_message: err instanceof Error ? err.message : 'Unknown error'
            })
            .eq('id', summary.id);
        }
      })();

      result.contentProcessed++;

      // Rate limiting: Wait 1 second between videos to avoid YouTube API quota issues
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('[YouTube] Processing error:', error);
    result.errors++;
  }

  return result;
}

/**
 * Process a single Substack subscription
 */
async function processSubstackSubscription(subscription: any): Promise<ProcessingResult> {
  const result = { contentFound: 0, contentProcessed: 0, errors: 0 };

  try {
    // Get RSS feed URL
    const feedUrl = subscription.metadata?.feed_url || `${subscription.source_url}/feed`;
    console.log(`[Substack] Fetching RSS feed: ${feedUrl}`);

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'SubNotes/1.0 (RSS Reader)',
      },
    });

    if (!response.ok) {
      console.error(`[Substack] Failed to fetch feed:`, response.status);
      result.errors++;
      return result;
    }

    const feedXml = await response.text();
    const items = parseRssItems(feedXml);

    if (items.length === 0) {
      console.log(`[Substack] No articles found for ${subscription.source_title}`);
      return result;
    }

    // Filter to only new articles since last check
    const lastChecked = subscription.last_checked_at ? new Date(subscription.last_checked_at) : null;
    const newItems = lastChecked
      ? items.filter(item => new Date(item.published) > lastChecked)
      : items.slice(0, 5); // First check: take latest 5

    result.contentFound = newItems.length;
    console.log(`[Substack] Found ${newItems.length} new articles for ${subscription.source_title}`);

    // Process each new article
    for (const item of newItems) {
      const contentId = generateArticleId(item.link);

      // Check if already processed
      const { data: existing } = await supabase
        .from('content_summaries')
        .select('id')
        .eq('content_id', contentId)
        .eq('content_type', 'article')
        .eq('user_id', subscription.user_id)
        .maybeSingle();

      if (existing) {
        console.log(`[Substack] Article already processed: ${item.title}`);
        continue;
      }

      console.log(`[Substack] Processing new article: ${item.title}`);

      // Create pending content summary
      const { data: summary, error: summaryError } = await supabase
        .from('content_summaries')
        .insert({
          user_id: subscription.user_id,
          subscription_id: subscription.id,
          content_type: 'article',
          content_id: contentId,
          content_title: item.title,
          content_url: item.link,
          author: item.author || subscription.source_title,
          published_at: item.published,
          status: 'pending',
          processing_type: 'auto',
          metadata: {
            description: item.description,
          },
        })
        .select()
        .single();

      if (summaryError) {
        console.error(`[Substack] Error creating summary:`, summaryError);
        result.errors++;
        continue;
      }

      // Trigger async summary generation
      supabase.functions
        .invoke('generate-summary', {
          body: {
            summaryId: summary.id,
            contentId: contentId,
            contentTitle: item.title,
            contentType: 'article',
            articleUrl: item.link,
          },
        })
        .then((response) => {
          if (response.error) {
            console.error(`[Substack] Error generating summary:`, response.error);
          } else {
            console.log(`[Substack] Summary generation started for ${item.title}`);
          }
        })
        .catch((err) => {
          console.error(`[Substack] Failed to invoke generate-summary:`, err);
        });

      result.contentProcessed++;

      // Rate limiting: Wait 1 second between videos to avoid YouTube API quota issues
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('[Substack] Processing error:', error);
    result.errors++;
  }

  return result;
}

// Helper functions for RSS parsing

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  published: string;
  author?: string;
}> {
  const items: Array<any> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractXmlTag(itemXml, 'title');
    const link = extractXmlTag(itemXml, 'link');
    const description = extractXmlTag(itemXml, 'description');
    const published = extractXmlTag(itemXml, 'pubDate') || extractXmlTag(itemXml, 'dc:date') || new Date().toISOString();
    const author = extractXmlTag(itemXml, 'dc:creator') || extractXmlTag(itemXml, 'author');

    if (title && link) {
      items.push({ title, link, description: description || '', published, author });
    }
  }

  return items;
}

function extractXmlTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function generateArticleId(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    return pathParts[pathParts.length - 1] || urlObj.hostname;
  } catch {
    // Fallback: encode URL as base64
    return btoa(url).slice(0, 32);
  }
}
