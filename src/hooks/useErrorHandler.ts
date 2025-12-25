import { useCallback } from 'react';
import { useError } from '../contexts/ErrorContext';
import { FileError, GitError, ParsingError, AIError } from '../types';

export function useErrorHandler() {
  const { addError, addNotification, setLoading } = useError();

  const handleFileError = useCallback(async (error: FileError, context?: string) => {
    await addError(error, 'file', context);
  }, [addError]);

  const handleGitError = useCallback(async (error: GitError, context?: string) => {
    await addError(error, 'git', context);
  }, [addError]);

  const handleParsingError = useCallback(async (error: ParsingError, context?: string) => {
    await addError(error, 'parsing', context);
  }, [addError]);

  const handleAIError = useCallback(async (error: AIError, context?: string) => {
    await addError(error, 'ai', context);
  }, [addError]);

  const handleGeneralError = useCallback(async (error: Error, context?: string) => {
    await addError(error, 'general', context);
  }, [addError]);

  const showSuccess = useCallback((title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      autoHide: true,
      duration: 3000,
    });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      autoHide: true,
      duration: 5000,
    });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      autoHide: true,
      duration: 4000,
    });
  }, [addNotification]);

  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorType: 'file' | 'git' | 'parsing' | 'ai' | 'general' = 'general',
    context?: string
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        setLoading(true);
        const result = await fn(...args);
        setLoading(false);
        return result;
      } catch (error) {
        setLoading(false);
        await addError(error as Error, errorType, context);
        return undefined;
      }
    };
  }, [addError, setLoading]);

  const withLoadingState = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>
  ) => {
    return async (...args: T): Promise<R> => {
      setLoading(true);
      try {
        const result = await fn(...args);
        return result;
      } finally {
        setLoading(false);
      }
    };
  }, [setLoading]);

  return {
    handleFileError,
    handleGitError,
    handleParsingError,
    handleAIError,
    handleGeneralError,
    showSuccess,
    showWarning,
    showInfo,
    withErrorHandling,
    withLoadingState,
  };
}