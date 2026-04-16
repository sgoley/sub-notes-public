import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SummaryViewDialogProps {
  contentTitle: string;
  author?: string | null;
  summaryMarkdown: string;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
}

export const SummaryViewDialog = ({
  contentTitle,
  author,
  summaryMarkdown,
  disabled = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onOpen,
}: SummaryViewDialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const baseOnOpenChange = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const onOpenChange = (next: boolean) => {
    if (next && onOpen) onOpen();
    baseOnOpenChange(next);
  };

  // Strip YAML frontmatter (everything between --- markers at the start)
  const cleanMarkdown = summaryMarkdown.replace(/^---\n[\s\S]*?\n---\n/, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            title="View summary"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-xl pr-8">{contentTitle}</DialogTitle>
          {author && (
            <DialogDescription className="text-base">{author}</DialogDescription>
          )}
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 pb-6 overflow-auto" style={{ maxHeight: "calc(85vh - 120px)" }}>
          <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {cleanMarkdown}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
