import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowBigUp, Plus } from "lucide-react";

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  vote_count: number;
  user_has_voted?: boolean;
  created_at: string;
  updated_at: string;
}

interface UserTier {
  tier_level: number;
  tier_name: string;
  status: string;
}

export const FeatureRequestBoard = () => {
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<UserTier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");

  const categoryLabels: Record<string, string> = {
    ui_ux: "UI/UX",
    integrations: "Integrations",
    ai_features: "AI Features",
    performance: "Performance",
    mobile: "Mobile",
    api: "API",
    other: "Other",
  };

  const statusLabels: Record<string, string> = {
    open: "Open",
    under_review: "Under Review",
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Completed",
    declined: "Declined",
  };

  const statusColors: Record<string, string> = {
    open: "bg-blue-500",
    under_review: "bg-yellow-500",
    planned: "bg-purple-500",
    in_progress: "bg-orange-500",
    completed: "bg-green-500",
    declined: "bg-gray-500",
  };

  useEffect(() => {
    fetchUserTier();
    fetchFeatureRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("feature-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_requests",
        },
        () => {
          fetchFeatureRequests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_votes",
        },
        () => {
          fetchFeatureRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserTier = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("subscription_tiers")
      .select("tier_level, tier_name, status")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setUserTier(data);
    }
  };

  const fetchFeatureRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Use the helper function to get feature requests with vote info
    const { data, error } = await supabase.rpc("get_feature_requests_with_votes", {
      p_user_id: user.id,
    });

    if (error) {
      console.error("Error fetching feature requests:", error);
      toast({
        title: "Error",
        description: "Failed to load feature requests",
        variant: "destructive",
      });
    } else {
      setFeatureRequests(data || []);
    }

    setLoading(false);
  };

  const handleSubmitFeatureRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userTier || userTier.tier_level !== 5) {
      toast({
        title: "Upgrade Required",
        description: "Feature request creation is available for Tier 5 (I'm the Captain) users only. BYOK users can vote but cannot create requests.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-feature-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            description,
            category,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to submit feature request");
      }

      toast({
        title: "Success!",
        description: "Your feature request has been submitted.",
      });

      // Reset form and close dialog
      setTitle("");
      setDescription("");
      setCategory("other");
      setDialogOpen(false);
      fetchFeatureRequests();
    } catch (error: any) {
      console.error("Error submitting feature request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit feature request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (featureRequestId: string, action: 'upvote' | 'remove') => {
    if (!userTier || (userTier.tier_level < 4 && userTier.tier_level !== 99)) {
      toast({
        title: "Upgrade Required",
        description: "Feature voting is available for Tier 4 (Goggins), Tier 5 (I'm the Captain), and BYOK users.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote-feature-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            featureRequestId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to process vote");
      }

      toast({
        title: "Success",
        description: result.message,
      });

      fetchFeatureRequests();
    } catch (error: any) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process vote",
        variant: "destructive",
      });
    }
  };

  const canCreateRequests = userTier && userTier.tier_level === 5 && userTier.status === 'active';
  const canVote = userTier && (userTier.tier_level >= 4 || userTier.tier_level === 99) && userTier.status === 'active';

  if (loading) {
    return <p className="text-muted-foreground">Loading feature requests...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Feature Requests</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {canCreateRequests
              ? "Create new feature requests and vote on existing ones"
              : canVote
              ? "Vote on feature requests to help prioritize development"
              : "Upgrade to Tier 4 (Goggins) or BYOK to vote, or Tier 5 (I'm the Captain) to create requests"}
          </p>
        </div>

        {canCreateRequests && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Submit Feature Request</DialogTitle>
                <DialogDescription>
                  Share your ideas for improving Sub Notes. Other users can vote on your request.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeatureRequest} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the feature"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    minLength={5}
                    maxLength={200}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/200 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed explanation of the feature and why it would be valuable"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    minLength={20}
                    maxLength={2000}
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {featureRequests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No feature requests yet. {canCreateRequests && "Be the first to submit one!"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {featureRequests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={statusColors[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                      <Badge variant="outline">{categoryLabels[request.category]}</Badge>
                    </div>
                    <CardTitle className="text-lg">{request.title}</CardTitle>
                    <CardDescription className="mt-2 whitespace-pre-wrap">
                      {request.description}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col items-center gap-1 min-w-[60px]">
                    <Button
                      variant={request.user_has_voted ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        handleVote(request.id, request.user_has_voted ? 'remove' : 'upvote')
                      }
                      disabled={!canVote || request.status === 'completed' || request.status === 'declined'}
                      className="w-full"
                    >
                      <ArrowBigUp
                        className={`h-4 w-4 ${request.user_has_voted ? 'fill-current' : ''}`}
                      />
                    </Button>
                    <span className="text-sm font-semibold">{request.vote_count}</span>
                    <span className="text-xs text-muted-foreground">votes</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
