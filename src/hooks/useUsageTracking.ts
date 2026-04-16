/**
 * React hooks for usage tracking and cost monitoring
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentMonthUsage {
  summaries_count: number;
  free_summaries_available: number;
  free_summaries_used: number;
  billable_summaries: number;
  base_fee_cents: number;
  usage_costs_cents: number;
  projected_total_cents: number;
  total_input_tokens: number;
  total_output_tokens: number;
}

export interface UsageEvent {
  id: string;
  event_type: string;
  total_cost_cents: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  content_summary_id?: string;
}

export interface DailyCost {
  date: string;
  summaries_count: number;
  total_tokens: number;
  total_cost_cents: number;
}

/**
 * Get current month usage and projected costs
 */
export function useCurrentMonthUsage() {
  return useQuery({
    queryKey: ["currentMonthUsage"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .rpc("get_current_month_usage", {
          p_user_id: user.id
        })
        .single();

      if (error) throw error;
      return data as CurrentMonthUsage;
    },
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get recent usage events
 */
export function useRecentUsageEvents(limit = 10) {
  return useQuery({
    queryKey: ["usageEvents", limit],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("usage_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as UsageEvent[];
    },
  });
}

/**
 * Get daily cost breakdown for last 30 days
 */
export function useDailyCosts() {
  return useQuery({
    queryKey: ["dailyCosts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .rpc("get_user_daily_costs", {
          p_user_id: user.id
        });

      if (error) throw error;
      return data as DailyCost[];
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

/**
 * Estimate cost for a summary based on expected token usage
 */
export function useEstimateSummaryCost(inputTokens: number, outputTokens: number) {
  return useQuery({
    queryKey: ["estimateCost", inputTokens, outputTokens],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .rpc("calculate_summary_cost_with_margin", {
          p_user_id: user.id,
          p_input_tokens: inputTokens,
          p_output_tokens: outputTokens
        })
        .single();

      if (error) throw error;
      return data;
    },
    enabled: inputTokens > 0 || outputTokens > 0,
  });
}

/**
 * Check if user can generate more summaries
 */
export function useCanGenerateSummary() {
  return useQuery({
    queryKey: ["canGenerateSummary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .rpc("can_generate_summary", {
          p_user_id: user.id
        })
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Format cents to dollars
 */
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Format large numbers (tokens)
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(2)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Calculate average cost per summary
 */
export function calculateAverageCost(totalCents: number, summaryCount: number): number {
  if (summaryCount === 0) return 0;
  return totalCents / summaryCount;
}
