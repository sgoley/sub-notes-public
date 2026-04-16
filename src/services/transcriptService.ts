/**
 * Transcript Service
 * Handles fetching transcripts either via Electron IPC (desktop app) or Supabase Edge Function (web fallback)
 */

import { supabase } from '@/integrations/supabase/client';
import { getSystemYouTubeApiKey } from './vaultService';

export interface TranscriptResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

/**
 * Check if running in Electron environment
 */
export const isElectron = (): boolean => {
  const hasAPI = !!(window as any).electronAPI;
  console.log('[isElectron] Checking Electron environment:', hasAPI);
  console.log('[isElectron] window.electronAPI:', (window as any).electronAPI);
  return hasAPI;
};

/**
 * Fetch transcript using Electron IPC (local, no rate limiting)
 */
async function fetchTranscriptViaElectron(videoId: string): Promise<TranscriptResult> {
  try {
    console.log(`[TranscriptService] Fetching via Electron for video: ${videoId}`);
    const result = await (window as any).electronAPI.fetchTranscript(videoId);
    return result;
  } catch (error) {
    console.error('[TranscriptService] Electron fetch failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript via Electron',
    };
  }
}

/**
 * Fetch transcript using Supabase Edge Function (web fallback, may have rate limits)
 */
async function fetchTranscriptViaEdgeFunction(videoId: string): Promise<TranscriptResult> {
  try {
    console.log(`[TranscriptService] Fetching via Edge Function for video: ${videoId}`);
    // This would call the edge function if we kept it, but for now we'll return an error
    // since the whole point of Electron is to avoid edge function rate limiting
    return {
      success: false,
      error: 'Web mode not supported - please use the desktop app to fetch transcripts',
    };
  } catch (error) {
    console.error('[TranscriptService] Edge function fetch failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transcript',
    };
  }
}

/**
 * Check for cached transcript in the database
 */
async function fetchTranscriptFromCache(videoId: string): Promise<TranscriptResult> {
  try {
    console.log(`[TranscriptService] Checking cache for video: ${videoId}`);
    const { data: cached, error } = await supabase
      .from('content_transcripts')
      .select('transcript, status')
      .eq('content_type', 'video')
      .eq('content_id', videoId)
      .eq('status', 'completed')
      .single();

    if (error || !cached?.transcript) {
      console.log(`[TranscriptService] No cached transcript found for: ${videoId}`);
      return { success: false, error: 'No cached transcript' };
    }

    console.log(`[TranscriptService] Found cached transcript for: ${videoId}, length: ${cached.transcript.length}`);
    return { success: true, transcript: cached.transcript };
  } catch (error) {
    console.error('[TranscriptService] Cache lookup failed:', error);
    return { success: false, error: 'Cache lookup failed' };
  }
}

/**
 * Main transcript fetching function
 * Checks cache first, then uses Electron if available, falls back to edge function
 */
export async function fetchTranscript(videoId: string): Promise<TranscriptResult> {
  // First, check the database cache
  const cachedResult = await fetchTranscriptFromCache(videoId);
  if (cachedResult.success) {
    return cachedResult;
  }

  // Not in cache, fetch fresh
  if (isElectron()) {
    return fetchTranscriptViaElectron(videoId);
  } else {
    return fetchTranscriptViaEdgeFunction(videoId);
  }
}

/**
 * Process content (video or article) and generate summary
 * This replaces the process-video edge function for local processing
 */
export async function processVideoLocally(
  contentUrl: string,
  processType: 'dashboard' | 'email',
  onProgress?: (current: number, total: number, videoTitle?: string) => void,
  summaryStyle?: string
): Promise<{ success: boolean; data?: any; error?: string; videoId?: string; playlistResults?: any[] }> {
  try {
    console.log('[processVideoLocally] Starting process for:', contentUrl);
    console.log('[processVideoLocally] URL length:', contentUrl.length);
    console.log('[processVideoLocally] URL charCodes:', Array.from(contentUrl).map(c => c.charCodeAt(0)).join(','));

    // Check if it's a playlist URL
    const playlistId = extractPlaylistId(contentUrl);
    if (playlistId) {
      console.log('[processVideoLocally] Detected playlist:', playlistId);
      return await processYouTubePlaylist(playlistId, processType, onProgress, summaryStyle);
    }

    // Detect content type for single video/article
    const contentType = detectContentType(contentUrl);
    console.log('[processVideoLocally] Detected content type:', contentType);

    if (contentType === 'video') {
      return await processYouTubeContent(contentUrl, processType, summaryStyle);
    } else if (contentType === 'article') {
      return await processSubstackContent(contentUrl, processType, summaryStyle);
    } else {
      return { success: false, error: 'Unsupported URL. Please provide a YouTube video, playlist, or Substack URL.' };
    }
  } catch (error) {
    console.error('[processVideoLocally] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function detectContentType(url: string): 'video' | 'article' | null {
  const urlLower = url.toLowerCase();
  
  console.log('[detectContentType] Checking URL:', url);
  console.log('[detectContentType] URL (lowercase):', urlLower);
  
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    console.log('[detectContentType] Detected as video');
    return 'video';
  }
  
  // Substack posts have /p/ in the path, regardless of domain
  // Supports:
  // - Standard: example.substack.com/p/article-slug
  // - Custom domain: customdomain.com/p/article-slug
  // - Home feed: substack.com/home/post/p-12345
  const hasSlashP = urlLower.includes('/p/');
  const hasHomePost = urlLower.includes('/home/post/p-');
  console.log('[detectContentType] Has /p/:', hasSlashP);
  console.log('[detectContentType] Has /home/post/p-:', hasHomePost);
  
  if (hasSlashP || hasHomePost) {
    console.log('[detectContentType] Detected as article');
    return 'article';
  }
  
  console.log('[detectContentType] Could not detect content type - returning null');
  return null;
}

async function processSubstackContent(
  articleUrl: string,
  processType: 'dashboard' | 'email',
  summaryStyle?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('[processSubstackContent] Processing Substack article:', articleUrl);

  try {
    // For Substack, we call the edge function directly since we don't need Electron
    const response = await supabase.functions.invoke('process-content', {
      body: {
        contentUrl: articleUrl,
        processType,
        summaryStyle: summaryStyle || 'balanced',
      },
    });

    console.log('[processSubstackContent] Raw response:', response);

    if (response.error) {
      console.error('[processSubstackContent] Edge function error:', response.error);
      console.error('[processSubstackContent] Error details:', JSON.stringify(response.error, null, 2));

      // Try to extract meaningful error message
      let errorMessage = response.error.message || 'Failed to process Substack article';

      // Check if there's additional context in the error
      if (response.error.context) {
        console.error('[processSubstackContent] Error context:', response.error.context);

        // Try to parse error from context
        try {
          if (typeof response.error.context === 'string') {
            const parsed = JSON.parse(response.error.context);
            errorMessage = parsed.error || errorMessage;
          } else if (typeof response.error.context === 'object') {
            errorMessage = response.error.context.error || response.error.context.message || errorMessage;
          }
        } catch (e) {
          // If parsing fails, use the context as-is
          errorMessage = String(response.error.context);
        }
      }

      console.error('[processSubstackContent] Final error message:', errorMessage);
      return { success: false, error: errorMessage };
    }

    console.log('[processSubstackContent] Success!', response.data);
    return { success: true, data: response.data };
  } catch (err) {
    console.error('[processSubstackContent] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error processing Substack article'
    };
  }
}

/**
 * Process article content via Edge Function (works in web browser, no Electron required)
 * This is the web-compatible version for Substack and other article content
 */
export async function processArticleWeb(
  contentUrl: string,
  processType: 'dashboard' | 'email',
  summaryStyle?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  return processSubstackContent(contentUrl, processType, summaryStyle);
}

/**
 * Check if a URL is an article (Substack, etc.) vs video content
 */
export function isArticleUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  // Substack patterns
  if (urlLower.includes('/p/') || urlLower.includes('/home/post/p-')) {
    return true;
  }
  return false;
}

async function processYouTubeContent(
  videoUrl: string,
  processType: 'dashboard' | 'email',
  summaryStyle?: string
): Promise<{ success: boolean; data?: any; error?: string; videoId?: string }> {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      console.error('[processYouTubeContent] Invalid video URL');
      return { success: false, error: 'Invalid YouTube video URL' };
    }
    console.log('[processYouTubeContent] Video ID:', videoId);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error('[processYouTubeContent] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    console.log('[processYouTubeContent] User authenticated:', user.id);

    // Fetch video metadata from YouTube API
    // Try to get system API key from Vault (more secure than .env)
    const youtubeApiKey = await getSystemYouTubeApiKey();
    console.log('[processYouTubeContent] YouTube API key retrieved from Vault:', !!youtubeApiKey);
    if (!youtubeApiKey) {
      return { success: false, error: 'YouTube API key not configured. Please add system_youtube_api_key to Vault.' };
    }

    const videoResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${youtubeApiKey}`
    );

    if (!videoResponse.ok) {
      return { success: false, error: 'Failed to fetch video details from YouTube' };
    }

    const videoData = await videoResponse.json();
    if (!videoData.items || videoData.items.length === 0) {
      return { success: false, error: 'Video not found on YouTube' };
    }

    const video = videoData.items[0];
    const videoTitle = video.snippet.title;
    const channelTitle = video.snippet.channelTitle;
    const thumbnailUrl = video.snippet.thumbnails.default.url;
    
    // Parse ISO 8601 duration (e.g., PT1H23M45S) to seconds
    const duration = video.contentDetails?.duration;
    let durationSeconds = null;
    if (duration) {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        durationSeconds = hours * 3600 + minutes * 60 + seconds;
      }
    }

    // Check if user already has a summary for this video
    const { data: existingSummary } = await supabase
      .from('content_summaries')
      .select('*')
      .eq('user_id', user.id)
      .eq('content_type', 'video')
      .eq('content_id', videoId)
      .single();

    let summaryRecord;

    if (existingSummary) {
      // Update existing record
      const { data: updatedData, error: updateError } = await supabase
        .from('content_summaries')
        .update({
          status: 'pending',
          processing_type: processType,
          summary_style: summaryStyle || 'balanced',
          error_message: null,
          content_duration_seconds: durationSeconds,
        })
        .eq('id', existingSummary.id)
        .select()
        .single();

      if (updateError) throw updateError;
      summaryRecord = updatedData;
    } else {
      // Create new record
      const { data: newData, error } = await supabase
        .from('content_summaries')
        .insert({
          user_id: user.id,
          content_type: 'video',
          content_id: videoId,
          content_title: videoTitle,
          content_url: `https://www.youtube.com/watch?v=${videoId}`,
          author: channelTitle,
          thumbnail_url: thumbnailUrl,
          status: 'pending',
          processing_type: processType,
          summary_style: summaryStyle || 'balanced',
          content_duration_seconds: durationSeconds,
        })
        .select()
        .single();

      if (error) throw error;
      summaryRecord = newData;
    }

    // Trigger background processing via edge function (still needed for AI summary generation)
    // But we'll fetch the transcript locally first
    console.log('[processYouTubeContent] Fetching transcript via Electron...');
    const transcriptResult = await fetchTranscript(videoId);

    if (!transcriptResult.success || !transcriptResult.transcript) {
      console.error('[processYouTubeContent] Transcript fetch failed:', transcriptResult.error);
      // Update status to failed
      await supabase
        .from('content_summaries')
        .update({
          status: 'failed',
          error_message: transcriptResult.error || 'Failed to fetch transcript',
        })
        .eq('id', summaryRecord.id);

      return { success: false, error: transcriptResult.error };
    }

    console.log('[processYouTubeContent] Transcript fetched successfully, length:', transcriptResult.transcript.length);
    console.log('[processYouTubeContent] Calling generate-summary edge function (fire-and-forget)...');

    // Fire-and-forget: Call generate-summary edge function without waiting for response
    // The edge function can take 60+ seconds for long transcripts, and we already poll for status
    supabase.functions.invoke('generate-summary', {
      body: {
        summaryId: summaryRecord.id,
        videoId,
        transcript: transcriptResult.transcript, // Pass the locally-fetched transcript
        summaryStyle: summaryStyle || 'balanced',
      },
    }).then(({ error }) => {
      if (error) {
        console.error('[processYouTubeContent] Edge function error (async):', error);
      } else {
        console.log('[processYouTubeContent] Edge function completed successfully (async)');
      }
    }).catch((err) => {
      console.error('[processYouTubeContent] Edge function exception (async):', err);
    });

    console.log('[processYouTubeContent] Success! Summary generation started');
    return { success: true, data: summaryRecord, videoId };
  } catch (error) {
    console.error('[processYouTubeContent] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\?\/]+)/];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract playlist ID from YouTube URL
 * Supports: youtube.com/playlist?list=PLXXX or youtube.com/watch?v=XXX&list=PLXXX
 */
function extractPlaylistId(url: string): string | null {
  const playlistPattern = /[?&]list=([^&]+)/;
  const match = url.match(playlistPattern);
  return match ? match[1] : null;
}

/**
 * Process entire YouTube playlist
 * Fetches all video IDs and processes each one
 */
async function processYouTubePlaylist(
  playlistId: string,
  processType: 'dashboard' | 'email',
  onProgress?: (current: number, total: number, videoTitle?: string) => void,
  summaryStyle?: string
): Promise<{ success: boolean; playlistResults?: any[]; error?: string }> {
  try {
    console.log('[processYouTubePlaylist] Fetching playlist videos:', playlistId);

    // Get YouTube API key
    const youtubeApiKey = await getSystemYouTubeApiKey();
    if (!youtubeApiKey) {
      return { success: false, error: 'YouTube API key not configured. Please add system_youtube_api_key to Vault.' };
    }

    // Fetch all videos from the playlist
    const videoIds: string[] = [];
    let nextPageToken: string | null = null;
    
    do {
      const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      playlistUrl.searchParams.set('part', 'snippet,contentDetails');
      playlistUrl.searchParams.set('playlistId', playlistId);
      playlistUrl.searchParams.set('maxResults', '50'); // Max allowed by API
      playlistUrl.searchParams.set('key', youtubeApiKey);
      
      if (nextPageToken) {
        playlistUrl.searchParams.set('pageToken', nextPageToken);
      }

      const response = await fetch(playlistUrl.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[processYouTubePlaylist] API error:', errorText);
        return { success: false, error: `Failed to fetch playlist: ${response.statusText}` };
      }

      const data = await response.json();
      
      // Extract video IDs from playlist items
      for (const item of data.items || []) {
        const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (videoId) {
          videoIds.push(videoId);
        }
      }

      nextPageToken = data.nextPageToken || null;
    } while (nextPageToken);

    console.log(`[processYouTubePlaylist] Found ${videoIds.length} videos in playlist`);

    if (videoIds.length === 0) {
      return { success: false, error: 'No videos found in playlist' };
    }

    // Process each video
    const results = [];
    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i];
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log(`[processYouTubePlaylist] Processing video ${i + 1}/${videoIds.length}: ${videoId}`);
      
      // Notify progress
      if (onProgress) {
        onProgress(i + 1, videoIds.length, videoId);
      }

      try {
        const result = await processYouTubeContent(videoUrl, processType, summaryStyle);
        results.push({
          videoId,
          success: result.success,
          data: result.data,
          error: result.error,
        });

        // Small delay to avoid hammering the API
        if (i < videoIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[processYouTubePlaylist] Error processing video ${videoId}:`, error);
        results.push({
          videoId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[processYouTubePlaylist] Completed: ${successCount}/${videoIds.length} successful`);

    return {
      success: true,
      playlistResults: results,
    };
  } catch (error) {
    console.error('[processYouTubePlaylist] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process playlist',
    };
  }
}
