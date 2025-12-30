import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout';
import { FileUploadInterface } from '../components/FileUploadInterface';
import { GitIntegration } from '../components/GitIntegration';
import { CodeProject } from '../types';
import './ProjectPage.css';

export const ProjectPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'git' | 'list'>('upload');
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const navigate = useNavigate();

  // Load existing projects from localStorage on component mount
  useEffect(() => {
    const existingProjects = JSON.parse(localStorage.getItem('uploadedProjects') || '[]');
    setProjects(existingProjects);
  }, []);

  const handleProjectUploaded = (project: CodeProject) => {
    setProjects(prev => [...prev, project]);
    
    // Store the project in localStorage for persistence
    const existingProjects = JSON.parse(localStorage.getItem('uploadedProjects') || '[]');
    const updatedProjects = [...existingProjects, project];
    localStorage.setItem('uploadedProjects', JSON.stringify(updatedProjects));
    
    setActiveTab('list');
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // TODO: Show error notification
  };

  const handleViewDetails = (project: CodeProject) => {
    // 存储项目数据到localStorage或状态管理中
    localStorage.setItem('currentProject', JSON.stringify(project));
    // 导航到项目详情页面（可以是一个新页面或模态框）
    console.log('查看项目详情:', project);
    // 暂时显示项目信息的alert
    alert(`项目详情:\n名称: ${project.name}\n文件数: ${project.files.length}\n语言: ${project.languages.join(', ')}\n大小: ${(project.totalSize / 1024 / 1024).toFixed(2)} MB`);
  };

  const handleStartDiagnosis = (project: CodeProject) => {
    // 存储项目数据
    localStorage.setItem('currentProject', JSON.stringify(project));
    // 导航到诊断页面
    navigate('/diagnosis');
  };

  const sidebar = (
    <div className="project-sidebar">
      <h3 className="sidebar-title">项目操作</h3>
      <div className="sidebar-menu">
        <button 
          className={`sidebar-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <span className="button-icon">📁</span>
          项目列表
        </button>
        <button 
          className={`sidebar-button ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <span className="button-icon">⬆️</span>
          文件上传
        </button>
        <button 
          className={`sidebar-button ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
        >
          <span className="button-icon">🔗</span>
          Git集成
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'upload':
        return (
          <FileUploadInterface
            onProjectUploaded={handleProjectUploaded}
            onError={handleUploadError}
          />
        );
      
      case 'git':
        return (
          <div className="git-section">
            <h2 className="section-title">Git仓库集成</h2>
            <p className="section-description">
              连接Git仓库导入项目代码
            </p>
            <GitIntegration
              onProjectLoaded={handleProjectUploaded}
              onError={handleUploadError}
            />
          </div>
        );
      
      case 'list':
        return (
          <div className="project-list-section">
            <h2 className="section-title">项目列表</h2>
            <p className="section-description">
              管理您已上传的项目
            </p>
            
            {projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3 className="empty-title">暂无项目</h3>
                <p className="empty-description">
                  开始创建您的第一个项目，上传代码文件或连接Git仓库
                </p>
                <div className="empty-actions">
                  <button 
                    className="action-button primary"
                    onClick={() => setActiveTab('upload')}
                  >
                    <span className="button-icon">⬆️</span>
                    上传文件
                  </button>
                  <button 
                    className="action-button secondary"
                    onClick={() => setActiveTab('git')}
                  >
                    <span className="button-icon">🔗</span>
                    连接Git仓库
                  </button>
                </div>
              </div>
            ) : (
              <div className="project-grid">
                {projects.map((project, index) => (
                  <div key={project.id || index} className="project-card">
                    <div className="project-header">
                      <div className="project-icon">📁</div>
                      <div className="project-info">
                        <h3 className="project-name">{project.name}</h3>
                        <p className="project-meta">
                          {project.files.length} 文件 • {project.languages.join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="project-stats">
                      <div className="stat">
                        <span className="stat-label">大小:</span>
                        <span className="stat-value">
                          {(project.totalSize / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <div className="stat">
                        <span className="stat-label">上传时间:</span>
                        <span className="stat-value">
                          {new Date(project.uploadTime).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="project-actions">
                      <button 
                        className="project-action-btn primary"
                        onClick={() => handleViewDetails(project)}
                      >
                        查看详情
                      </button>
                      <button 
                        className="project-action-btn secondary"
                        onClick={() => handleStartDiagnosis(project)}
                      >
                        开始诊断
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <MainLayout sidebar={sidebar} showSidebar={true}>
      <div className="project-page">
        <div className="page-header">
          <h1 className="page-title">项目管理</h1>
          <p className="page-description">
            管理您的代码项目，支持文件上传和Git仓库集成
          </p>
        </div>

        <div className="project-content">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
};