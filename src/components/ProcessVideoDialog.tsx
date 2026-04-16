import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProcessingQueue } from "@/contexts/ProcessingQueueContext";
import { SummaryStyle, SUMMARY_STYLE_OPTIONS } from "@/types/summary";

export const ProcessVideoDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const [contentUrl, setContentUrl] = useState("");
  const [summaryStyle, setSummaryStyle] = useState<SummaryStyle>("balanced");
  const { addTask } = useProcessingQueue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = contentUrl.trim();

    let taskTitle = "Processing content...";
    if (trimmedUrl.includes("list=")) taskTitle = "YouTube Playlist";
    else if (trimmedUrl.includes("youtube.com") || trimmedUrl.includes("youtu.be")) taskTitle = "YouTube Video";
    else if (trimmedUrl.includes("/p/")) taskTitle = "Substack Article";

    addTask(trimmedUrl, "dashboard", taskTitle, summaryStyle);

    setOpen(false);
    setContentUrl("");

    toast({
      title: "Added to processing queue",
      description: "Your content will be processed in the background.",
    });

    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Video className="h-4 w-4 mr-2" />
          Process Content
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Content</DialogTitle>
          <DialogDescription>
            Enter a YouTube video/playlist or Substack article URL to generate a summary
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content-url">Content URL</Label>
            <Input
              id="content-url"
              placeholder="https://youtube.com/watch?v=... or substack.com/p/..."
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary-style">Summary Style</Label>
            <Select value={summaryStyle} onValueChange={(v) => setSummaryStyle(v as SummaryStyle)}>
              <SelectTrigger id="summary-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUMMARY_STYLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            Add to Queue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
