import React, { useState } from 'react';
import { FileUploadManager } from '../services/FileUploadManager';
import { CodeProject, GitCredentials, GitError } from '../types';
import { isValidGitUrl } from '../utils';
import './GitIntegration.css';

interface GitIntegrationProps {
  onProjectLoaded: (project: CodeProject) => void;
  onError: (error: string) => void;
}

interface GitState {
  gitUrl: string;
  isLoading: boolean;
  showCredentials: boolean;
  credentials: GitCredentials;
  urlError?: string;
}

export const GitIntegration: React.FC<GitIntegrationProps> = ({
  onProjectLoaded,
  onError,
}) => {
  const [gitState, setGitState] = useState<GitState>({
    gitUrl: '',
    isLoading: false,
    showCredentials: false,
    credentials: {},
  });

  const fileUploadManager = new FileUploadManager();

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGitState(prev => ({
      ...prev,
      gitUrl: url,
      urlError: url && !isValidGitUrl(url) ? 'Invalid Git URL format' : undefined,
    }));
  };

  const handleCredentialChange = (field: keyof GitCredentials, value: string) => {
    setGitState(prev => ({
      ...prev,
      credentials: {
        ...prev.credentials,
        [field]: value,
      },
    }));
  };

  const toggleCredentials = () => {
    setGitState(prev => ({
      ...prev,
      showCredentials: !prev.showCredentials,
    }));
  };

  const handleCloneAttempt = async () => {
    if (!gitState.gitUrl) {
      onError('Please enter a Git repository URL');
      return;
    }

    if (gitState.urlError) {
      onError(gitState.urlError);
      return;
    }

    setGitState(prev => ({ ...prev, isLoading: true }));

    try {
      const project = await fileUploadManager.handleGitClone(
        gitState.gitUrl,
        gitState.credentials
      );
      
      onProjectLoaded(project);
      
      // Reset form
      setGitState({
        gitUrl: '',
        isLoading: false,
        showCredentials: false,
        credentials: {},
      });
    } catch (error) {
      console.error('Git clone error:', error);
      
      let errorMessage = 'Failed to clone repository';
      
      if (error && typeof error === 'object' && 'type' in error) {
        const gitError = error as GitError;
        switch (gitError.type) {
          case 'network_failed':
            errorMessage = 'Network connection failed. Please check your internet connection.';
            break;
          case 'auth_failed':
            errorMessage = 'Authentication failed. Please check your credentials.';
            break;
          case 'repo_not_found':
            errorMessage = 'Repository not found. Please verify the URL is correct.';
            break;
          case 'private_repo':
            errorMessage = gitError.message || 'Cannot access private repository in browser environment.';
            break;
          default:
            errorMessage = gitError.message || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      onError(errorMessage);
      setGitState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !gitState.isLoading && gitState.gitUrl && !gitState.urlError) {
      handleCloneAttempt();
    }
  };

  const getUrlPlaceholder = () => {
    return 'https://github.com/username/repository.git';
  };

  const getHelpText = () => {
    return (
      <div className="git-help-text">
        <p><strong>Note:</strong> Due to browser security limitations, direct Git cloning is not supported.</p>
        <p>For private repositories or complex setups, please:</p>
        <ul>
          <li>Clone the repository locally</li>
          <li>Use the file upload feature to upload your code</li>
        </ul>
        <p>Supported URL formats:</p>
        <ul>
          <li>HTTPS: https://github.com/user/repo.git</li>
          <li>SSH: git@github.com:user/repo.git</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="git-integration-container">
      <div className="git-integration-form">
        <h3>Git Repository Integration</h3>
        
        <div className="git-url-input">
          <label htmlFor="git-url">Repository URL:</label>
          <input
            id="git-url"
            type="text"
            value={gitState.gitUrl}
            onChange={handleUrlChange}
            onKeyPress={handleKeyPress}
            placeholder={getUrlPlaceholder()}
            className={gitState.urlError ? 'error' : ''}
            disabled={gitState.isLoading}
          />
          {gitState.urlError && (
            <div className="input-error">{gitState.urlError}</div>
          )}
        </div>

        <div className="git-credentials-section">
          <button
            type="button"
            onClick={toggleCredentials}
            className="credentials-toggle"
            disabled={gitState.isLoading}
          >
            {gitState.showCredentials ? '🔒 Hide' : '🔓 Show'} Credentials (Optional)
          </button>

          {gitState.showCredentials && (
            <div className="credentials-form">
              <div className="credential-input">
                <label htmlFor="git-username">Username:</label>
                <input
                  id="git-username"
                  type="text"
                  value={gitState.credentials.username || ''}
                  onChange={(e) => handleCredentialChange('username', e.target.value)}
                  placeholder="Git username"
                  disabled={gitState.isLoading}
                />
              </div>

              <div className="credential-input">
                <label htmlFor="git-token">Access Token:</label>
                <input
                  id="git-token"
                  type="password"
                  value={gitState.credentials.token || ''}
                  onChange={(e) => handleCredentialChange('token', e.target.value)}
                  placeholder="Personal access token"
                  disabled={gitState.isLoading}
                />
              </div>

              <div className="credentials-note">
                <p>💡 For GitHub, use a Personal Access Token instead of password</p>
              </div>
            </div>
          )}
        </div>

        <div className="git-actions">
          <button
            type="button"
            onClick={handleCloneAttempt}
            disabled={gitState.isLoading || !gitState.gitUrl || !!gitState.urlError}
            className="clone-btn"
          >
            {gitState.isLoading ? (
              <>
                <span className="loading-spinner">⏳</span>
                Attempting to Access...
              </>
            ) : (
              <>
                <span>📥</span>
                Try to Access Repository
              </>
            )}
          </button>
        </div>

        <div className="git-help">
          {getHelpText()}
        </div>
      </div>
    </div>
  );
};