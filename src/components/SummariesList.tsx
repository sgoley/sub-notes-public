import { useCallback, useEffect, useState, useRef } from "react";
import { pb } from "@/lib/pocketbase";
import { syncObsidian } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { SummaryViewDialog } from "@/components/SummaryViewDialog";
import { Trash2, ExternalLink, Download, RefreshCw, RotateCw, LayoutGrid, List, CheckSquare, Square, MoreVertical } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

interface ContentTag {
  tag_name: string;
  tag_slug: string;
  tag_color: string;
  confidence: number;
}

interface Highlight {
  icon: string;
  text: string;
}

interface SummariesListProps {
  channelFilter?: string | null;
  onSuccess?: () => void;
  refreshTrigger?: number;
}

interface SyncStatus {
  [key: string]: {
    synced: boolean;
    synced_at: string;
    file_id?: string;
    path?: string;
  };
}

interface ContentSummary {
  id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  content_url: string;
  author: string | null;
  thumbnail_url: string | null;
  status: string;
  processing_type: string;
  summary_markdown: string | null;
  highlights: Highlight[] | string | null;
  error_message?: string | null;
  created_at: string;
  tags?: ContentTag[];
  sync_status?: SyncStatus;
}

export const SummariesList = ({ channelFilter, onSuccess, refreshTrigger }: SummariesListProps) => {
  const [summaries, setSummaries] = useState<ContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    const saved = localStorage.getItem("summaries-view-mode");
    return (saved === "list" || saved === "card") ? saved : "card";
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selectedSummaries, setSelectedSummaries] = useState<Set<string>>(new Set());
  const [reprocessing, setReprocessing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewingSummaryId, setViewingSummaryId] = useState<string | null>(null);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("summaries-unread");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const prevStatusesRef = useRef<Map<string, string> | null>(null);

  const fetchSummaries = useCallback(async (reset = true, silent = false) => {
    if (reset) {
      if (!silent) setLoading(true);
      setPage(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const pageSize = 20;
    const pageNum = reset ? 1 : page + 2; // PocketBase pages are 1-indexed

    const filter = channelFilter ? `author = "${channelFilter}"` : "";

    try {
      const result = await pb.collection("content_summaries").getList(pageNum, pageSize, {
        sort: "-created_at",
        filter,
      });

      const items = result.items as unknown as ContentSummary[];
      const hasMoreItems = result.totalPages > pageNum;
      setHasMore(hasMoreItems);

      if (!silent) {
        console.log(`[summaries] fetched page ${pageNum}: ${items.length} items (total pages: ${result.totalPages})`);
        const statuses = items.reduce<Record<string, number>>((acc, s) => {
          acc[s.status] = (acc[s.status] ?? 0) + 1;
          return acc;
        }, {});
        if (Object.keys(statuses).length > 0) console.log("[summaries] status breakdown:", statuses);
      }

      if (reset) {
        setSummaries(items);
      } else {
        setSummaries(prev => [...prev, ...items]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes("Something went wrong") ||
          error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch") ||
          (error as { status?: number }).status === 0);
      if (isConnectionError) {
        console.warn("[summaries] connection error — PocketBase unreachable (CORS/network). Will retry on next poll.", error);
      } else {
        console.error("[summaries] fetch error:", error);
      }
      if (reset) setSummaries([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [channelFilter, page]);

  useEffect(() => {
    fetchSummaries(true);
  }, [channelFilter]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchSummaries(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, fetchSummaries]);

  // Passive refresh when refreshTrigger changes (without remounting)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      fetchSummaries(true, true); // silent — avoid flash
    }
  }, [refreshTrigger]);

  // Auto-refresh when there are processing or pending summaries
  useEffect(() => {
    const hasProcessing = summaries.some(
      (s) => s.status === "processing" || s.status === "pending"
    );

    if (!hasProcessing) return;

    // Poll every 5 seconds when there are items being processed
    const interval = setInterval(() => {
      fetchSummaries(true, true); // silent — no loading flash
    }, 5000);

    return () => clearInterval(interval);
  }, [summaries]);

  // Detect processing → completed transitions and mark as unread
  useEffect(() => {
    if (prevStatusesRef.current === null) {
      // First load — record statuses but don't mark anything as unread
      prevStatusesRef.current = new Map(summaries.map(s => [s.id, s.status]));
      return;
    }
    const newlyCompleted: string[] = [];
    for (const summary of summaries) {
      const prev = prevStatusesRef.current.get(summary.id);
      if (summary.status !== prev) {
        console.log(`[summaries] status change: ${summary.id.slice(0, 8)}… "${prev ?? "new"}" → "${summary.status}" (${summary.content_title})`);
      }
      if (summary.status === "completed" && (prev === "processing" || prev === "pending")) {
        newlyCompleted.push(summary.id);
      }
    }
    prevStatusesRef.current = new Map(summaries.map(s => [s.id, s.status]));
    if (newlyCompleted.length > 0) {
      setUnreadIds(prev => {
        const next = new Set(prev);
        newlyCompleted.forEach(id => next.add(id));
        try { localStorage.setItem("summaries-unread", JSON.stringify([...next])); } catch {}
        return next;
      });
    }
  }, [summaries]);

  const markAsRead = (summaryId: string) => {
    setUnreadIds(prev => {
      if (!prev.has(summaryId)) return prev;
      const next = new Set(prev);
      next.delete(summaryId);
      try { localStorage.setItem("summaries-unread", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const markAsUnread = (summaryId: string) => {
    setUnreadIds(prev => {
      if (prev.has(summaryId)) return prev;
      const next = new Set(prev);
      next.add(summaryId);
      try { localStorage.setItem("summaries-unread", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleViewContent = (summary: ContentSummary) => {
    window.open(summary.content_url, '_blank');
  };

  const handleRemove = async (summaryId: string) => {
    console.log(`[summaries] deleting ${summaryId}`);
    // Optimistically remove from UI immediately
    setSummaries(prev => prev.filter(s => s.id !== summaryId));

    try {
      await pb.collection("content_summaries").delete(summaryId);
      console.log(`[summaries] deleted ${summaryId}`);
      toast({
        title: "Summary removed",
      });
    } catch (error) {
      console.error("[summaries] delete error:", error);
      // Restore by refetching
      fetchSummaries(true, true);
      toast({
        title: "Error",
        description: "Failed to remove summary",
        variant: "destructive",
      });
    }
  };

  const handleRetry = async (summary: ContentSummary) => {
    setRetryingId(summary.id);

    try {
      toast({
        title: "Retrying...",
        description: "Re-processing content. This may take a minute.",
      });

      console.log(`[summaries] retry generate-summary for ${summary.id} (${summary.content_title})`);
      const res = await fetch(`/api/generate-summary/${summary.id}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      console.log(`[summaries] retry triggered:`, data);

      toast({
        title: "Success!",
        description: "Content is being processed. Check back in a minute.",
      });
      fetchSummaries(true);
      onSuccess?.();
    } catch (error) {
      console.error('[summaries] retry error:', error);
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  const handleDownloadSummary = async (summary: ContentSummary) => {
    if (!summary.summary_markdown) {
      toast({
        title: "No summary available",
        description: "This summary hasn't been generated yet",
        variant: "destructive",
      });
      return;
    }

    setDownloadingId(summary.id);

    try {
      // Create blob and download
      const blob = new Blob([summary.summary_markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${createFileName(summary.content_title)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Summary downloaded",
      });
    } catch (error) {
      console.error("Error downloading summary:", error);
      toast({
        title: "Error",
        description: "Failed to download summary",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewModeChange = (value: string) => {
    if (value === "card" || value === "list") {
      setViewMode(value);
      localStorage.setItem("summaries-view-mode", value);
    }
  };

  const toggleSummarySelection = (summaryId: string) => {
    setSelectedSummaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(summaryId)) {
        newSet.delete(summaryId);
      } else {
        newSet.add(summaryId);
      }
      return newSet;
    });
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedSummaries(new Set());
    } else {
      setSelectionMode(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSummaries.size === summaries.filter(s => s.status === 'completed').length && summaries.some(s => s.status === 'completed')) {
      setSelectedSummaries(new Set());
    } else {
      const completedIds = summaries
        .filter(s => s.status === 'completed')
        .map(s => s.id);
      setSelectedSummaries(new Set(completedIds));
    }
  };

  const handleReprocessToStyle = async (_targetStyle: string) => {
    toast({
      title: "Not implemented",
      description: "Reprocessing summaries is not yet available.",
      variant: "destructive",
    });
    setReprocessing(false);
  };

  const handleSyncAllToStorage = async () => {
    setSyncing(true);

    try {
      const allCompleted = await pb.collection("content_summaries").getFullList({
        filter: 'status = "completed" && summary_markdown != ""',
        fields: "id",
      });
      const completedSummaries = allCompleted;

      if (completedSummaries.length === 0) {
        toast({
          title: "Nothing to sync",
          description: "No completed summaries found to sync.",
        });
        setSyncing(false);
        return;
      }

      let obsidianSuccess = 0;
      let obsidianFail = 0;

      for (const summary of completedSummaries) {
        try {
          await syncObsidian(summary.id);
          obsidianSuccess++;
        } catch (error) {
          obsidianFail++;
          console.error(`Error syncing to Obsidian ${summary.id}:`, error);
        }
      }

      if (obsidianFail === 0 && obsidianSuccess > 0) {
        toast({
          title: "Sync complete!",
          description: `Successfully synced ${obsidianSuccess} summaries to Obsidian`,
        });
      } else if (obsidianSuccess === 0) {
        toast({
          title: "Sync failed",
          description: "No summaries were synced. Check console for details.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sync completed with errors",
          description: `Synced ${obsidianSuccess} summaries. ${obsidianFail} failed. Check console for details.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error syncing to storage:", error);
      toast({
        title: "Sync failed",
        description: "An error occurred while syncing summaries.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Loading summaries...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Content Summaries</h2>
          {summaries.some((s) => s.status === "completed") && (
            <div className="flex items-center gap-2">
              {!selectionMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectionMode}
                  className="h-8"
                >
                  Select
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                    className="h-8"
                  >
                    {selectedSummaries.size === summaries.filter(s => s.status === 'completed').length && summaries.some(s => s.status === 'completed') ? (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    {selectedSummaries.size > 0 ? `${selectedSummaries.size} selected` : "Select All"}
                  </Button>
                  {selectedSummaries.size > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" disabled={reprocessing}>
                          <RotateCw className={`h-4 w-4 mr-2 ${reprocessing ? "animate-spin" : ""}`} />
                          {reprocessing ? "Reprocessing..." : "Reprocess to..."}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('balanced')}>
                          Balanced (Default)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('comprehensive')}>
                          Comprehensive
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('fact-check')}>
                          Fact Check
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('timestamp-bullets')}>
                          Timestamp Bullets
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('narrative')}>
                          Long-form Narrative
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleReprocessToStyle('study')}>
                          Study Guide
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectionMode}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
            <ToggleGroupItem value="card" aria-label="Card view" title="Card view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" title="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          {summaries.some((s) => s.status === "completed" && s.summary_markdown) && (
            <Button
              variant="outline"
              onClick={handleSyncAllToStorage}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync All to Storage"}
            </Button>
          )}
        </div>
      </div>

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No summaries yet. Process your first video!
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <div className="space-y-2">
          {summaries.map((summary) => (
            <Card
              key={summary.id}
              className={`hover:bg-muted/50 transition-colors ${summary.summary_markdown ? "cursor-pointer" : ""}`}
              onClick={() => {
                if (summary.summary_markdown) {
                  markAsRead(summary.id);
                  setViewingSummaryId(summary.id);
                }
              }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  {selectionMode && summary.status === 'completed' && (
                    <Checkbox
                      checked={selectedSummaries.has(summary.id)}
                      onCheckedChange={() => toggleSummarySelection(summary.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {unreadIds.has(summary.id) && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="New" />
                      )}
                      <h3 className="font-medium truncate">{summary.content_title}</h3>
                      {summary.status !== "completed" && (
                        <span
                          className={`shrink-0 text-sm ${
                            summary.status === "processing" || summary.status === "pending"
                              ? "animate-pulse"
                              : ""
                          }`}
                          title={summary.status === "failed" && summary.error_message ? summary.error_message : summary.status}
                        >
                          {summary.status === "processing" ? "⏳" :
                           summary.status === "pending" ? "⏳" :
                           summary.status === "failed" ? "❌" : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {summary.author && <span>{summary.author}</span>}
                      {summary.author && <span>•</span>}
                      <span>{formatDistanceToNow(new Date(summary.created_at), { addSuffix: true })}</span>
                      {summary.tags && summary.tags.length > 0 && <span>•</span>}
                      {summary.tags && summary.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {summary.tags.slice(0, 2).map((tag) => (
                            <Badge
                              key={tag.tag_slug}
                              variant="outline"
                              className="text-xs h-5"
                              style={{
                                borderColor: tag.tag_color,
                                color: tag.tag_color,
                              }}
                            >
                              {tag.tag_name}
                            </Badge>
                          ))}
                          {summary.tags.length > 2 && (
                            <span className="text-xs">+{summary.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!selectionMode && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewContent(summary)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Original
                          </DropdownMenuItem>
                          {summary.status === 'completed' && !unreadIds.has(summary.id) && (
                            <DropdownMenuItem onClick={() => markAsUnread(summary.id)}>
                              <span className="w-4 h-4 mr-2 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                              </span>
                              Mark as Unread
                            </DropdownMenuItem>
                          )}
                          {summary.summary_markdown && (
                            <DropdownMenuItem
                              onClick={() => handleDownloadSummary(summary)}
                              disabled={downloadingId === summary.id}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          {(summary.status === 'failed' || summary.status === 'pending' || summary.status === 'processing') && (
                            <DropdownMenuItem
                              onClick={() => handleRetry(summary)}
                              disabled={retryingId === summary.id}
                            >
                              <RotateCw className={`h-4 w-4 mr-2 ${retryingId === summary.id ? 'animate-spin' : ''}`} />
                              Retry
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemove(summary.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </CardContent>
              {summary.summary_markdown && (
                <SummaryViewDialog
                  open={viewingSummaryId === summary.id}
                  onOpenChange={(open) => { if (!open) setViewingSummaryId(null); }}
                  contentTitle={summary.content_title}
                  author={summary.author}
                  summaryMarkdown={summary.summary_markdown}
                />
              )}
            </Card>
          ))}
          {/* Load more trigger for list view */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loadingMore && (
                <p className="text-sm text-muted-foreground">Loading more summaries...</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary) => (
            <Card key={summary.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  {selectionMode && summary.status === 'completed' && (
                    <Checkbox
                      checked={selectedSummaries.has(summary.id)}
                      onCheckedChange={() => toggleSummarySelection(summary.id)}
                      className="shrink-0 mt-1"
                    />
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {unreadIds.has(summary.id) && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="New" />
                      )}
                      {summary.content_title}
                    </CardTitle>
                    <CardDescription>
                      {summary.author && <span>{summary.author}</span>}
                      {summary.author && <span> • </span>}
                      <span>{formatDistanceToNow(new Date(summary.created_at), { addSuffix: true })}</span>
                    </CardDescription>
                    {summary.tags && summary.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {summary.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.tag_slug}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: tag.tag_color,
                              color: tag.tag_color,
                            }}
                          >
                            {tag.tag_name}
                          </Badge>
                        ))}
                        {summary.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{summary.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {summary.status !== "completed" && (
                      <span
                        className={`text-sm ${
                          summary.status === "processing" || summary.status === "pending"
                            ? "animate-pulse"
                            : ""
                        }`}
                        title={summary.status === "failed" && summary.error_message ? summary.error_message : summary.status}
                      >
                        {summary.status === "processing" ? "⏳" :
                         summary.status === "pending" ? "⏳" :
                         summary.status === "failed" ? "❌" : ""}
                      </span>
                    )}
                    {!selectionMode && (
                      <>
                        {summary.summary_markdown && (
                        <SummaryViewDialog
                          contentTitle={summary.content_title}
                          author={summary.author}
                          summaryMarkdown={summary.summary_markdown}
                          onOpen={() => markAsRead(summary.id)}
                        />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="More actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewContent(summary)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Original
                          </DropdownMenuItem>
                          {summary.status === 'completed' && !unreadIds.has(summary.id) && (
                            <DropdownMenuItem onClick={() => markAsUnread(summary.id)}>
                              <span className="w-4 h-4 mr-2 flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                              </span>
                              Mark as Unread
                            </DropdownMenuItem>
                          )}
                          {summary.summary_markdown && (
                            <DropdownMenuItem
                              onClick={() => handleDownloadSummary(summary)}
                              disabled={downloadingId === summary.id}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                          )}
                          {(summary.status === 'failed' || summary.status === 'pending' || summary.status === 'processing') && (
                            <DropdownMenuItem
                              onClick={() => handleRetry(summary)}
                              disabled={retryingId === summary.id}
                            >
                              <RotateCw className={`h-4 w-4 mr-2 ${retryingId === summary.id ? 'animate-spin' : ''}`} />
                              Retry
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemove(summary.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {summary.thumbnail_url && (
                    <img
                      src={summary.thumbnail_url}
                      alt={summary.content_title}
                      className="w-40 h-24 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1">
                    {(Array.isArray(summary.highlights) && summary.highlights.length > 0) || summary.summary_markdown ? (
                      <div className="space-y-2">
                        {Array.isArray(summary.highlights) && summary.highlights.length > 0 ? (
                          <div className="space-y-1">
                            {summary.highlights.slice(0, 3).map((h, i) => (
                              <p key={i} className="text-sm text-muted-foreground leading-relaxed">{h.icon} {h.text}</p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {summary.summary_markdown?.substring(0, 300) + "..."}
                          </p>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => handleDownloadSummary(summary)}
                          disabled={downloadingId === summary.id}
                        >
                          Download full summary (markdown)
                        </Button>
                      </div>
                    ) : summary.status === "processing" ? (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="inline-block animate-pulse mr-2">●</span>
                          Generating AI summary...
                        </p>
                        <p className="text-xs text-muted-foreground">This usually takes 1-2 minutes</p>
                      </div>
                    ) : summary.status === "pending" ? (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="inline-block animate-pulse mr-2">●</span>
                          Fetching transcript and preparing content...
                        </p>
                        <p className="text-xs text-muted-foreground">This may take a minute</p>
                      </div>
                    ) : summary.status === "failed" ? (
                      <div className="space-y-1">
                        <p className="text-sm text-destructive">Processing failed</p>
                        {summary.error_message && (
                          <p className="text-xs text-muted-foreground">{summary.error_message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Click the retry button above to try again.</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Waiting to process...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Load more trigger for card view */}
          {hasMore && (
            <div ref={loadMoreRef} className="py-4 text-center">
              {loadingMore && (
                <p className="text-sm text-muted-foreground">Loading more summaries...</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function createFileName(rawTitle: string): string {
  const clean = rawTitle
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return clean || "sub-notes-transcript";
}
