import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { ErrorHandler } from '../services/ErrorHandler';
import { FileError, GitError, ParsingError, AIError, RecoveryAction } from '../types';

interface ErrorState {
  errors: AppError[];
  isLoading: boolean;
  notifications: ErrorNotification[];
}

interface AppError {
  id: string;
  type: 'file' | 'git' | 'parsing' | 'ai' | 'general';
  error: Error;
  timestamp: Date;
  context?: string;
  recoveryAction?: RecoveryAction;
  isRecoverable: boolean;
}

interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  autoHide?: boolean;
  duration?: number;
}

type ErrorAction =
  | { type: 'ADD_ERROR'; payload: Omit<AppError, 'id' | 'timestamp'> }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<ErrorNotification, 'id' | 'timestamp'> }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_LOADING'; payload: boolean };

interface ErrorContextType {
  state: ErrorState;
  addError: (error: Error, type?: AppError['type'], context?: string) => Promise<void>;
  removeError: (id: string) => void;
  clearErrors: () => void;
  addNotification: (notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLoading: (loading: boolean) => void;
  handleRecovery: (errorId: string) => Promise<void>;
}

const initialState: ErrorState = {
  errors: [],
  isLoading: false,
  notifications: [],
};

function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [
          ...state.errors,
          {
            ...action.payload,
            id: generateId(),
            timestamp: new Date(),
          },
        ],
      };

    case 'REMOVE_ERROR':
      return {
        ...state,
        errors: state.errors.filter(error => error.id !== action.payload),
      };

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            ...action.payload,
            id: generateId(),
            timestamp: new Date(),
          },
        ],
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload),
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [state, dispatch] = useReducer(errorReducer, initialState);
  const errorHandler = new ErrorHandler();

  const addError = useCallback(async (error: Error, type: AppError['type'] = 'general', context?: string) => {
    let recoveryAction: RecoveryAction | undefined;
    
    // Get recovery action based on error type
    try {
      switch (type) {
        case 'file':
          recoveryAction = await errorHandler.handleFileError(error as FileError);
          break;
        case 'git':
          recoveryAction = await errorHandler.handleGitError(error as GitError);
          break;
        case 'parsing':
          recoveryAction = await errorHandler.handleParsingError(error as ParsingError);
          break;
        case 'ai':
          recoveryAction = await errorHandler.handleAIError(error as AIError);
          break;
        default:
          recoveryAction = {
            type: 'user_action',
            message: errorHandler.formatErrorMessage(error),
          };
      }
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
      recoveryAction = {
        type: 'user_action',
        message: 'An unexpected error occurred',
      };
    }

    const isRecoverable = errorHandler.isRecoverable(error);

    dispatch({
      type: 'ADD_ERROR',
      payload: {
        type,
        error,
        context,
        recoveryAction,
        isRecoverable,
      },
    });

    // Log the error
    errorHandler.logError(error, context);

    // Add notification for user
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: 'error',
        title: 'Error Occurred',
        message: recoveryAction.message,
        autoHide: !isRecoverable,
        duration: isRecoverable ? undefined : 5000,
      },
    });
  }, [errorHandler]);

  const removeError = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: id });
  }, []);

  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  const addNotification = useCallback((notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-hide notification if specified
    if (notification.autoHide !== false) {
      const duration = notification.duration || 5000;
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: generateId() });
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const clearNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const handleRecovery = useCallback(async (errorId: string) => {
    const error = state.errors.find(e => e.id === errorId);
    if (!error || !error.recoveryAction) return;

    const { recoveryAction } = error;

    switch (recoveryAction.type) {
      case 'retry':
        addNotification({
          type: 'info',
          title: 'Retrying...',
          message: recoveryAction.message,
          autoHide: true,
          duration: 3000,
        });
        
        // Remove the error as we're attempting recovery
        removeError(errorId);
        
        // In a real implementation, you would trigger the retry logic here
        // For now, we'll just show the notification
        break;

      case 'skip':
        addNotification({
          type: 'warning',
          title: 'Skipped',
          message: recoveryAction.message,
          autoHide: true,
          duration: 3000,
        });
        removeError(errorId);
        break;

      case 'fallback':
        addNotification({
          type: 'info',
          title: 'Using Fallback',
          message: recoveryAction.message,
          autoHide: true,
          duration: 3000,
        });
        removeError(errorId);
        break;

      case 'user_action':
        // Keep the error visible for user action
        addNotification({
          type: 'warning',
          title: 'Action Required',
          message: recoveryAction.message,
          autoHide: false,
        });
        break;
    }
  }, [state.errors, addNotification, removeError]);

  const value: ErrorContextType = {
    state,
    addError,
    removeError,
    clearErrors,
    addNotification,
    removeNotification,
    clearNotifications,
    setLoading,
    handleRecovery,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError(): ErrorContextType {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}