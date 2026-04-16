import { getPB } from "../lib/pocketbase.ts";
import { fetchTranscript } from "../lib/transcript.ts";
import { generateContent, buildSummaryPrompt, buildHighlightsPrompt } from "../lib/gemini.ts";
import { syncToObsidian, isVaultMounted, type ObsidianSyncMeta } from "../lib/obsidian.ts";

export async function handleGenerateSummary(req: Request, summaryId: string): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);

  const pb = await getPB();

  // Mark as processing
  await pb.collection("content_summaries").update(summaryId, { status: "processing" });

  // Run async so we can return immediately
  processSummary(summaryId, pb).catch(async (err) => {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[generateSummary] Error for ${summaryId}:`, msg);
    try {
      await pb.collection("content_summaries").update(summaryId, {
        status: "failed",
        error_message: msg,
      });
    } catch (e) {
      console.error("[generateSummary] Failed to update error status:", e);
    }
  });

  return new Response(JSON.stringify({ status: "processing", id: summaryId }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function processSummary(summaryId: string, pb: Awaited<ReturnType<typeof getPB>>) {
  const record = await pb.collection("content_summaries").getOne(summaryId);

  // Fetch transcript if not stored yet
  let contentText = record.transcript as string | null;

  if (!contentText || contentText.trim() === "") {
    if (record.content_type === "video") {
      console.log(`[generateSummary] Fetching transcript for video: ${record.content_id}`);
      contentText = await fetchTranscript(record.content_id as string);
      // Cache transcript
      await pb.collection("content_summaries").update(summaryId, { transcript: contentText });
    } else {
      throw new Error("No transcript/content available for this record");
    }
  }

  const summaryStyle = (record.summary_style as string) || "balanced";
  console.log(`[generateSummary] Generating ${summaryStyle} summary for ${summaryId}`);

  // Generate summary
  const prompt = buildSummaryPrompt(summaryStyle, contentText);
  const { text: summaryMarkdown, usage: summaryUsage } = await generateContent(prompt, 65536);

  // Generate highlights
  let highlights: string | null = null;
  let highlightsUsage = { promptTokens: 0, outputTokens: 0, totalTokens: 0 };
  try {
    const highlightsPrompt = buildHighlightsPrompt(summaryMarkdown);
    const { text: highlightsRaw, usage } = await generateContent(highlightsPrompt, 1024);
    // Validate JSON
    JSON.parse(highlightsRaw);
    highlights = highlightsRaw;
    highlightsUsage = usage;
  } catch (err) {
    console.warn("[generateSummary] Highlights generation failed:", err);
  }

  const tokenUsage = {
    model: "gemini-2.5-flash-preview-04-17",
    summary_prompt_tokens: summaryUsage.promptTokens,
    summary_output_tokens: summaryUsage.outputTokens,
    highlights_prompt_tokens: highlightsUsage.promptTokens,
    highlights_output_tokens: highlightsUsage.outputTokens,
    total_tokens: summaryUsage.totalTokens + highlightsUsage.totalTokens,
    generated_at: new Date().toISOString(),
  };

  // Update record with completed summary
  const existingMetadata = (record.metadata as Record<string, unknown>) || {};
  const update: Record<string, unknown> = {
    status: "completed",
    summary_markdown: summaryMarkdown,
    error_message: null,
    metadata: { ...existingMetadata, token_usage: tokenUsage },
  };
  if (highlights) update.highlights = highlights;

  // Auto-sync to Obsidian if vault is mounted and setting enabled
  let syncStatus = (record.sync_status as Record<string, unknown>) || {};
  if (isVaultMounted()) {
    try {
      const pbSettings = await pb
        .collection("settings")
        .getFirstListItem(`key = "obsidian_auto_save"`);
      const autoSave = (pbSettings?.value as boolean) ?? false;

      if (autoSave) {
        const meta: ObsidianSyncMeta = {
          title: record.content_title as string,
          author: record.author as string | null,
          source_url: record.content_url as string | null,
          content_type: record.content_type as string | null,
          published_at: record.published_at as string | null,
          summary_created_at: new Date().toISOString(),
        };
        const filePath = syncToObsidian(
          record.author as string | null,
          record.content_title as string,
          summaryMarkdown,
          meta
        );
        syncStatus = {
          ...syncStatus,
          obsidian: {
            synced: true,
            synced_at: new Date().toISOString(),
            path: filePath,
          },
        };
        console.log(`[generateSummary] Auto-synced to Obsidian: ${filePath}`);
      }
    } catch {
      // Settings not found or disabled — skip
    }
  }

  update.sync_status = syncStatus;
  await pb.collection("content_summaries").update(summaryId, update);
  console.log(`[generateSummary] Completed: ${summaryId}`);
}

function error(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
