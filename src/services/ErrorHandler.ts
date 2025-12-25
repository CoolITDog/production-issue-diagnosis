import {
  ErrorHandler as IErrorHandler,
  FileError,
  GitError,
  ParsingError,
  AIError,
  RecoveryAction,
} from '../types';

export class ErrorHandler implements IErrorHandler {
  /**
   * Handle file-related errors
   */
  async handleFileError(error: FileError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'file_too_large':
        return {
          type: 'user_action',
          message: `File "${error.fileName}" is too large. Please select smaller files or compress the content.`,
        };

      case 'unsupported_format':
        return {
          type: 'skip',
          message: `File format not supported for "${error.fileName}". Skipping this file.`,
        };

      case 'read_failed':
        return {
          type: 'retry',
          message: `Failed to read "${error.fileName}". Retrying...`,
          maxRetries: 3,
          delay: 1000,
        };

      default:
        return {
          type: 'user_action',
          message: `Unknown file error: ${error.message}`,
        };
    }
  }

  /**
   * Handle Git-related errors
   */
  async handleGitError(error: GitError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'network_failed':
        return {
          type: 'retry',
          message: 'Network connection failed. Please check your internet connection and try again.',
          maxRetries: 3,
          delay: 2000,
        };

      case 'auth_failed':
        return {
          type: 'user_action',
          message: 'Authentication failed. Please check your credentials and try again.',
        };

      case 'repo_not_found':
        return {
          type: 'user_action',
          message: `Repository not found at "${error.gitUrl}". Please verify the URL is correct.`,
        };

      case 'private_repo':
        return {
          type: 'fallback',
          message: 'Cannot access private repository in browser environment. Please use file upload instead.',
          fallbackStrategy: 'file_upload',
        };

      default:
        return {
          type: 'user_action',
          message: `Git error: ${error.message}`,
        };
    }
  }

  /**
   * Handle parsing-related errors
   */
  async handleParsingError(error: ParsingError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'syntax_error':
        return {
          type: 'skip',
          message: `Syntax error in "${error.fileName}" at line ${error.line}. Skipping this file.`,
        };

      case 'encoding_error':
        return {
          type: 'retry',
          message: `Encoding issue in "${error.fileName}". Trying different encoding...`,
          maxRetries: 2,
          delay: 500,
        };

      case 'file_too_large':
        return {
          type: 'fallback',
          message: `File "${error.fileName}" is too large to parse. Processing in chunks...`,
          fallbackStrategy: 'chunk_processing',
        };

      default:
        return {
          type: 'skip',
          message: `Parsing error in "${error.fileName}": ${error.message}`,
        };
    }
  }

  /**
   * Handle AI model-related errors
   */
  async handleAIError(error: AIError): Promise<RecoveryAction> {
    switch (error.type) {
      case 'api_limit':
        return {
          type: 'retry',
          message: `API rate limit reached. Waiting ${error.retryAfter || 60} seconds before retry...`,
          delay: (error.retryAfter || 60) * 1000,
          maxRetries: 3,
        };

      case 'model_unavailable':
        return {
          type: 'fallback',
          message: 'AI model is currently unavailable. Please try again later.',
          fallbackStrategy: 'local_analysis',
        };

      case 'context_too_long':
        return {
          type: 'fallback',
          message: 'Context is too long for the AI model. Optimizing context and retrying...',
          fallbackStrategy: 'context_optimization',
        };

      case 'network_timeout':
        return {
          type: 'retry',
          message: 'Network timeout occurred. Retrying with longer timeout...',
          maxRetries: 2,
          delay: 5000,
        };

      default:
        return {
          type: 'user_action',
          message: `AI model error: ${error.message}`,
        };
    }
  }

  /**
   * Create a user-friendly error message
   */
  formatErrorMessage(error: Error): string {
    if (error.name === 'FileUploadError') {
      return `File Upload Error: ${error.message}`;
    }
    
    if (error.name === 'GitCloneError') {
      return `Git Repository Error: ${error.message}`;
    }
    
    if (error.name === 'ParsingError') {
      return `Code Parsing Error: ${error.message}`;
    }
    
    if (error.name === 'AIError') {
      return `AI Analysis Error: ${error.message}`;
    }
    
    return `Unexpected Error: ${error.message}`;
  }

  /**
   * Log error for debugging purposes
   */
  logError(error: Error, context?: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    };
    
    console.error('Error logged:', logEntry);
    
    // In a real application, you might want to send this to a logging service
    // or store it in local storage for debugging purposes
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: Error): boolean {
    const recoverableErrors = [
      'network_failed',
      'api_limit',
      'network_timeout',
      'read_failed',
      'encoding_error',
    ];
    
    if (error && typeof error === 'object' && 'type' in error) {
      return recoverableErrors.includes((error as any).type);
    }
    
    return false;
  }
}