import { getPB } from "../lib/pocketbase.ts";
import { syncToObsidian, isVaultMounted, type ObsidianSyncMeta } from "../lib/obsidian.ts";

export async function handleObsidianSync(req: Request, summaryId: string): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);

  if (!isVaultMounted()) {
    return error("Obsidian vault not mounted. Set OBSIDIAN_VAULT_PATH in .env and restart.", 503);
  }

  const pb = await getPB();
  const record = await pb.collection("content_summaries").getOne(summaryId);

  if (!record.summary_markdown) {
    return error("Summary not yet generated", 400);
  }

  try {
    const meta: ObsidianSyncMeta = {
      title: record.content_title as string,
      author: record.author as string | null,
      source_url: record.content_url as string | null,
      content_type: record.content_type as string | null,
      published_at: record.published_at as string | null,
      summary_created_at: record.created_at as string | null,
    };

    const filePath = syncToObsidian(
      record.author as string | null,
      record.content_title as string,
      record.summary_markdown as string,
      meta
    );

    const syncStatus = {
      ...((record.sync_status as Record<string, unknown>) || {}),
      obsidian: {
        synced: true,
        synced_at: new Date().toISOString(),
        path: filePath,
      },
    };

    await pb.collection("content_summaries").update(summaryId, { sync_status: syncStatus });

    return json({ success: true, path: filePath });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return error(msg, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
