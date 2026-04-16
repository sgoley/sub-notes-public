import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { processContent } from '@/lib/api';
import { SummaryStyle } from '@/types/summary';

export type ProcessingTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ProcessingTask {
  id: string;
  url: string;
  title: string;
  type: 'video' | 'playlist' | 'article';
  processType: 'dashboard';
  summaryStyle?: SummaryStyle;
  status: ProcessingTaskStatus;
  progress?: { current: number; total: number };
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  result?: unknown;
}

interface ProcessingQueueContextType {
  tasks: ProcessingTask[];
  activeTask: ProcessingTask | null;
  isProcessing: boolean;
  addTask: (url: string, processType: 'dashboard', title?: string, summaryStyle?: SummaryStyle) => string;
  removeTask: (taskId: string) => void;
  clearCompleted: () => void;
  retryTask: (taskId: string) => void;
}

const ProcessingQueueContext = createContext<ProcessingQueueContextType | undefined>(undefined);

export const useProcessingQueue = () => {
  const context = useContext(ProcessingQueueContext);
  if (!context) throw new Error('useProcessingQueue must be used within ProcessingQueueProvider');
  return context;
};

function detectTaskType(url: string): 'video' | 'playlist' | 'article' {
  if (url.includes('list=')) return 'playlist';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
  return 'article';
}

export const ProcessingQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<ProcessingTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addTask = useCallback((url: string, processType: 'dashboard', title?: string, summaryStyle?: SummaryStyle): string => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskType = detectTaskType(url);
    const defaultTitle = taskType === 'playlist' ? 'YouTube Playlist' : taskType === 'video' ? 'YouTube Video' : 'Article';
    setTasks((prev) => [...prev, {
      id: taskId,
      url,
      title: title || defaultTitle,
      type: taskType,
      processType,
      summaryStyle: summaryStyle || 'balanced',
      status: 'queued',
      createdAt: new Date(),
    }]);
    return taskId;
  }, []);

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => t.status !== 'completed' && t.status !== 'failed'));
  }, []);

  const retryTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: 'queued' as ProcessingTaskStatus, error: undefined, progress: undefined } : t
    ));
  }, []);

  const getNextTask = useCallback((): ProcessingTask | null => {
    return tasks.find((t) => t.status === 'queued') || null;
  }, [tasks]);

  const activeTask = tasks.find((t) => t.status === 'processing') || null;

  const processTask = async (task: ProcessingTask) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: 'processing' as ProcessingTaskStatus } : t));

    try {
      const data = await processContent(task.url, task.summaryStyle || 'balanced');
      setTasks((prev) => prev.map((t) =>
        t.id === task.id ? { ...t, status: 'completed' as ProcessingTaskStatus, completedAt: new Date(), result: data } : t
      ));
    } catch (error) {
      setTasks((prev) => prev.map((t) =>
        t.id === task.id ? {
          ...t,
          status: 'failed' as ProcessingTaskStatus,
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        } : t
      ));
    }
  };

  useEffect(() => {
    const worker = async () => {
      if (isProcessing) return;
      const nextTask = getNextTask();
      if (!nextTask) return;
      setIsProcessing(true);
      await processTask(nextTask);
      setIsProcessing(false);
    };
    worker();
  }, [tasks, isProcessing]);

  return (
    <ProcessingQueueContext.Provider value={{ tasks, activeTask, isProcessing, addTask, removeTask, clearCompleted, retryTask }}>
      {children}
    </ProcessingQueueContext.Provider>
  );
};
