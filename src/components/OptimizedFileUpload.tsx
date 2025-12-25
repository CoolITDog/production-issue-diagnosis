import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useFileUploadProgress } from '../hooks/useLoadingState';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { FileChunker, memoryMonitor, performanceMetrics } from '../utils/performance';
import { useResponsive } from '../hooks/useResponsive';
import { CodeProject, FileError } from '../types';
import './OptimizedFileUpload.css';

interface OptimizedFileUploadProps {
  onUploadComplete: (project: CodeProject) => void;
  maxFileSize?: number; // in MB
  maxTotalSize?: number; // in MB
  supportedExtensions?: string[];
  className?: string;
}

export function OptimizedFileUpload({
  onUploadComplete,
  maxFileSize = 10,
  maxTotalSize = 100,
  supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'],
  className = '',
}: OptimizedFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  const { trackFileUpload } = useFileUploadProgress();
  const { handleFileError, showWarning, showSuccess } = useErrorHandler();
  const { isMobile, isTablet } = useResponsive();
  
  const fileChunker = useRef(new FileChunker(512 * 1024)); // 512KB chunks for better performance

  // Memory monitoring
  useEffect(() => {
    memoryMonitor.onMemoryWarning((usage, max) => {
      showWarning(
        'Memory Usage High',
        `Memory usage is at ${Math.round((usage / max) * 100)}%. Consider processing fewer files at once.`
      );
    });
  }, [showWarning]);

  const validateFiles = useCallback((files: FileList): { valid: File[]; invalid: { file: File; reason: string }[] } => {
    const valid: File[] = [];
    const invalid: { file: File; reason: string }[] = [];
    let totalSize = 0;

    Array.from(files).forEach(file => {
      // Check file extension
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedExtensions.includes(extension)) {
        invalid.push({ file, reason: `Unsupported file type: ${extension}` });
        return;
      }

      // Check individual file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxFileSize) {
        invalid.push({ file, reason: `File too large: ${fileSizeMB.toFixed(1)}MB (max: ${maxFileSize}MB)` });
        return;
      }

      totalSize += file.size;
      
      // Check total size
      const totalSizeMB = totalSize / (1024 * 1024);
      if (totalSizeMB > maxTotalSize) {
        invalid.push({ file, reason: `Total size would exceed limit: ${totalSizeMB.toFixed(1)}MB (max: ${maxTotalSize}MB)` });
        return;
      }

      valid.push(file);
    });

    return { valid, invalid };
  }, [maxFileSize, maxTotalSize, supportedExtensions]);

  const processFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const endTiming = performanceMetrics.startTiming('file-upload-processing');
    setIsProcessing(true);

    try {
      // Convert File[] to FileList-like object for the tracker
      const fileList = new DataTransfer();
      files.forEach(file => fileList.items.add(file));
      const tracker = trackFileUpload(fileList.files);
      const processedFiles: any[] = [];
      let totalProcessed = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Estimate memory usage
          const estimatedMemory = file.size * 2; // Rough estimate for processing overhead
          if (!memoryMonitor.trackAllocation(estimatedMemory)) {
            throw new Error('Insufficient memory to process file');
          }

          let content = '';
          
          // Use chunked processing for large files
          if (file.size > 1024 * 1024) { // 1MB threshold
            await fileChunker.current.processLargeFile(
              file,
              async (chunk, isLast) => {
                content += chunk;
              },
              (progress) => {
                tracker.updateFileProgress(i, progress);
              }
            );
          } else {
            content = await file.text();
            tracker.updateFileProgress(i, 100);
          }

          const processedFile = {
            id: `file-${Date.now()}-${i}`,
            fileName: file.name,
            filePath: file.webkitRelativePath || file.name,
            language: detectLanguage(file.name),
            content,
            size: file.size,
            lastModified: new Date(file.lastModified),
            functions: [],
            classes: [],
            complexity: 0,
          };

          processedFiles.push(processedFile);
          tracker.completeFile(i);
          
          // Release memory allocation
          memoryMonitor.releaseAllocation(estimatedMemory);
          
          totalProcessed++;
          
          // Allow UI to update
          await new Promise(resolve => setTimeout(resolve, 0));
          
        } catch (error) {
          tracker.failFile(i);
          await handleFileError(error as FileError, `Processing file: ${file.name}`);
        }
      }

      if (processedFiles.length > 0) {
        const project: CodeProject = {
          id: `project-${Date.now()}`,
          name: `Uploaded Project (${processedFiles.length} files)`,
          source: 'upload',
          uploadTime: new Date(),
          files: processedFiles,
          structure: generateProjectStructure(processedFiles),
          totalSize: processedFiles.reduce((sum, f) => sum + f.size, 0),
          languages: Array.from(new Set(processedFiles.map(f => f.language))),
        };

        tracker.complete();
        onUploadComplete(project);
        
        showSuccess(
          'Upload Complete',
          `Successfully processed ${processedFiles.length} files`
        );
      } else {
        tracker.fail();
        showWarning('Upload Failed', 'No files could be processed');
      }

    } catch (error) {
      await handleFileError(error as FileError, 'File upload processing');
    } finally {
      setIsProcessing(false);
      endTiming();
    }
  }, [trackFileUpload, handleFileError, showWarning, showSuccess, onUploadComplete]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    const { valid, invalid } = validateFiles(files);
    
    if (invalid.length > 0) {
      invalid.forEach(({ file, reason }) => {
        showWarning('File Validation Error', `${file.name}: ${reason}`);
      });
    }

    if (valid.length > 0) {
      setUploadedFiles(valid);
      await processFiles(valid);
    }
  }, [validateFiles, processFiles, showWarning]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleFolderSelect = useCallback(async () => {
    try {
      // Use File System Access API if available
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: File[] = [];
        
        const processDirectory = async (dirHandle: any, path = '') => {
          for await (const [name, handle] of dirHandle.entries()) {
            if (handle.kind === 'file') {
              const file = await handle.getFile();
              // Add relative path information
              Object.defineProperty(file, 'webkitRelativePath', {
                value: path ? `${path}/${name}` : name,
                writable: false,
              });
              files.push(file);
            } else if (handle.kind === 'directory') {
              await processDirectory(handle, path ? `${path}/${name}` : name);
            }
          }
        };
        
        await processDirectory(dirHandle);
        
        if (files.length > 0) {
          const fileList = new DataTransfer();
          files.forEach(file => fileList.items.add(file));
          await handleFileSelect(fileList.files);
        }
      } else {
        // Fallback to traditional folder input
        if (fileInputRef.current) {
          fileInputRef.current.webkitdirectory = true;
          fileInputRef.current.click();
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        await handleFileError(error as FileError, 'Folder selection');
      }
    }
  }, [handleFileSelect, handleFileError]);

  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
    };
    return languageMap[extension || ''] || 'text';
  };

  const generateProjectStructure = (files: any[]): any => {
    // Simple structure generation - can be enhanced
    return {
      type: 'directory',
      name: 'root',
      children: files.map(file => ({
        type: 'file',
        name: file.fileName,
        path: file.filePath,
        size: file.size,
      })),
      totalFiles: files.length,
      totalDirectories: 1,
    };
  };

  const getDropZoneClasses = () => {
    const baseClasses = 'optimized-file-upload';
    const responsiveClasses = isMobile ? 'optimized-file-upload--mobile' : 
                             isTablet ? 'optimized-file-upload--tablet' : 
                             'optimized-file-upload--desktop';
    const stateClasses = isDragOver ? 'optimized-file-upload--drag-over' : '';
    const processingClasses = isProcessing ? 'optimized-file-upload--processing' : '';
    
    return `${baseClasses} ${responsiveClasses} ${stateClasses} ${processingClasses} ${className}`.trim();
  };

  return (
    <div className={getDropZoneClasses()}>
      <div
        ref={dropZoneRef}
        className="optimized-file-upload__drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="optimized-file-upload__content">
          <div className="optimized-file-upload__icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h3 className="optimized-file-upload__title">
            {isProcessing ? 'Processing Files...' : 'Upload Code Files'}
          </h3>
          
          <p className="optimized-file-upload__description">
            {isMobile 
              ? 'Tap to select files or folders'
              : 'Drag and drop files here, or click to select'
            }
          </p>
          
          <div className="optimized-file-upload__limits">
            <span>Max file size: {maxFileSize}MB</span>
            <span>Max total size: {maxTotalSize}MB</span>
            <span>Supported: {supportedExtensions.join(', ')}</span>
          </div>
          
          <div className="optimized-file-upload__actions">
            <button
              className="optimized-file-upload__button optimized-file-upload__button--primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              Select Files
            </button>
            
            <button
              className="optimized-file-upload__button optimized-file-upload__button--secondary"
              onClick={handleFolderSelect}
              disabled={isProcessing}
            >
              Select Folder
            </button>
          </div>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={supportedExtensions.join(',')}
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />
      
      {uploadedFiles.length > 0 && (
        <div className="optimized-file-upload__file-list">
          <h4>Selected Files ({uploadedFiles.length})</h4>
          <div className="optimized-file-upload__files">
            {uploadedFiles.slice(0, 10).map((file, index) => (
              <div key={index} className="optimized-file-upload__file">
                <span className="optimized-file-upload__file-name">{file.name}</span>
                <span className="optimized-file-upload__file-size">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
            {uploadedFiles.length > 10 && (
              <div className="optimized-file-upload__file-more">
                +{uploadedFiles.length - 10} more files
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}