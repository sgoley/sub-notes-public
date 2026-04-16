import { YoutubeTranscript } from "youtube-transcript-plus";

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  if (!segments || segments.length === 0) {
    throw new Error(`No transcript available for video ${videoId}`);
  }

  // Format with timestamps like [MM:SS] segment text
  return segments
    .map((seg: TranscriptSegment) => {
      const totalSeconds = Math.floor(seg.offset / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timestamp = `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}]`;
      return `${timestamp} ${seg.text.trim()}`;
    })
    .join("\n");
}
