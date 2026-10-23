import { YoutubeTranscript } from "youtube-transcript-plus";

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export async function fetchTranscript(videoId: string): Promise<string> {
  // Never accept YouTube's default track: it may be in any language. If an
  // English track is unavailable, fail instead of saving a transcript in the
  // wrong language.
  const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
  if (!segments || segments.length === 0) {
    throw new Error(`No transcript available for video ${videoId}`);
  }

  // Format with timestamps like [MM:SS] segment text
  return segments
    .map((seg: TranscriptSegment) => {
      const totalSeconds = Math.floor(seg.offset);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timestamp = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
      const text = seg.text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#x27;/gi, "'")
        .trim();
      return `${timestamp} ${text}`;
    })
    .join("\n");
}
