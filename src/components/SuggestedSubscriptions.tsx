import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Youtube } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SuggestedChannel {
  author: string;
  content_type: string;
  content_count: number;
  sample_url: string;
  thumbnail_url?: string;
}

interface SuggestedSubscriptionsProps {
  onSubscriptionAdded?: () => void;
}

export const SuggestedSubscriptions = ({ onSubscriptionAdded }: SuggestedSubscriptionsProps) => {
  const [suggestions, setSuggestions] = useState<SuggestedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingChannel, setAddingChannel] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get distinct authors/channels from content_summaries that aren't already subscribed
      const { data: summaries, error: summariesError } = await supabase
        .from("content_summaries")
        .select("author, content_type, content_url, thumbnail_url")
        .eq("user_id", user.id)
        .not("author", "is", null);

      if (summariesError) {
        console.error("Error fetching summaries:", summariesError);
        setLoading(false);
        return;
      }

      // Get existing subscriptions to filter them out
      const { data: existingSubscriptions } = await supabase
        .from("subscriptions")
        .select("source_title")
        .eq("user_id", user.id);

      const existingTitles = new Set(
        existingSubscriptions?.map(sub => sub.source_title.toLowerCase()) || []
      );

      // Group by author and count
      const authorMap = new Map<string, SuggestedChannel>();
      
      summaries?.forEach((summary) => {
        if (!summary.author) return;
        
        const authorLower = summary.author.toLowerCase();
        
        // Skip if already subscribed
        if (existingTitles.has(authorLower)) return;

        if (authorMap.has(summary.author)) {
          const existing = authorMap.get(summary.author)!;
          existing.content_count += 1;
        } else {
          authorMap.set(summary.author, {
            author: summary.author,
            content_type: summary.content_type,
            content_count: 1,
            sample_url: summary.content_url,
            thumbnail_url: summary.thumbnail_url || undefined,
          });
        }
      });

      // Convert to array and sort by content count
      const suggestionsArray = Array.from(authorMap.values())
        .sort((a, b) => b.content_count - a.content_count)
        .slice(0, 10); // Show top 10 suggestions

      setSuggestions(suggestionsArray);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const extractChannelIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      
      // YouTube URL patterns
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        // Extract channel ID from various URL formats
        // Format 1: /watch?v=VIDEO_ID (need to fetch channel from video)
        // Format 2: /channel/CHANNEL_ID
        // Format 3: /@username
        // Format 4: /c/customname
        
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        
        if (pathParts[0] === 'channel' && pathParts[1]) {
          return pathParts[1]; // Already have channel ID
        }
        
        if (pathParts[0]?.startsWith('@')) {
          return pathParts[0]; // Username format
        }
        
        if (pathParts[0] === 'c' && pathParts[1]) {
          return pathParts[1]; // Custom name format
        }
        
        // For watch URLs, we'll need to derive from the video
        // Return null to indicate we need to fetch it differently
        return null;
      }
      
      // Substack URL
      if (urlObj.hostname.includes('substack.com')) {
        return urlObj.hostname.split('.')[0]; // Get subdomain
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }
  };

  const handleAddSubscription = async (suggestion: SuggestedChannel) => {
    setAddingChannel(suggestion.author);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to add subscriptions",
          variant: "destructive",
        });
        setAddingChannel(null);
        return;
      }

      // For YouTube videos, we need to use the add-subscription edge function
      if (suggestion.content_type === 'video') {
        // Try to extract channel info from the sample URL
        const channelId = extractChannelIdFromUrl(suggestion.sample_url);
        
        if (!channelId && suggestion.sample_url.includes('youtube.com/watch')) {
          // For watch URLs, call add-subscription edge function with the video URL
          // It will extract the channel info
          const { data, error } = await supabase.functions.invoke('add-subscription', {
            body: { 
              sourceUrl: suggestion.sample_url,
              sourceType: 'youtube' 
            },
          });

          if (error) {
            // Parse error details
            let errorMessage = "Failed to add subscription";
            let errorCode = null;
            
            if (error.context) {
              const errorBody = error.context;
              errorMessage = errorBody.error || errorMessage;
              errorCode = errorBody.code;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            throw { message: errorMessage, code: errorCode };
          }

          toast({
            title: "Subscription added!",
            description: `You're now subscribed to ${suggestion.author}`,
          });
          
          fetchSuggestions(); // Refresh suggestions
          onSubscriptionAdded?.();
        } else if (channelId) {
          // We have the channel ID or username, create the channel URL
          const channelUrl = channelId.startsWith('@') 
            ? `https://www.youtube.com/${channelId}`
            : `https://www.youtube.com/channel/${channelId}`;

          const { data, error } = await supabase.functions.invoke('add-subscription', {
            body: { 
              sourceUrl: channelUrl,
              sourceType: 'youtube' 
            },
          });

          if (error) {
            // Parse error details
            let errorMessage = "Failed to add subscription";
            let errorCode = null;
            
            if (error.context) {
              const errorBody = error.context;
              errorMessage = errorBody.error || errorMessage;
              errorCode = errorBody.code;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            throw { message: errorMessage, code: errorCode };
          }

          toast({
            title: "Subscription added!",
            description: `You're now subscribed to ${suggestion.author}`,
          });
          
          fetchSuggestions(); // Refresh suggestions
          onSubscriptionAdded?.();
        } else {
          throw new Error("Could not extract channel information from URL");
        }
      } else if (suggestion.content_type === 'article') {
        // For Substack articles, derive the publication URL
        const url = new URL(suggestion.sample_url);
        const publicationUrl = `${url.protocol}//${url.hostname}`;

        const { data, error } = await supabase.functions.invoke('add-subscription', {
          body: { 
            sourceUrl: publicationUrl,
            sourceType: 'substack' 
          },
        });

        if (error) {
          // Parse error details
          let errorMessage = "Failed to add subscription";
          let errorCode = null;
          
          if (error.context) {
            const errorBody = error.context;
            errorMessage = errorBody.error || errorMessage;
            errorCode = errorBody.code;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          throw { message: errorMessage, code: errorCode };
        }

        toast({
          title: "Subscription added!",
          description: `You're now subscribed to ${suggestion.author}`,
        });
        
        fetchSuggestions(); // Refresh suggestions
        onSubscriptionAdded?.();
      }
    } catch (error: any) {
      console.error("Error adding subscription:", error);
      
      const errorMessage = error.message || "Failed to add subscription";
      const errorCode = error.code;
      
      // Check for subscription limit error
      const isLimitError = errorCode === "SUBSCRIPTION_LIMIT_REACHED" || 
                          errorMessage.includes("Subscription limit reached");
      
      if (isLimitError) {
        toast({
          title: "Subscription Limit Reached",
          description: errorMessage,
          variant: "destructive",
          action: (
            <button
              onClick={() => window.location.href = "/dashboard/settings?tab=billing"}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              Upgrade Plan
            </button>
          ),
        });
      } else {
        toast({
          title: "Error adding subscription",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setAddingChannel(null);
    }
  };

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (suggestions.length === 0) {
    return null; // Don't show section if no suggestions
  }

  return (
    <Card className="mb-6 border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Suggested Subscriptions</CardTitle>
        </div>
        <CardDescription>
          Based on content you've already processed. Click to subscribe!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.author}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {suggestion.thumbnail_url ? (
                  <img
                    src={suggestion.thumbnail_url}
                    alt={suggestion.author}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    {suggestion.content_type === 'video' ? (
                      <Youtube className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium">{suggestion.author}</div>
                  <div className="text-sm text-muted-foreground">
                    You've processed {suggestion.content_count}{" "}
                    {suggestion.content_count === 1 ? "item" : "items"} from this{" "}
                    {suggestion.content_type === 'video' ? 'channel' : 'publication'}
                  </div>
                </div>
                <Badge variant="outline" className="ml-2">
                  {suggestion.content_type === 'video' ? 'YouTube' : 'Substack'}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => handleAddSubscription(suggestion)}
                disabled={addingChannel === suggestion.author}
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                {addingChannel === suggestion.author ? "Adding..." : "Subscribe"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
