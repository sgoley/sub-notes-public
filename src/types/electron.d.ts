export interface ElectronAPI {
  fetchTranscript: (videoId: string) => Promise<{
    success: boolean;
    transcript?: string;
    error?: string;
  }>;
  ping: () => Promise<{ success: boolean; message: string }>;
  onMainProcessMessage: (callback: (message: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
