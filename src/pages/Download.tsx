import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download as DownloadIcon, Apple, MonitorPlay } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Release {
  version: string;
  tag_name: string;
  name: string;
  published_at: string;
  changelog: string | null;
  mac_dmg_url: string | null;
  mac_dmg_size: number | null;
  windows_exe_url: string | null;
  windows_exe_size: number | null;
}

export default function Download() {
  const navigate = useNavigate();
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestRelease();
  }, []);

  const fetchLatestRelease = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('releases')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError("No releases available yet. Check back soon!");
        } else {
          throw fetchError;
        }
        setLoading(false);
        return;
      }

      setRelease(data);
    } catch (err) {
      console.error("Error fetching release:", err);
      setError("Unable to load download information. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getMacDownload = () => {
    if (!release?.mac_dmg_url) return null;
    return {
      name: `SubNotes-${release.version}-arm64.dmg`,
      browser_download_url: release.mac_dmg_url,
      size: release.mac_dmg_size || 0
    };
  };

  const getWindowsDownload = () => {
    if (!release?.windows_exe_url) return null;
    return {
      name: `SubNotes-${release.version}-Portable-x64.exe`,
      browser_download_url: release.windows_exe_url,
      size: release.windows_exe_size || 0
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-6 w-6" />
            <h1 className="text-xl font-bold">SubNotes</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Download SubNotes</h2>
          <p className="text-xl text-muted-foreground">
            Get AI-powered video summaries delivered straight to your Obsidian vault
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading download information...</p>
          </div>
        ) : error ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchLatestRelease}>Try Again</Button>
            </CardContent>
          </Card>
        ) : release ? (
          <div className="space-y-8">
            {/* Version Info */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Version {release.tag_name}</CardTitle>
                <CardDescription>
                  Released on {formatDate(release.published_at)}
                </CardDescription>
              </CardHeader>
              {release.changelog && (
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {release.changelog}
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Download Options */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* macOS Download */}
              {getMacDownload() && (
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Apple className="h-8 w-8" />
                      <div>
                        <CardTitle>macOS</CardTitle>
                        <CardDescription>
                          For Apple Silicon (M1/M2/M3) and Intel Macs
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">{getMacDownload()?.name}</p>
                      <p>{formatFileSize(getMacDownload()?.size || 0)}</p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => window.open(getMacDownload()?.browser_download_url, "_blank")}
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Download for macOS
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Windows Download */}
              {getWindowsDownload() && (
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <MonitorPlay className="h-8 w-8" />
                      <div>
                        <CardTitle>Windows</CardTitle>
                        <CardDescription>
                          For Windows 10 and 11 (64-bit)
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">{getWindowsDownload()?.name}</p>
                      <p>{formatFileSize(getWindowsDownload()?.size || 0)}</p>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => window.open(getWindowsDownload()?.browser_download_url, "_blank")}
                    >
                      <DownloadIcon className="mr-2 h-4 w-4" />
                      Download for Windows
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Installation Instructions */}
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Installation Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Apple className="h-5 w-5" />
                    macOS
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Download the .dmg file</li>
                    <li>Open the downloaded file</li>
                    <li>Drag SubNotes to your Applications folder</li>
                    <li>
                      <strong>First time opening:</strong> Right-click (or Control-click) on SubNotes in Applications and select "Open"
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                        <li>You'll see a warning that "Apple cannot verify SubNotes is free of malware"</li>
                        <li>Click "Open" to confirm you want to run the app</li>
                        <li>After this first time, you can open SubNotes normally</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Alternative method:</strong> If the above doesn't work, go to System Settings → Privacy & Security, scroll down to find the blocked app, and click "Open Anyway"
                    </li>
                  </ol>
                  <div className="mt-3 p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
                    <strong>Why does this happen?</strong> SubNotes is not yet signed with an Apple Developer certificate ($99/year). The app is safe to use - this warning appears for all apps distributed outside the Mac App Store without Apple's paid certification.
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <MonitorPlay className="h-5 w-5" />
                    Windows
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-2">
                    <li>Download the Setup.exe file</li>
                    <li>Run the installer</li>
                    <li>Follow the installation wizard</li>
                    <li>Launch SubNotes from your Start Menu or Desktop shortcut</li>
                    <li>If Windows Defender SmartScreen appears, click "More info" then "Run anyway"</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Release Link (Optional) */}
            {release.tag_name && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => window.open(`https://github.com/sgoley/sub-notes/releases/tag/${release.tag_name}`, "_blank")}
                >
                  View Release on GitHub
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {/* Features Section */}
        <div className="mt-16 pt-16 border-t">
          <h3 className="text-2xl font-bold text-center mb-8">What's Included</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Summaries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get concise, well-formatted summaries of YouTube videos powered by Google Gemini AI.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Obsidian Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Automatically save summaries to your Obsidian vault with YAML frontmatter for easy organization.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Local Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your Obsidian vault path stays on your machine. Only summaries are stored in the cloud.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 SubNotes. Built with Electron, React, and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
