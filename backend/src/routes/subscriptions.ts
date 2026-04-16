import { getPB } from "../lib/pocketbase.ts";
import {
  extractChannelIdentifier,
  fetchChannelDetails,
} from "../lib/youtube.ts";
import { fetchSubstackFeed } from "../lib/substack.ts";

export async function handleSubscriptions(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pb = await getPB();

  // GET /api/subscriptions
  if (req.method === "GET") {
    const records = await pb.collection("subscriptions").getFullList({
      sort: "-created",
    });
    return json(records);
  }

  // POST /api/subscriptions
  if (req.method === "POST") {
    const body = await req.json();
    const { sourceUrl, sourceType = "youtube" } = body;

    if (!sourceUrl) return error("sourceUrl is required", 400);

    try {
      let data: Record<string, unknown>;

      if (sourceType === "youtube") {
        data = await createYouTubeSubscription(sourceUrl);
      } else if (sourceType === "substack") {
        data = await createSubstackSubscription(sourceUrl);
      } else {
        return error(`Unsupported source type: ${sourceType}`, 400);
      }

      // Check for duplicate
      try {
        const existing = await pb
          .collection("subscriptions")
          .getFirstListItem(`source_id = "${data.source_id}"`);
        return json(existing, 200);
      } catch {
        // Not found, create new
      }

      const record = await pb.collection("subscriptions").create(data);
      return json(record, 201);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      return error(msg, 400);
    }
  }

  // DELETE /api/subscriptions/:id
  const idMatch = url.pathname.match(/\/api\/subscriptions\/([^/]+)$/);
  if (req.method === "DELETE" && idMatch) {
    const id = idMatch[1];
    await pb.collection("subscriptions").delete(id);
    return json({ success: true });
  }

  // PATCH /api/subscriptions/:id (toggle enabled)
  if (req.method === "PATCH" && idMatch) {
    const id = idMatch[1];
    const body = await req.json();
    const record = await pb.collection("subscriptions").update(id, body);
    return json(record);
  }

  return error("Not found", 404);
}

async function createYouTubeSubscription(sourceUrl: string) {
  const identifier = extractChannelIdentifier(sourceUrl);
  if (!identifier) throw new Error("Invalid YouTube channel URL");

  const channelData = await fetchChannelDetails(identifier);
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error("Channel not found");
  }

  const channel = channelData.items[0];
  return {
    source_type: "youtube",
    source_id: channel.id,
    source_title: channel.snippet.title,
    source_url: `https://youtube.com/channel/${channel.id}`,
    thumbnail_url: channel.snippet.thumbnails?.default?.url || null,
    enabled: true,
    metadata: {
      description: channel.snippet.description,
      subscriber_count: channel.statistics?.subscriberCount,
      video_count: channel.statistics?.videoCount,
    },
  };
}

async function createSubstackSubscription(sourceUrl: string) {
  let normalizedUrl = sourceUrl.trim().toLowerCase();
  if (!normalizedUrl.startsWith("http")) normalizedUrl = `https://${normalizedUrl}`;
  normalizedUrl = normalizedUrl.replace(/\/$/, "");

  const urlObj = new URL(normalizedUrl);
  const hostname = urlObj.hostname;
  const isSubstackDomain = hostname.endsWith(".substack.com");
  const publicationSlug = isSubstackDomain ? hostname.split(".")[0] : hostname;

  const feedUrl = `${normalizedUrl}/feed`;
  const feed = await fetchSubstackFeed(feedUrl);

  if (!feed.title) throw new Error("Unable to parse Substack publication details");

  return {
    source_type: "substack",
    source_id: publicationSlug,
    source_title: feed.title,
    source_url: normalizedUrl,
    thumbnail_url: feed.image || null,
    enabled: true,
    metadata: {
      description: feed.description,
      feed_url: feedUrl,
      is_custom_domain: !isSubstackDomain,
    },
  };
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
