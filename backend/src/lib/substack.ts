export async function fetchSubstackFeed(feedUrl: string) {
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "SubNotes/2.0 (RSS Reader)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch RSS feed: ${res.status}`);
  const xml = await res.text();
  return {
    title: extractXmlTag(xml, "title"),
    description: extractXmlTag(xml, "description"),
    image: extractXmlTag(xml, "image>url"),
  };
}

export async function fetchArticleContent(articleUrl: string): Promise<{
  title: string | null;
  author: string | null;
  image: string | null;
  publishDate: string | null;
  content: string | null;
}> {
  const res = await fetch(articleUrl, {
    headers: { "User-Agent": "SubNotes/2.0 (RSS Reader)" },
  });
  if (!res.ok) throw new Error(`Failed to fetch article: ${res.status}`);
  const html = await res.text();

  return {
    title: extractMetaTag(html, "og:title") || extractTitle(html),
    author: extractMetaTag(html, "author") || extractAuthorFromUrl(articleUrl),
    image: extractMetaTag(html, "og:image"),
    publishDate: extractMetaTag(html, "article:published_time"),
    content: extractArticleContent(html),
  };
}

export function extractArticleId(url: string): string {
  const slugMatch = url.match(/\/p\/([^/?]+)/);
  if (slugMatch) return slugMatch[1];
  const homePostMatch = url.match(/\/home\/post\/(p-\d+)/);
  if (homePostMatch) return homePostMatch[1];
  return url;
}

function extractXmlTag(xml: string, tagName: string): string | null {
  const tags = tagName.split(">");
  let content = xml;
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
    const match = content.match(regex);
    if (!match) return null;
    content = match[1];
  }
  return content.trim();
}

function extractMetaTag(html: string, property: string): string | null {
  let regex = new RegExp(`<meta\\s+property=["']og:${property}["']\\s+content=["']([^"']+)["']`, "i");
  let match = html.match(regex);
  if (match) return match[1];
  regex = new RegExp(`<meta\\s+name=["']${property}["']\\s+content=["']([^"']+)["']`, "i");
  match = html.match(regex);
  return match ? match[1] : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractAuthorFromUrl(url: string): string {
  const substackMatch = url.match(/https?:\/\/([^.]+)\.substack\.com/);
  if (substackMatch) return substackMatch[1];
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0];
  } catch {
    return "Unknown Author";
  }
}

function extractArticleContent(html: string): string | null {
  let match = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (match) return cleanHtml(match[1]);

  match = html.match(/<div[^>]*class="[^"]*(?:post-content|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (match) return cleanHtml(match[1]);

  match = html.match(/<div[^>]*class="[^"]*available-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (match) return cleanHtml(match[1]);

  return null;
}

function cleanHtml(html: string): string {
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  cleaned = cleaned.replace(/&nbsp;/g, " ");
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");
  cleaned = cleaned.replace(/&quot;/g, '"');
  return cleaned.trim();
}
