import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const VAULT_PATH = "/vault";
const OBSIDIAN_SUBFOLDER = process.env.OBSIDIAN_SUBFOLDER || "sub-notes";

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}

export function getObsidianPath(author: string | null, title: string): string {
  const folder = author ? sanitizeFilename(author) : "uncategorized";
  const filename = sanitizeFilename(title) + ".md";
  return join(VAULT_PATH, OBSIDIAN_SUBFOLDER, folder, filename);
}

export interface ObsidianSyncMeta {
  title: string;
  author: string | null;
  source_url: string | null;
  content_type: string | null;
  published_at: string | null;
  summary_created_at: string | null;
}

function buildFrontmatter(meta: ObsidianSyncMeta): string {
  const lines: string[] = ["---"];
  lines.push(`title: "${meta.title.replace(/"/g, '\\"')}"`);
  if (meta.author) lines.push(`channel: "${meta.author.replace(/"/g, '\\"')}"`);
  if (meta.source_url) lines.push(`source: "${meta.source_url}"`);
  if (meta.content_type) lines.push(`type: ${meta.content_type}`);
  if (meta.published_at) lines.push(`published: ${meta.published_at.substring(0, 10)}`);
  if (meta.summary_created_at) lines.push(`summarized: ${meta.summary_created_at.substring(0, 10)}`);
  lines.push("---");
  return lines.join("\n") + "\n\n";
}

export function syncToObsidian(
  author: string | null,
  title: string,
  markdown: string,
  meta?: ObsidianSyncMeta
): string {
  const filePath = getObsidianPath(author, title);

  if (existsSync(filePath)) {                                                                                          
    return filePath; // Already synced                                                                                 
  }  

  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const content = meta ? buildFrontmatter(meta) + markdown : markdown;
  writeFileSync(filePath, content, "utf-8");
  return filePath;
}

export function isVaultMounted(): boolean {
  return existsSync(VAULT_PATH);
}
