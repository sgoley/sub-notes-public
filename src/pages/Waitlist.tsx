import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CheckCircle2, MonitorPlay } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Store email in dedicated waitlist table
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email,
          source: 'web',
          metadata: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
          }
        });

      if (error) {
        // Check if it's a duplicate email error
        if (error.code === '23505') {
          // Duplicate email - still show success
          console.log('Email already on waitlist:', email);
        } else {
          throw error;
        }
      }

      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when SubNotes launches.",
      });
    } catch (error) {
      console.error('Waitlist submission error:', error);
      toast({
        title: "Submission failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 flex items-center justify-center">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 max-w-2xl">
        {!submitted ? (
          <Card className="shadow-2xl">
            <CardHeader className="text-center space-y-4 pb-8">
              <div className="flex items-center justify-center gap-2 text-primary">
                <MonitorPlay className="h-10 w-10" />
                <h1 className="text-4xl font-bold">SubNotes</h1>
              </div>
              <CardTitle className="text-2xl">
                Coming Soon
              </CardTitle>
              <CardDescription className="text-lg">
                AI-powered content summaries delivered to your Obsidian vault.
                <br />
                Never miss the key insights from your favorite creators.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Join the Waitlist"}
                </Button>
              </form>

              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-3 text-center">What to expect:</h3>
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">AI Summaries</p>
                      <p className="text-sm text-muted-foreground">
                        Get concise, well-formatted summaries powered by Google Gemini
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Obsidian Integration</p>
                      <p className="text-sm text-muted-foreground">
                        Auto-save summaries to your vault with YAML frontmatter
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Channel Subscriptions</p>
                      <p className="text-sm text-muted-foreground">
                        Subscribe to channels and get automatic summaries
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-4">
                We'll only email you once when we launch. No spam, promise.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl">
            <CardContent className="py-16 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle2 className="h-16 w-16 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">You're on the list!</h2>
                <p className="text-muted-foreground text-lg">
                  We'll notify you at <strong>{email}</strong> when SubNotes launches.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                In the meantime, follow us for updates and sneak peeks.
              </p>
            </CardContent>
          </Card>
        )}

        <footer className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2025 SubNotes. Built with Electron, React, and Supabase.</p>
        </footer>
      </div>
    </div>
  );
}
