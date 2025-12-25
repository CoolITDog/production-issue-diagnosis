import React, { useState } from 'react';
import { FileUpload } from './FileUpload';
import { GitIntegration } from './GitIntegration';
import { CodeProject } from '../types';
import './CodeSourceSelector.css';

interface CodeSourceSelectorProps {
  onProjectLoaded: (project: CodeProject) => void;
  onError: (error: string) => void;
}

type SourceType = 'upload' | 'git';

export const CodeSourceSelector: React.FC<CodeSourceSelectorProps> = ({
  onProjectLoaded,
  onError,
}) => {
  const [selectedSource, setSelectedSource] = useState<SourceType>('upload');

  const handleSourceChange = (source: SourceType) => {
    setSelectedSource(source);
  };

  return (
    <div className="code-source-selector">
      <div className="source-tabs">
        <button
          className={`source-tab ${selectedSource === 'upload' ? 'active' : ''}`}
          onClick={() => handleSourceChange('upload')}
        >
          📁 Upload Files
        </button>
        <button
          className={`source-tab ${selectedSource === 'git' ? 'active' : ''}`}
          onClick={() => handleSourceChange('git')}
        >
          🔗 Git Repository
        </button>
      </div>

      <div className="source-content">
        {selectedSource === 'upload' ? (
          <FileUpload
            onProjectUploaded={onProjectLoaded}
            onError={onError}
          />
        ) : (
          <GitIntegration
            onProjectLoaded={onProjectLoaded}
            onError={onError}
          />
        )}
      </div>
    </div>
  );
};