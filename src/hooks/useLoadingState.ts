import { useCallback } from 'react';
import { useLoading } from '../contexts/LoadingContext';

interface UseLoadingStateOptions {
  type?: 'file_upload' | 'git_clone' | 'code_parsing' | 'ai_analysis' | 'general';
  title: string;
  description?: string;
  estimatedDuration?: number;
}

export function useLoadingState() {
  const { 
    startOperation, 
    updateProgress, 
    completeOperation, 
    failOperation, 
    addSubOperation,
    updateSubOperation,
    setGlobalLoading 
  } = useLoading();

  const withLoading = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: UseLoadingStateOptions
  ) => {
    return async (...args: T): Promise<R> => {
      const operationId = startOperation({
        type: options.type || 'general',
        title: options.title,
        description: options.description,
        estimatedDuration: options.estimatedDuration,
      });

      try {
        const result = await fn(...args);
        completeOperation(operationId);
        return result;
      } catch (error) {
        failOperation(operationId);
        throw error;
      }
    };
  }, [startOperation, completeOperation, failOperation]);

  const createProgressTracker = useCallback((options: UseLoadingStateOptions) => {
    const operationId = startOperation({
      type: options.type || 'general',
      title: options.title,
      description: options.description,
      estimatedDuration: options.estimatedDuration,
    });

    return {
      operationId,
      updateProgress: (progress: number) => updateProgress(operationId, progress),
      complete: () => completeOperation(operationId),
      fail: () => failOperation(operationId),
      addSubTask: (title: string) => addSubOperation(operationId, {
        title,
        status: 'pending',
        progress: 0,
      }),
      updateSubTask: (subId: string, updates: { status?: 'pending' | 'running' | 'completed' | 'failed'; progress?: number }) => 
        updateSubOperation(operationId, subId, updates),
    };
  }, [startOperation, updateProgress, completeOperation, failOperation, addSubOperation, updateSubOperation]);

  const withGlobalLoading = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      setGlobalLoading(true);
      try {
        const result = await fn(...args);
        return result;
      } finally {
        setGlobalLoading(false);
      }
    };
  }, [setGlobalLoading]);

  return {
    withLoading,
    createProgressTracker,
    withGlobalLoading,
  };
}

// Utility hook for file upload progress
export function useFileUploadProgress() {
  const { createProgressTracker } = useLoadingState();

  const trackFileUpload = useCallback((files: FileList) => {
    const tracker = createProgressTracker({
      type: 'file_upload',
      title: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}`,
      description: 'Processing uploaded files...',
      estimatedDuration: files.length * 1000, // Rough estimate
    });

    const subTasks = Array.from(files).map(file => 
      tracker.addSubTask(`Processing ${file.name}`)
    );

    return {
      ...tracker,
      updateFileProgress: (fileIndex: number, progress: number) => {
        if (subTasks[fileIndex]) {
          tracker.updateSubTask(subTasks[fileIndex], { 
            status: progress === 100 ? 'completed' : 'running',
            progress 
          });
        }
        
        // Update overall progress
        const totalProgress = subTasks.reduce((sum, _, index) => {
          return sum + (index <= fileIndex ? (index === fileIndex ? progress : 100) : 0);
        }, 0) / files.length;
        
        tracker.updateProgress(totalProgress);
      },
      completeFile: (fileIndex: number) => {
        if (subTasks[fileIndex]) {
          tracker.updateSubTask(subTasks[fileIndex], { 
            status: 'completed',
            progress: 100 
          });
        }
      },
      failFile: (fileIndex: number) => {
        if (subTasks[fileIndex]) {
          tracker.updateSubTask(subTasks[fileIndex], { 
            status: 'failed',
            progress: 0 
          });
        }
      },
    };
  }, [createProgressTracker]);

  return { trackFileUpload };
}

// Utility hook for AI analysis progress
export function useAIAnalysisProgress() {
  const { createProgressTracker } = useLoadingState();

  const trackAIAnalysis = useCallback((ticketTitle: string) => {
    const tracker = createProgressTracker({
      type: 'ai_analysis',
      title: 'Analyzing Issue',
      description: `AI analysis for: ${ticketTitle}`,
      estimatedDuration: 30000, // 30 seconds estimate
    });

    const steps = [
      'Preparing context',
      'Analyzing code structure',
      'Identifying potential issues',
      'Generating recommendations',
      'Finalizing report',
    ];

    const subTasks = steps.map(step => tracker.addSubTask(step));

    return {
      ...tracker,
      startStep: (stepIndex: number) => {
        if (subTasks[stepIndex]) {
          tracker.updateSubTask(subTasks[stepIndex], { 
            status: 'running',
            progress: 0 
          });
        }
      },
      completeStep: (stepIndex: number) => {
        if (subTasks[stepIndex]) {
          tracker.updateSubTask(subTasks[stepIndex], { 
            status: 'completed',
            progress: 100 
          });
        }
        
        // Update overall progress
        const completedSteps = stepIndex + 1;
        const totalProgress = (completedSteps / steps.length) * 100;
        tracker.updateProgress(totalProgress);
      },
      failStep: (stepIndex: number) => {
        if (subTasks[stepIndex]) {
          tracker.updateSubTask(subTasks[stepIndex], { 
            status: 'failed',
            progress: 0 
          });
        }
      },
    };
  }, [createProgressTracker]);

  return { trackAIAnalysis };
}