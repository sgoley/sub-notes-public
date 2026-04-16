import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TermsDialog } from "@/components/TermsDialog";
import { Download, Sparkles, Mail, FileText, Tags, FolderSync, Zap, Clock, ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();

  // Check if user is already authenticated and redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const features = [
    {
      icon: Sparkles,
      title: "AI-Powered Summaries",
      description: "Get intelligent summaries of YouTube videos using advanced AI. Extract key insights without watching hours of content."
    },
    {
      icon: Mail,
      title: "Email Notifications",
      description: "Receive summaries directly in your inbox when new videos are published by channels you follow."
    },
    {
      icon: FileText,
      title: "Markdown Exports",
      description: "Download summaries as formatted markdown files, perfect for your note-taking workflow."
    },
    {
      icon: Tags,
      title: "Smart Auto-Tagging",
      description: "Automatically categorize and tag content based on topics, making it easy to organize and search."
    },
    {
      icon: FolderSync,
      title: "Cloud Storage Sync",
      description: "Sync your summaries to Google Drive or Dropbox automatically. Access your notes anywhere."
    },
    {
      icon: Zap,
      title: "Quick Highlights",
      description: "Browse key points and highlights at a glance before diving into the full summary."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Sub-Notes</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section - Primary Focal Point */}
      <section className="flex min-h-screen items-center justify-center px-4 pt-20">
        <div className="text-center space-y-8 max-w-3xl">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FileText className="h-12 w-12 text-primary" />
              <h1 className="text-6xl md:text-7xl font-bold tracking-tight">Sub-Notes</h1>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Your Time. Your Algorithm.<br />Your Knowledge.
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
              Cut through the noise and capture what matters. AI-powered summaries let you stay current with your favorite channels without missing the insights that move you forward.
            </p>
          </div>

          {/* Value Props */}
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
              <span>Save 10+ hours/week</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-powered insights</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
              <FolderSync className="h-4 w-4 text-primary" />
              <span>Sync to your tools</span>
            </div>
          </div>

          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 h-14">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/download")} className="text-lg px-8 h-14">
              <Download className="mr-2 h-5 w-5" />
              Download App
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Free tier available • No credit card required
          </p>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-xs text-muted-foreground">Scroll to explore</span>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Transform Hours of Watching Into Minutes of Reading</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Three simple steps to turn your YouTube subscriptions into a searchable knowledge base
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">1. Subscribe Once</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Add your favorite YouTube channels. New videos are automatically detected and queued for processing.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">2. AI Does the Work</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Advanced AI analyzes transcripts and extracts key insights, highlights, and actionable takeaways in seconds.
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-lg">3. Read Anywhere</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Get summaries via email, read in-app, or auto-sync to Obsidian, Google Drive, and Dropbox. Your knowledge, your way.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Features</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Everything you need to stay on top of your favorite YouTube content
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-6">
                  <Icon className="h-8 w-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Loved by Learners & Creators</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            See how Sub-Notes is transforming how people learn from YouTube
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold">SJ</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Sarah J.</p>
                  <p className="text-xs text-muted-foreground">Product Manager</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "I follow 20+ tech channels and never miss what's important. Sub-Notes gives me the insights in minutes, so I can focus my time on what I actually build. Total game changer."
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold">MK</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Marcus K.</p>
                  <p className="text-xs text-muted-foreground">Researcher</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "The Obsidian sync is perfect for my research workflow. AI summaries go straight into my knowledge base with proper tagging. Exactly what I needed."
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold">EL</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Emily L.</p>
                  <p className="text-xs text-muted-foreground">Student</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                "I've reclaimed my evenings while keeping up with my coursework. The auto-tagging helps me find related content instantly. Best $5/month I spend."
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">See It In Action</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            A glimpse into the Sub-Notes experience
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Placeholder Screenshots */}
            <Card className="p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Dashboard Screenshot</p>
              </div>
              <p className="mt-4 text-sm text-center text-muted-foreground">
                Manage all your subscriptions in one place
              </p>
            </Card>

            <Card className="p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Summary View Screenshot</p>
              </div>
              <p className="mt-4 text-sm text-center text-muted-foreground">
                Read AI-generated summaries with highlights
              </p>
            </Card>

            <Card className="p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Settings Screenshot</p>
              </div>
              <p className="mt-4 text-sm text-center text-muted-foreground">
                Customize notifications and integrations
              </p>
            </Card>

            <Card className="p-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Export Screenshot</p>
              </div>
              <p className="mt-4 text-sm text-center text-muted-foreground">
                Export to markdown and sync with cloud storage
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Take Control of Your Learning</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Join thousands who've reclaimed 10+ hours per week while staying current with the content that matters to them.
            Start free—no credit card required.
          </p>
          <div className="flex gap-4 justify-center flex-wrap pt-4">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8 h-14">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/download")} className="text-lg px-8 h-14">
              <Download className="mr-2 h-5 w-5" />
              Download App
            </Button>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            ✓ Free forever plan available  •  ✓ No credit card needed  •  ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-6xl mx-auto text-center">
          <TermsDialog />
        </div>
      </footer>
    </div>
  );
};

export default Index;
