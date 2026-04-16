import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Crown, TrendingUp } from "lucide-react";

interface TierInfo {
  tier_level: number;
  tier_name: string;
  max_subscriptions: number;
  price_monthly: number;
  status: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

interface UsageInfo {
  current_count: number;
  max_subscriptions: number;
  tier_level: number;
  tier_name: string;
  can_add_more: boolean;
}

export const SubscriptionTierBadge = () => {
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTierInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get tier info
      const { data: tier, error: tierError } = await supabase
        .from("subscription_tiers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (tierError) {
        console.error("Error fetching tier:", tierError);
        return;
      }

      setTierInfo(tier);

      // Get usage info via RPC function
      const { data: usage, error: usageError } = await supabase
        .rpc("get_subscription_usage", { p_user_id: user.id })
        .single();

      if (usageError) {
        console.error("Error fetching usage:", usageError);
      } else {
        setUsageInfo(usage);
      }
    } catch (error) {
      console.error("Error fetching tier info:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTierInfo();

    // Subscribe to tier changes
    const channel = supabase
      .channel("tier-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscription_tiers",
        },
        () => {
          fetchTierInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpgradeClick = async () => {
    if (!tierInfo) return;
    const nextTier = tierInfo.tier_level === 0 ? 1 : tierInfo.tier_level + 1;

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { tier_level: nextTier },
    });

    if (error || !data?.url) {
      toast({
        title: "Could not start checkout",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
      return;
    }

    window.location.href = data.url;
  };

  if (loading || !tierInfo || !usageInfo) {
    return null;
  }

  const usagePercentage = (usageInfo.current_count / usageInfo.max_subscriptions) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  const tierEmoji = {
    0: "🔍",
    1: "🔥",
    2: "💰",
    3: "🎯",
    4: "💪",
    5: "⚡",
  }[tierInfo.tier_level] || "📦";

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{tierEmoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{tierInfo.tier_name}</h3>
                  {tierInfo.tier_level > 0 && (
                    <Badge variant="secondary">
                      ${(tierInfo.price_monthly / 100).toFixed(0)}/mo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  <span
                    className={
                      isAtLimit
                        ? "text-red-600 font-semibold"
                        : isNearLimit
                        ? "text-yellow-600 font-semibold"
                        : ""
                    }
                  >
                    {usageInfo.current_count}
                  </span>
                  {" / "}
                  {tierInfo.max_subscriptions === 999999
                    ? "∞"
                    : usageInfo.max_subscriptions}
                  {" subscriptions"}
                  {tierInfo.cancel_at_period_end && (
                    <Badge variant="outline" className="ml-2">
                      Cancels at period end
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          </div>

          {tierInfo.tier_level < 5 && (
            <Button
              onClick={handleUpgradeClick}
              variant={isAtLimit ? "default" : "outline"}
              size="sm"
            >
              {isAtLimit ? (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Upgrade
                </>
              )}
            </Button>
          )}
        </div>

        {isAtLimit && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-md border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              You've reached your subscription limit. Upgrade your plan to add more channels!
            </p>
          </div>
        )}

        {tierInfo.tier_level === 0 && tierInfo.status === "active" && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Trial tier - auto-cancels after 3 months. Upgrade anytime to keep your subscriptions active!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
