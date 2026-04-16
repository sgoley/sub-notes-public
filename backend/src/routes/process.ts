import { getPB } from "../lib/pocketbase.ts";
import {
  extractVideoId,
  extractPlaylistId,
  fetchPlaylistVideos,
  fetchVideoDetails,
  type PlaylistVideoItem,
} from "../lib/youtube.ts";
import { fetchArticleContent, extractArticleId } from "../lib/substack.ts";

function detectContentType(url: string): "video" | "playlist" | "article" | null {
  if (extractPlaylistId(url)) return "playlist";
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "video";
  if (lower.includes("/p/") || lower.includes("/home/post/p-")) return "article";
  return null;
}

export async function handleProcess(req: Request): Promise<Response> {
  if (req.method !== "POST") return error("Method not allowed", 405);

  const { contentUrl, summaryStyle = "balanced" } = await req.json();
  if (!contentUrl) return error("contentUrl is required", 400);

  const contentType = detectContentType(contentUrl);
  if (!contentType) return error("Unsupported URL format. Provide a YouTube or Substack URL.", 400);

  const pb = await getPB();

  try {
    let summaryRecord: Record<string, unknown>;

    if (contentType === "video") {
      summaryRecord = await createVideoRecord(contentUrl, summaryStyle, pb);
    } else if (contentType === "playlist") {
      const playlistResult = await createPlaylistRecords(contentUrl, summaryStyle, pb);
      for (const record of playlistResult.records) {
        triggerGeneration(record.id as string).catch((err) =>
          console.error("[process] generation error:", err)
        );
      }

      return json(
        {
          content_type: "playlist",
          playlist_id: playlistResult.playlistId,
          total_videos: playlistResult.totalVideos,
          queued_videos: playlistResult.records.length,
          records: playlistResult.records.map((r) => ({
            id: r.id,
            content_id: r.content_id,
            content_title: r.content_title,
            status: r.status,
          })),
        },
        201
      );
    } else {
      summaryRecord = await createArticleRecord(contentUrl, summaryStyle, pb);
    }

    // Trigger async generation (fire and forget)
    triggerGeneration(summaryRecord.id).catch((err) =>
      console.error("[process] generation error:", err)
    );

    return json(summaryRecord, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return error(msg, 400);
  }
}

async function createVideoRecord(contentUrl: string, summaryStyle: string, pb: Awaited<ReturnType<typeof getPB>>) {
  const videoId = extractVideoId(contentUrl);
  if (!videoId) throw new Error("Invalid YouTube video URL");

  return upsertVideoRecord(videoId, summaryStyle, pb);
}

async function createPlaylistRecords(
  contentUrl: string,
  summaryStyle: string,
  pb: Awaited<ReturnType<typeof getPB>>
) {
  const playlistId = extractPlaylistId(contentUrl);
  if (!playlistId) throw new Error("Invalid YouTube playlist URL");

  const playlistVideos = await fetchPlaylistVideos(playlistId);
  if (playlistVideos.length === 0) throw new Error("No videos found in playlist");

  const records: Record<string, unknown>[] = [];
  for (const video of playlistVideos) {
    try {
      const record = await upsertVideoRecord(video.videoId, summaryStyle, pb, video);
      records.push(record);
    } catch (err) {
      console.error(`[process] Failed to queue playlist video ${video.videoId}:`, err);
    }
  }

  if (records.length === 0) throw new Error("No valid videos found in playlist");

  return {
    playlistId,
    totalVideos: playlistVideos.length,
    records,
  };
}

async function upsertVideoRecord(
  videoId: string,
  summaryStyle: string,
  pb: Awaited<ReturnType<typeof getPB>>,
  playlistMeta?: PlaylistVideoItem
) {
  // Check for existing
  try {
    const existing = await pb
      .collection("content_summaries")
      .getFirstListItem(`content_id = "${videoId}" && content_type = "video"`);
    // Reset for reprocessing
    const updated = await pb.collection("content_summaries").update(existing.id, {
      status: "pending",
      summary_style: summaryStyle,
      error_message: null,
      content_title: playlistMeta?.title || existing.content_title,
      author: playlistMeta?.channelTitle || existing.author,
      thumbnail_url: playlistMeta?.thumbnailUrl || existing.thumbnail_url,
    });
    return updated;
  } catch {
    // Not found, create new
  }

  let videoTitle = playlistMeta?.title || null;
  let channelTitle = playlistMeta?.channelTitle || null;
  let thumbnailUrl = playlistMeta?.thumbnailUrl || null;

  if (!videoTitle || videoTitle === "Private video" || videoTitle === "Deleted video") {
    const videoData = await fetchVideoDetails(videoId);
    if (!videoData.items || videoData.items.length === 0) throw new Error("Video not found");

    const video = videoData.items[0];
    videoTitle = video.snippet.title;
    channelTitle = channelTitle || video.snippet.channelTitle || null;
    thumbnailUrl = thumbnailUrl || video.snippet.thumbnails?.default?.url || null;
  }

  return pb.collection("content_summaries").create({
    content_type: "video",
    content_id: videoId,
    content_title: videoTitle || `YouTube Video (${videoId})`,
    content_url: `https://www.youtube.com/watch?v=${videoId}`,
    author: channelTitle,
    thumbnail_url: thumbnailUrl,
    status: "pending",
    summary_style: summaryStyle,
  });
}

async function createArticleRecord(contentUrl: string, summaryStyle: string, pb: Awaited<ReturnType<typeof getPB>>) {
  const contentId = extractArticleId(contentUrl);
  const normalizedUrl = contentUrl.trim().replace(/\/$/, "");

  // Check for existing
  try {
    const existing = await pb
      .collection("content_summaries")
      .getFirstListItem(`content_id = "${contentId}" && content_type = "article"`);
    const updated = await pb.collection("content_summaries").update(existing.id, {
      status: "pending",
      summary_style: summaryStyle,
      error_message: null,
    });
    return updated;
  } catch {
    // Not found, create new
  }

  const article = await fetchArticleContent(normalizedUrl);
  if (!article.title) throw new Error("Could not extract article title");
  if (!article.content) throw new Error("Could not extract article content");

  return pb.collection("content_summaries").create({
    content_type: "article",
    content_id: contentId,
    content_title: article.title,
    content_url: normalizedUrl,
    author: article.author,
    thumbnail_url: article.image || null,
    published_at: article.publishDate || null,
    status: "pending",
    summary_style: summaryStyle,
    transcript: article.content, // store article HTML as transcript
  });
}

async function triggerGeneration(summaryId: string) {
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3333";
  await fetch(`${BACKEND_URL}/api/generate-summary/${summaryId}`, {
    method: "POST",
  });
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
