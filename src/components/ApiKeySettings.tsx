import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ExternalLink, Key } from "lucide-react";

export function ApiKeySettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isByokTier, setIsByokTier] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  useEffect(() => {
    loadApiKeys();
    checkByokTier();
  }, []);

  const checkByokTier = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("subscription_tiers")
      .select("tier_level")
      .eq("user_id", user.id)
      .single();

    setIsByokTier(data?.tier_level === 99);
  };

  const loadApiKeys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_youtube_api_key, user_gemini_api_key, user_gcp_project_id")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setYoutubeApiKey(data.user_youtube_api_key || "");
      setGeminiApiKey(data.user_gemini_api_key || "");
      setGcpProjectId(data.user_gcp_project_id || "");
    }
  };

  const handleSave = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save API keys",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        user_youtube_api_key: youtubeApiKey.trim() || null,
        user_gemini_api_key: geminiApiKey.trim() || null,
        user_gcp_project_id: gcpProjectId.trim() || null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save API keys. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "API keys saved successfully",
      });
    }
  };

  if (!isByokTier) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Settings
        </CardTitle>
        <CardDescription>
          Your "Bring Your Own Key" (BYOK) tier requires you to provide your own API keys.
          These keys are used only for your account and are stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            <strong>BYOK Tier Benefits:</strong> Unlimited subscriptions and summaries for just $3/month.
            You provide your own Google API keys to cover usage costs.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* YouTube API Key */}
          <div className="space-y-2">
            <Label htmlFor="youtube-key" className="flex items-center gap-2">
              YouTube Data API Key
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="youtube-key"
                  type={showYoutubeKey ? "text" : "password"}
                  value={youtubeApiKey}
                  onChange={(e) => setYoutubeApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowYoutubeKey(!showYoutubeKey)}
                >
                  {showYoutubeKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Used to fetch channel and video metadata.{" "}
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Get API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2">
            <Label htmlFor="gemini-key" className="flex items-center gap-2">
              Gemini API Key
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? "text" : "password"}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Used to generate AI summaries with Gemini 2.0 Flash.{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Get API key
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* GCP Project ID (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="gcp-project">
              GCP Project ID (Optional)
            </Label>
            <Input
              id="gcp-project"
              type="text"
              value={gcpProjectId}
              onChange={(e) => setGcpProjectId(e.target.value)}
              placeholder="my-project-123"
            />
            <p className="text-sm text-muted-foreground">
              Only needed if using Vertex AI instead of Gemini API directly.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save API Keys"}
          </Button>
          <Button variant="outline" onClick={loadApiKeys} disabled={loading}>
            Reset
          </Button>
        </div>

        <Alert>
          <AlertDescription className="text-sm">
            <strong>Security Note:</strong> Your API keys are stored encrypted at rest in our database.
            They are only used by your account to make API calls on your behalf. We never share or use
            your keys for any other purpose.
          </AlertDescription>
        </Alert>

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2">Cost Estimates</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• YouTube API: Free tier includes 10,000 units/day (~100 requests)</li>
            <li>• Gemini API: First 15 requests/minute free, then ~$0.01-0.05 per summary</li>
            <li>• With 20 subscriptions checking daily, you'll stay well within free tiers</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
