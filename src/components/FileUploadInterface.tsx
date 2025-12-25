import React, { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload';
import { CodeProject } from '../types';
import './FileUploadInterface.css';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FileUploadInterfaceProps {
  onProjectUploaded: (project: CodeProject) => void;
  onError: (error: string) => void;
}

export const FileUploadInterface: React.FC<FileUploadInterfaceProps> = ({
  onProjectUploaded,
  onError,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<FileInfo[]>([]);
  const [currentProject, setCurrentProject] = useState<CodeProject | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return '📄';
      case 'ts':
      case 'tsx':
        return '📘';
      case 'py':
        return '🐍';
      case 'java':
        return '☕';
      case 'cpp':
      case 'c':
        return '⚙️';
      case 'html':
        return '🌐';
      case 'css':
      case 'scss':
        return '🎨';
      case 'json':
        return '📋';
      case 'md':
        return '📝';
      default:
        return '📄';
    }
  };

  const handleProjectUploaded = useCallback((project: CodeProject) => {
    setCurrentProject(project);
    
    // Convert project files to FileInfo format
    const fileInfos: FileInfo[] = project.files.map(file => ({
      name: file.fileName,
      size: file.size,
      type: file.language,
      status: 'completed',
      progress: 100,
    }));
    
    setUploadedFiles(fileInfos);
    onProjectUploaded(project);
  }, [onProjectUploaded]);

  const handleUploadError = useCallback((error: string) => {
    onError(error);
  }, [onError]);

  const handleClearFiles = () => {
    setUploadedFiles([]);
    setCurrentProject(null);
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalFiles = uploadedFiles.length;
  const completedFiles = uploadedFiles.filter(f => f.status === 'completed').length;
  const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="file-upload-interface">
      <div className="upload-section">
        <h2 className="section-title">文件上传</h2>
        <p className="section-description">
          上传您的项目文件或文件夹，支持拖拽上传
        </p>
        
        <FileUpload
          onProjectUploaded={handleProjectUploaded}
          onError={handleUploadError}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="file-list-section">
          <div className="file-list-header">
            <h3 className="file-list-title">已上传文件</h3>
            <div className="file-stats">
              <span className="stat-item">
                <span className="stat-label">文件数量:</span>
                <span className="stat-value">{completedFiles}/{totalFiles}</span>
              </span>
              <span className="stat-item">
                <span className="stat-label">总大小:</span>
                <span className="stat-value">{formatFileSize(totalSize)}</span>
              </span>
            </div>
            <button 
              className="clear-button"
              onClick={handleClearFiles}
              title="清空文件列表"
            >
              清空
            </button>
          </div>

          <div className="file-list">
            {uploadedFiles.map((file, index) => (
              <div key={index} className={`file-item ${file.status}`}>
                <div className="file-info">
                  <div className="file-icon">{getFileIcon(file.name)}</div>
                  <div className="file-details">
                    <div className="file-name" title={file.name}>
                      {file.name}
                    </div>
                    <div className="file-meta">
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      {file.type && (
                        <>
                          <span className="file-separator">•</span>
                          <span className="file-type">{file.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="file-status">
                  {file.status === 'uploading' && (
                    <div className="file-progress">
                      <div className="progress-bar-small">
                        <div 
                          className="progress-fill-small"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{file.progress}%</span>
                    </div>
                  )}
                  
                  {file.status === 'completed' && (
                    <div className="status-icon success">✓</div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="status-icon error" title={file.error}>✗</div>
                  )}
                  
                  {file.status === 'pending' && (
                    <div className="status-icon pending">⏳</div>
                  )}
                </div>

                <button
                  className="remove-file-button"
                  onClick={() => handleRemoveFile(index)}
                  title="移除文件"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentProject && (
        <div className="project-summary">
          <h3 className="summary-title">项目概览</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-label">项目名称</div>
              <div className="summary-value">{currentProject.name}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">文件数量</div>
              <div className="summary-value">{currentProject.files.length}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">项目大小</div>
              <div className="summary-value">{formatFileSize(currentProject.totalSize)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">编程语言</div>
              <div className="summary-value">
                {currentProject.languages.join(', ') || '未识别'}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">上传时间</div>
              <div className="summary-value">
                {new Date(currentProject.uploadTime).toLocaleString('zh-CN')}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-label">来源</div>
              <div className="summary-value">
                {currentProject.source === 'upload' ? '文件上传' : 'Git仓库'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};