import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UsageEvent {
  id: string;
  event_type: string;
  created_at: string;
  input_tokens: number;
  output_tokens: number;
  model_used: string;
  total_cost_cents: number;
  api_cost_cents: number;
  content_summary: {
    content_title: string;
    content_type: string;
    content_id: string;
  } | null;
}

type SortField = 'created_at' | 'tokens' | 'cost';
type SortOrder = 'asc' | 'desc';

export const DetailedTokenUsage = () => {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [availableMonths, setAvailableMonths] = useState<Date[]>([]);

  useEffect(() => {
    fetchAvailableMonths();
  }, []);

  useEffect(() => {
    fetchDetailedUsage();
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get distinct billing months
      const { data, error } = await supabase
        .from("usage_events")
        .select("billing_month")
        .eq("user_id", user.id)
        .eq("event_type", "summary_generated")
        .order("billing_month", { ascending: false });

      if (error) throw error;

      console.log('[DetailedTokenUsage] Raw billing months:', data);

      if (data && data.length > 0) {
        // Get unique months
        const uniqueMonths = Array.from(
          new Set(data.map((d: any) => d.billing_month))
        ).map((dateStr) => new Date(dateStr as string));

        console.log('[DetailedTokenUsage] Unique months:', uniqueMonths);
        console.log('[DetailedTokenUsage] Current selected month:', selectedMonth);

        setAvailableMonths(uniqueMonths);

        // Don't auto-change the month - let it stay on current month
        // User can navigate manually if needed
      }
    } catch (error) {
      console.error("Error fetching available months:", error);
    }
  };

  const fetchDetailedUsage = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Format the selected month as a date string for comparison
      const billingMonthStr = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');

      console.log('[DetailedTokenUsage] Fetching for billing month:', billingMonthStr);

      // Fetch usage events with related content summary info for selected month
      // Only fetch LLM-related events (summary_generated)
      const { data, error } = await supabase
        .from("usage_events")
        .select(`
          id,
          event_type,
          created_at,
          input_tokens,
          output_tokens,
          model_used,
          total_cost_cents,
          api_cost_cents,
          billing_month,
          content_summaries!content_summary_id (
            content_title,
            content_type,
            content_id
          )
        `)
        .eq("user_id", user.id)
        .eq("event_type", "summary_generated")
        .eq("billing_month", billingMonthStr)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[DetailedTokenUsage] Query error:', error);
        throw error;
      }

      console.log('[DetailedTokenUsage] Fetched events:', data?.length || 0);

      // Transform the data to match our interface
      const transformedData = (data || []).map((event: any) => ({
        id: event.id,
        event_type: event.event_type,
        created_at: event.created_at,
        input_tokens: event.input_tokens || 0,
        output_tokens: event.output_tokens || 0,
        model_used: event.model_used || 'unknown',
        total_cost_cents: event.total_cost_cents || 0,
        api_cost_cents: event.api_cost_cents || 0,
        content_summary: event.content_summaries,
      }));

      setEvents(transformedData);
    } catch (error) {
      console.error("Error fetching detailed usage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'tokens':
        const aTokens = a.input_tokens + a.output_tokens;
        const bTokens = b.input_tokens + b.output_tokens;
        comparison = aTokens - bTokens;
        break;
      case 'cost':
        comparison = a.total_cost_cents - b.total_cost_cents;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Define handler functions and computed values before any renders
  const handlePreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());
  const canGoNext = !isCurrentMonth;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading detailed usage...
        </CardContent>
      </Card>
    );
  }

  const renderEmptyState = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Token Usage</CardTitle>
            <CardDescription>
              Itemized list of all LLM API requests
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-[180px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={loading || !canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-8 text-center text-muted-foreground">
        No usage events for {format(selectedMonth, 'MMMM yyyy')}.
        {isCurrentMonth ? ' Process your first video to see detailed token usage!' : ' Try a different month.'}
      </CardContent>
    </Card>
  );

  if (events.length === 0) {
    return renderEmptyState();
  }

  const totalTokens = events.reduce((sum, e) => sum + e.input_tokens + e.output_tokens, 0);
  const totalCost = events.reduce((sum, e) => sum + e.total_cost_cents, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Token Usage</CardTitle>
            <CardDescription>
              Itemized list of all {events.length} LLM API request{events.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-[180px] justify-center">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                {format(selectedMonth, 'MMMM yyyy')}
              </span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              disabled={loading || !canGoNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Requests:</span>{' '}
            <span className="font-medium">{events.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Tokens:</span>{' '}
            <span className="font-medium">{(totalTokens / 1000).toFixed(1)}K</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Cost:</span>{' '}
            <span className="font-medium">${(totalCost / 100).toFixed(4)}</span>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 lg:px-3"
                    onClick={() => handleSort('created_at')}
                  >
                    Timestamp
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Content</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 lg:px-3"
                    onClick={() => handleSort('tokens')}
                  >
                    Tokens In/Out
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Model</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 lg:px-3"
                    onClick={() => handleSort('cost')}
                  >
                    Cost
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.map((event) => {
                const totalTokens = event.input_tokens + event.output_tokens;
                const contentTitle = event.content_summary?.content_title || 'Unknown';
                const contentType = event.content_summary?.content_type || 'unknown';

                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(event.created_at), 'MMM d, h:mm a')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="max-w-[300px] truncate">
                          {contentTitle}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {contentType}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-muted-foreground">In:</span>{' '}
                          {(event.input_tokens / 1000).toFixed(1)}K
                        </div>
                        <div>
                          <span className="text-muted-foreground">Out:</span>{' '}
                          {(event.output_tokens / 1000).toFixed(1)}K
                        </div>
                        <div className="font-semibold">
                          Total: {(totalTokens / 1000).toFixed(1)}K
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {event.model_used}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="text-muted-foreground">
                          API: ${(event.api_cost_cents / 100).toFixed(4)}
                        </div>
                        <div className="font-semibold">
                          ${(event.total_cost_cents / 100).toFixed(4)}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex items-start justify-between gap-4 text-xs text-muted-foreground">
          <p>
            💡 <strong>Tip:</strong> This table shows every summary generation request, including duplicates
            if you re-processed the same content. Click column headers to sort.
          </p>

          {availableMonths.length > 1 && (
            <div className="text-right">
              <p className="font-medium">
                Viewing {format(selectedMonth, 'MMMM yyyy')}
              </p>
              <p className="text-muted-foreground">
                {availableMonths.length} month{availableMonths.length !== 1 ? 's' : ''} with data
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
