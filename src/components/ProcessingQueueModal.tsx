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
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Trash2, RotateCw, List } from "lucide-react";
import { useProcessingQueue, ProcessingTask } from "@/contexts/ProcessingQueueContext";
import { formatDistanceToNow } from "date-fns";

export const ProcessingQueueModal = () => {
  const [open, setOpen] = useState(false);
  const { tasks, isProcessing, removeTask, clearCompleted, retryTask } = useProcessingQueue();

  const queuedTasks = tasks.filter((t) => t.status === "queued");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const failedTasks = tasks.filter((t) => t.status === "failed");

  const getStatusIcon = (task: ProcessingTask) => {
    switch (task.status) {
      case "processing": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      case "queued": return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatUrl = (url: string) => {
    try {
      const u = new URL(url);
      const path = u.pathname.substring(0, 30);
      return u.hostname + path + (u.pathname.length > 30 ? "..." : "");
    } catch {
      return url.substring(0, 50) + (url.length > 50 ? "..." : "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <List className="h-4 w-4 mr-2" />
          Processing Queue
          {(queuedTasks.length > 0 || isProcessing) && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center" variant="default">
              {queuedTasks.length + (isProcessing ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Processing Queue</DialogTitle>
          <DialogDescription>Background content processing tasks</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Active</div>
              <div className="text-2xl font-bold">{isProcessing ? 1 : 0}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Queued</div>
              <div className="text-2xl font-bold">{queuedTasks.length}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-2xl font-bold">{completedTasks.length}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold">{failedTasks.length}</div>
            </div>
          </div>

          {(completedTasks.length > 0 || failedTasks.length > 0) && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearCompleted}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Completed/Failed
              </Button>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No processing tasks</p>
                <p className="text-sm">Tasks appear here when you process content</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-4 ${task.status === "processing" ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getStatusIcon(task)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{task.title}</h4>
                            <Badge variant={task.status === "completed" ? "secondary" : task.status === "failed" ? "destructive" : "outline"}>
                              {task.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{formatUrl(task.url)}</p>
                          {task.error && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{task.error}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.completedAt
                              ? `Completed ${formatDistanceToNow(task.completedAt, { addSuffix: true })}`
                              : `Added ${formatDistanceToNow(task.createdAt, { addSuffix: true })}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {task.status === "failed" && (
                          <Button variant="ghost" size="sm" onClick={() => retryTask(task.id)} title="Retry">
                            <RotateCw className="h-4 w-4" />
                          </Button>
                        )}
                        {(task.status === "completed" || task.status === "failed") && (
                          <Button variant="ghost" size="sm" onClick={() => removeTask(task.id)} title="Remove">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
