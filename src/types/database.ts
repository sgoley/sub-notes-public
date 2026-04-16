export interface Subscription {
  id: string;
  source_type: "youtube" | "substack";
  source_id: string;
  source_title: string;
  source_url: string;
  thumbnail_url: string | null;
  enabled: boolean;
  last_checked_at: string | null;
  metadata: Record<string, unknown> | null;
  created: string;
  updated: string;
}

export interface SyncStatus {
  [key: string]: {
    synced: boolean;
    synced_at: string;
    path?: string;
    file_id?: string;
  };
}

export interface ContentSummary {
  id: string;
  subscription_id: string | null;
  content_type: "video" | "article";
  content_id: string;
  content_title: string;
  content_url: string;
  author: string | null;
  thumbnail_url: string | null;
  transcript: string | null;
  summary_markdown: string | null;
  highlights: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  summary_style: string | null;
  content_duration_seconds: number | null;
  sync_status: SyncStatus | null;
  metadata: Record<string, unknown> | null;
  published_at: string | null;
  created: string;
  updated: string;
}

export interface Settings {
  obsidian_auto_save?: boolean;
  obsidian_subfolder?: string;
}
