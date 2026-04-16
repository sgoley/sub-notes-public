/**
 * Usage Dashboard Component
 * 
 * Displays current month usage, costs, and projections
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrentMonthUsage,
  useDailyCosts,
  formatCurrency,
  formatTokens,
  calculateAverageCost
} from "@/hooks/useUsageTracking";
import { TrendingUp, DollarSign, Zap, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function UsageDashboard() {
  const { data: usage, isLoading: usageLoading } = useCurrentMonthUsage();
  const { data: dailyCosts, isLoading: costsLoading } = useDailyCosts();

  if (usageLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) {
    return null;
  }

  const avgCostPerSummary = calculateAverageCost(
    usage.usage_costs_cents,
    usage.billable_summaries
  );

  const projectedMonthlyTotal = usage.projected_total_cents;
  const isHighUsage = usage.usage_costs_cents > usage.base_fee_cents;

  return (
    <div className="space-y-6">
      {/* High Usage Alert */}
      {isHighUsage && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your usage charges ({formatCurrency(usage.usage_costs_cents)}) exceed your base fee.
            Your projected bill this month is {formatCurrency(projectedMonthlyTotal)}.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Summaries Generated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Summaries Generated</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.summaries_count}</div>
            {usage.free_summaries_available > 0 && (
              <p className="text-xs text-muted-foreground">
                {usage.free_summaries_used} / {usage.free_summaries_available} free summaries used
              </p>
            )}
            {usage.billable_summaries > 0 && (
              <p className="text-xs text-muted-foreground">
                {usage.billable_summaries} billable @ {formatCurrency(avgCostPerSummary)} avg
              </p>
            )}
          </CardContent>
        </Card>

        {/* Usage Costs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Charges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(usage.usage_costs_cents)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTokens(usage.total_input_tokens + usage.total_output_tokens)} tokens
            </p>
          </CardContent>
        </Card>

        {/* Projected Bill */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(projectedMonthlyTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(usage.base_fee_cents)} base + {formatCurrency(usage.usage_costs_cents)} usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Token Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Token Usage</CardTitle>
          <CardDescription>Input and output tokens for this billing period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Input Tokens</span>
              <span className="text-sm text-muted-foreground">
                {formatTokens(usage.total_input_tokens)}
              </span>
            </div>
            <Progress 
              value={(usage.total_input_tokens / (usage.total_input_tokens + usage.total_output_tokens)) * 100} 
              className="h-2"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Output Tokens</span>
              <span className="text-sm text-muted-foreground">
                {formatTokens(usage.total_output_tokens)}
              </span>
            </div>
            <Progress 
              value={(usage.total_output_tokens / (usage.total_input_tokens + usage.total_output_tokens)) * 100} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      {!costsLoading && dailyCosts && dailyCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage Trend</CardTitle>
            <CardDescription>Summary generation over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: number, name: string) => {
                    if (name === 'total_cost_cents') {
                      return formatCurrency(value);
                    }
                    return value;
                  }}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="summaries_count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Summaries"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="total_cost_cents" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2}
                  name="Cost (cents)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
