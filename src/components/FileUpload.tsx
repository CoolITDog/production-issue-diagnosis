import React, { useState, useRef, useCallback } from 'react';
import { FileUploadManager } from '../services/FileUploadManager';
import { CodeProject, ValidationResult } from '../types';
import { formatFileSize, detectLanguageFromExtension, generateId } from '../utils';
import { FileChunker, memoryMonitor, performanceMetrics } from '../utils/performance';
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
  const fileChunker = useRef(new FileChunker(512 * 1024)); // 512KB chunks for better performance

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

      // Convert FileList to array
      const fileArray = Array.from(files);
      
      // Validate files first
      const validation = await fileUploadManager.validateFiles(fileArray);
      setUploadState(prev => ({ ...prev, validation, progress: 10 }));

      if (!validation.isValid) {
        onError(`Validation failed: ${validation.errors.join(', ')}`);
        setUploadState(prev => ({ ...prev, isUploading: false }));
        return;
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Upload warnings:', validation.warnings);
      }

      setUploadState(prev => ({ ...prev, progress: 20 }));

      // Process the upload with performance metrics
      const endTiming = performanceMetrics.startTiming('file-upload-processing');
      const project = await processFilesWithProgress(fileArray);
      endTiming();
      
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

  // New function to process files with progress updates and memory management
  const processFilesWithProgress = async (files: File[]): Promise<CodeProject> => {
    // Filter code files using the public method or utility function
    const codeFiles = files.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension ? 
        fileUploadManager['SUPPORTED_EXTENSIONS'].includes(extension) : 
        false;
    });
    
    if (codeFiles.length === 0) {
      throw new Error('No supported code files found in the uploaded folder');
    }

    // Process files with progress updates
    const processedFiles = [];
    const totalFiles = codeFiles.length;
    
    for (let i = 0; i < codeFiles.length; i++) {
      const file = codeFiles[i];
      
      // Estimate memory usage
      const estimatedMemory = file.size * 2; // Rough estimate for processing overhead
      if (!memoryMonitor.trackAllocation(estimatedMemory)) {
        throw new Error('Insufficient memory to process files');
      }

      try {
        // Use chunked processing for large files (>1MB)
        let content = '';
        if (file.size > 1024 * 1024) {
          await fileChunker.current.processLargeFile(
            file,
            async (chunk, isLast) => {
              content += chunk;
            },
            () => {} // Progress is updated per file, not per chunk
          );
        } else {
          content = await file.text();
        }

        const language = detectLanguageFromExtension(file.name);
        
        const codeFile = {
          id: generateId(),
          fileName: file.name,
          filePath: file.webkitRelativePath || file.name,
          language,
          content,
          size: file.size,
          lastModified: new Date(file.lastModified),
          functions: [], // Will be populated by code parser
          classes: [], // Will be populated by code parser
          complexity: 0, // Will be calculated by code parser
        };

        processedFiles.push(codeFile);
        
        // Release memory allocation
        memoryMonitor.releaseAllocation(estimatedMemory);
        
        // Update progress based on files processed
        const progress = 20 + Math.floor(((i + 1) / totalFiles) * 60); // 20% to 80%
        setUploadState(prev => ({ ...prev, progress }));
        
        // Allow UI to update to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error) {
        memoryMonitor.releaseAllocation(estimatedMemory);
        console.warn(`Failed to process file ${file.name}:`, error);
        throw error; // Re-throw to stop processing
      }
    }

    // Build project structure
    const structure = buildProjectStructure(codeFiles);
    
    // Calculate total size and languages
    const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0);
    const languages = Array.from(new Set(processedFiles.map(file => file.language)));

    // Create project
    const project: CodeProject = {
      id: generateId(),
      name: extractProjectName(codeFiles),
      source: 'upload',
      uploadTime: new Date(),
      files: processedFiles,
      structure,
      totalSize,
      languages,
    };

    return project;
  };

  // Helper function to build project structure
  const buildProjectStructure = (files: File[]): any => {
    const directories = new Map<string, any>();
    
    // Process each file to build directory structure
    for (const file of files) {
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');
      
      // Build directory hierarchy
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!directories.has(currentPath)) {
          const dirNode: any = {
            name: dirName,
            path: currentPath,
            files: [],
            subdirectories: [],
          };
          directories.set(currentPath, dirNode);
          
          // Link to parent directory
          if (parentPath && directories.has(parentPath)) {
            const parentDir = directories.get(parentPath)!;
            parentDir.subdirectories.push(dirNode);
          }
        }
      }
      
      // Add file to its directory
      const fileDir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      if (fileDir && directories.has(fileDir)) {
        directories.get(fileDir)!.files.push(file.name);
      }
    }

    // Get root directories (those without parent)
    const rootDirectories = Array.from(directories.values()).filter(dir => 
      !dir.path.includes('/')
    );

    return {
      type: 'directory',
      name: 'root',
      directories: rootDirectories,
      totalFiles: files.length,
      totalDirectories: directories.size,
    };
  };

  // Helper function to extract project name
  const extractProjectName = (files: File[]): string => {
    // Try to get project name from common paths
    const paths = files.map(file => file.webkitRelativePath || file.name);
    
    // Look for common root directory
    if (paths.length > 0 && paths[0].includes('/')) {
      const rootDir = paths[0].split('/')[0];
      // Check if all files share the same root directory
      if (paths.every(path => path.startsWith(rootDir))) {
        return rootDir;
      }
    }
    
    // Fallback to timestamp-based name
    return `Project_${new Date().toISOString().slice(0, 10)}`;
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