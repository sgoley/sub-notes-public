import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, Zap, DollarSign } from "lucide-react";

interface MonthlyUsage {
  summaries_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_cost_cents: number;
  cached_transcripts_count: number;
  api_calls_count: number;
}

interface TierInfo {
  tier_level: number;
  tier_name: string;
  max_summaries_per_month: number;
}

export const UsageStats = () => {
  const [monthlyUsage, setMonthlyUsage] = useState<MonthlyUsage | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get monthly usage
      const { data: usage, error: usageError } = await supabase
        .rpc("get_user_monthly_token_usage", { p_user_id: user.id })
        .single();

      if (usageError) throw usageError;
      setMonthlyUsage(usage);

      // Get tier info
      const { data: tier, error: tierError } = await supabase
        .from("subscription_tiers")
        .select("tier_level, tier_name, max_summaries_per_month")
        .eq("user_id", user.id)
        .single();

      if (tierError) throw tierError;
      setTierInfo(tier);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading usage stats...
        </CardContent>
      </Card>
    );
  }

  if (!monthlyUsage || !tierInfo) {
    return null;
  }

  const isByokTier = tierInfo.tier_level === 99;
  const costDollars = monthlyUsage.total_cost_cents / 100;
  const summaryLimit = tierInfo.max_summaries_per_month;
  const hasLimit = summaryLimit !== -1;
  const usagePercent = hasLimit ? (monthlyUsage.summaries_count / summaryLimit) * 100 : 0;
  const avgCostPerSummary = monthlyUsage.summaries_count > 0
    ? monthlyUsage.total_cost_cents / monthlyUsage.summaries_count
    : 0;

  return (
    <div className="space-y-4">
      {isByokTier && costDollars > 1 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>BYOK Usage Alert:</strong> You've accrued ${costDollars.toFixed(2)} in API costs this month.
            This will be billed to your Google Cloud account.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Summaries This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyUsage.summaries_count}</div>
            {hasLimit && (
              <p className="text-xs text-muted-foreground">
                {summaryLimit - monthlyUsage.summaries_count} remaining
                <span className="ml-2">
                  ({usagePercent.toFixed(0)}% used)
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tokens
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(monthlyUsage.total_tokens / 1000).toFixed(1)}K
            </div>
            <p className="text-xs text-muted-foreground">
              {(monthlyUsage.total_input_tokens / 1000).toFixed(1)}K in, {(monthlyUsage.total_output_tokens / 1000).toFixed(1)}K out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isByokTier ? "Your Cost" : "Cost Savings"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costDollars.toFixed(3)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isByokTier ? "Billed to your GCP account" : "Covered by your plan"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cache Efficiency
            </CardTitle>
            <Badge variant="secondary" className="h-fit">
              {monthlyUsage.summaries_count > 0
                ? `${((monthlyUsage.cached_transcripts_count / monthlyUsage.summaries_count) * 100).toFixed(0)}%`
                : "0%"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthlyUsage.cached_transcripts_count}
            </div>
            <p className="text-xs text-muted-foreground">
              Transcripts from cache (free)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown</CardTitle>
          <CardDescription>
            Average cost per summary this month (Gemini 2.5 Flash)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average per summary:</span>
              <span className="font-medium">${(avgCostPerSummary / 100).toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input pricing:</span>
              <span className="font-medium">$0.15 per 1M tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output pricing:</span>
              <span className="font-medium">$1.25 per 1M tokens</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Estimated yearly (at current rate):</span>
              <span className="font-medium">${(costDollars * 12).toFixed(2)}</span>
            </div>
            {isByokTier && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  💡 <strong>Tip:</strong> Using cached transcripts saves processing time.
                  Processing the same video again uses cached transcripts!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
