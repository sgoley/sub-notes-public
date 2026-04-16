const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

type ChannelIdentifier =
  | { type: "id"; value: string }
  | { type: "handle"; value: string }
  | { type: "username"; value: string }
  | { type: "custom"; value: string };

export function extractChannelIdentifier(rawUrl: string): ChannelIdentifier | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();

  if (/^UC[0-9A-Za-z_-]{21}[AQgw]$/.test(url)) return { type: "id", value: url };

  const handleMatch = url.match(/youtube\.com\/@([^/?]+)/i);
  if (handleMatch) return { type: "handle", value: `@${handleMatch[1]}` };

  const channelIdMatch = url.match(/youtube\.com\/channel\/([^/?]+)/i);
  if (channelIdMatch) return { type: "id", value: channelIdMatch[1] };

  const userMatch = url.match(/youtube\.com\/user\/([^/?]+)/i);
  if (userMatch) return { type: "username", value: userMatch[1] };

  const customMatch = url.match(/youtube\.com\/c\/([^/?]+)/i);
  if (customMatch) return { type: "custom", value: customMatch[1] };

  return null;
}

export async function fetchChannelDetails(identifier: ChannelIdentifier) {
  const key = YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not configured");

  switch (identifier.type) {
    case "id":
      return fetchJson(`${BASE_URL}/channels?part=snippet,statistics&id=${enc(identifier.value)}&key=${key}`);
    case "handle":
      return fetchJson(`${BASE_URL}/channels?part=snippet,statistics&forHandle=${enc(identifier.value)}&key=${key}`);
    case "username":
      return fetchJson(`${BASE_URL}/channels?part=snippet,statistics&forUsername=${enc(identifier.value)}&key=${key}`);
    case "custom": {
      const search = await fetchJson(`${BASE_URL}/search?part=snippet&type=channel&maxResults=1&q=${enc(identifier.value)}&key=${key}`);
      const channelId = search?.items?.[0]?.id?.channelId;
      if (!channelId) throw new Error("Channel not found");
      return fetchJson(`${BASE_URL}/channels?part=snippet,statistics&id=${enc(channelId)}&key=${key}`);
    }
  }
}

export async function fetchVideoDetails(videoId: string) {
  const key = YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not configured");
  return fetchJson(`${BASE_URL}/videos?part=snippet&id=${enc(videoId)}&key=${key}`);
}

export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch[?]v=|youtu\.be\/)([^&?/]+)/);
  return match ? match[1] : null;
}

export function extractPlaylistId(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const trimmed = rawUrl.trim();

  try {
    const normalized = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(normalized);
    const list = url.searchParams.get("list");
    return list || null;
  } catch {
    const match = trimmed.match(/[?&]list=([^&]+)/);
    return match ? match[1] : null;
  }
}

export interface PlaylistVideoItem {
  videoId: string;
  title: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
}

export async function fetchPlaylistVideos(playlistId: string): Promise<PlaylistVideoItem[]> {
  const key = YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY not configured");

  const videos: PlaylistVideoItem[] = [];
  let nextPageToken: string | null = null;

  do {
    const pageTokenParam = nextPageToken ? `&pageToken=${enc(nextPageToken)}` : "";
    const data = await fetchJson(
      `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${enc(playlistId)}&maxResults=50&key=${key}${pageTokenParam}`
    );

    for (const item of data?.items || []) {
      const videoId = item?.contentDetails?.videoId || item?.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      videos.push({
        videoId,
        title: item?.snippet?.title || null,
        channelTitle: item?.snippet?.videoOwnerChannelTitle || item?.snippet?.channelTitle || null,
        thumbnailUrl:
          item?.snippet?.thumbnails?.high?.url ||
          item?.snippet?.thumbnails?.medium?.url ||
          item?.snippet?.thumbnails?.default?.url ||
          null,
      });
    }

    nextPageToken = data?.nextPageToken || null;
  } while (nextPageToken);

  return videos;
}

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error: ${text}`);
  }
  return res.json();
}

function enc(s: string) {
  return encodeURIComponent(s);
}
