import React, { useState, useRef, useCallback } from 'react';
import { FileUploadManager } from '../services/FileUploadManager';
import { CodeProject, ValidationResult } from '../types';
import { formatFileSize } from '../utils';
import './FileUpload.css';

interface FileUploadProps {
  onProjectUploaded: (project: CodeProject) => void;
  onError: (error: string) => void;
}

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
  validation?: ValidationResult;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onProjectUploaded,
  onError,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileUploadManager = new FileUploadManager();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadState(prev => ({ ...prev, isDragging: false }));

    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    // Process dropped items (files and folders)
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await processEntry(entry, files);
        }
      }
    }

    if (files.length > 0) {
      const fileList = createFileList(files);
      await handleFileUpload(fileList);
    }
  }, []);

  const processEntry = async (entry: any, files: File[]): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => {
        entry.file(resolve);
      });
      files.push(file);
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => {
        reader.readEntries(resolve);
      });
      
      for (const childEntry of entries) {
        await processEntry(childEntry, files);
      }
    }
  };

  const createFileList = (files: File[]): FileList => {
    const dt = new DataTransfer();
    files.forEach(file => dt.items.add(file));
    return dt.files;
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    try {
      setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

      // Validate files first
      const validation = await fileUploadManager.validateFiles(Array.from(files));
      setUploadState(prev => ({ ...prev, validation, progress: 25 }));

      if (!validation.isValid) {
        onError(`Validation failed: ${validation.errors.join(', ')}`);
        setUploadState(prev => ({ ...prev, isUploading: false }));
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Upload warnings:', validation.warnings);
      }

      setUploadState(prev => ({ ...prev, progress: 50 }));

      // Process the upload
      const project = await fileUploadManager.handleFolderUpload(files);
      
      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      // Notify parent component
      onProjectUploaded(project);
      
      // Reset state
      setUploadState({
        isDragging: false,
        isUploading: false,
        progress: 0,
      });

      // Clear file inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';

    } catch (error) {
      console.error('File upload error:', error);
      onError(error instanceof Error ? error.message : 'Upload failed');
      setUploadState(prev => ({ ...prev, isUploading: false, progress: 0 }));
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFolderButtonClick = () => {
    folderInputRef.current?.click();
  };

  const { isDragging, isUploading, progress, validation } = uploadState;

  return (
    <div className="file-upload-container">
      <div
        className={`file-upload-dropzone ${isDragging ? 'dragging' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p>Uploading... {progress}%</p>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">📁</div>
            <h3>Upload Code Files</h3>
            <p>
              Drag and drop files or folders here, or click to select
            </p>
            
            <div className="upload-buttons">
              <button 
                type="button"
                onClick={handleFileButtonClick}
                className="upload-btn"
                disabled={isUploading}
              >
                Select Files
              </button>
              <button 
                type="button"
                onClick={handleFolderButtonClick}
                className="upload-btn"
                disabled={isUploading}
              >
                Select Folder
              </button>
            </div>

            <div className="upload-info">
              <p>Supported formats: JavaScript, TypeScript, Python, Java, C++, and more</p>
              <p>Maximum file size: 50MB | Maximum total size: 500MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="validation-results">
          {validation.errors.length > 0 && (
            <div className="validation-errors">
              <h4>❌ Errors:</h4>
              <ul>
                {validation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="validation-warnings">
              <h4>⚠️ Warnings:</h4>
              <ul>
                {validation.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.kt,.swift,.html,.css,.scss,.less,.json,.xml,.yaml,.yml,.md,.sql,.txt,.log"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore - webkitdirectory is not in TypeScript types but is supported
        webkitdirectory=""
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};