import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { deleteSubscription, updateSubscription } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AddSubscriptionDialog } from "@/components/AddSubscriptionDialog";
import type { Subscription } from "@/types/database";

interface SubscriptionsListProps {
  onSuccess?: () => void;
  refreshTrigger?: number;
}

interface SubscriptionWithCounts extends Subscription {
  summaryCount?: number;
}

export const SubscriptionsList = ({ onSuccess, refreshTrigger }: SubscriptionsListProps = {}) => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const records = await pb.collection("subscriptions").getFullList({ sort: "-created" });
      const subsWithCounts = await Promise.all(
        records.map(async (sub) => {
          const result = await pb.collection("content_summaries").getList(1, 1, {
            filter: `subscription_id = "${sub.id}"`,
            fields: "id",
          });
          return { ...(sub as unknown as Subscription), summaryCount: result.totalItems };
        })
      );
      setSubscriptions(subsWithCounts);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();

    // Subscribe to real-time changes
    let unsubscribe: (() => void) | null = null;
    pb.collection("subscriptions").subscribe("*", () => {
      fetchSubscriptions();
    }).then((unsub) => { unsubscribe = unsub; });

    return () => { unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) fetchSubscriptions();
  }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription(id);
      toast({ title: "Subscription deleted" });
      fetchSubscriptions();
    } catch (err: unknown) {
      toast({
        title: "Error deleting subscription",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleToggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      await updateSubscription(id, { enabled: !currentEnabled });
      toast({
        title: currentEnabled ? "Subscription disabled" : "Subscription enabled",
      });
      fetchSubscriptions();
    } catch (err: unknown) {
      toast({
        title: "Error updating subscription",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = () => {
    fetchSubscriptions();
    onSuccess?.();
  };

  if (loading) return <p className="text-muted-foreground">Loading subscriptions...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Channel Subscriptions</h2>
        <AddSubscriptionDialog onSuccess={handleSuccess} />
      </div>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No subscriptions yet. Add your first YouTube channel!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((sub) => (
            <Card key={sub.id} className={!sub.enabled ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">{sub.source_title}</CardTitle>
                  {!sub.enabled && (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(sub.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {sub.thumbnail_url && (
                  <img
                    src={sub.thumbnail_url}
                    alt={sub.source_title}
                    className="w-full h-32 object-cover rounded-md mb-3"
                  />
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {sub.source_type === "youtube" ? "Videos" : "Posts"} processed:
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {sub.summaryCount || 0}
                    </Badge>
                  </div>
                  {sub.last_checked_at && (
                    <p className="text-xs text-muted-foreground">
                      Last checked: {new Date(sub.last_checked_at).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {sub.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch
                        checked={sub.enabled}
                        onCheckedChange={() => handleToggleEnabled(sub.id, sub.enabled)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
