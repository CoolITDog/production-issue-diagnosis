import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout';
import { DiagnosisProgress, DiagnosisResult } from '../components/DiagnosisResults';
import { ProductionTicket, CodeProject, DiagnosisResult as DiagnosisResultType } from '../types';
import './DiagnosisPage.css';

interface DiagnosisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

type DiagnosisState = 'setup' | 'running' | 'completed' | 'error';

export const DiagnosisPage: React.FC = () => {
  const [diagnosisState, setDiagnosisState] = useState<DiagnosisState>('setup');
  const [selectedTicket, setSelectedTicket] = useState<ProductionTicket | null>(null);
  const [selectedProject, setSelectedProject] = useState<CodeProject | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResultType | null>(null);

  const [steps] = useState<DiagnosisStep[]>([
    {
      id: 'analyze-code',
      title: '代码结构分析',
      description: '分析项目代码结构，识别关键组件和依赖关系',
      status: 'pending',
    },
    {
      id: 'parse-ticket',
      title: '问题信息解析',
      description: '解析生产单据中的输入输出数据和错误日志',
      status: 'pending',
    },
    {
      id: 'context-optimization',
      title: '上下文优化',
      description: '智能筛选相关代码片段，优化AI分析上下文',
      status: 'pending',
    },
    {
      id: 'ai-analysis',
      title: 'AI智能分析',
      description: '使用AI模型分析问题原因和生成解决方案',
      status: 'pending',
    },
    {
      id: 'result-processing',
      title: '结果处理',
      description: '格式化诊断结果，生成详细报告',
      status: 'pending',
    },
  ]);

  // Mock data for demonstration
  const mockTickets: ProductionTicket[] = [
    {
      id: '1',
      title: '用户登录失败问题',
      description: '用户在登录时遇到认证失败，返回500错误',
      severity: 'high',
      status: 'draft',
      inputData: { username: 'test@example.com', password: '***' },
      outputData: { error: 'Authentication failed', code: 500 },
      errorLogs: ['Error: Invalid credentials', 'Stack trace: ...'],
      timestamp: new Date('2024-01-15T10:30:00'),
    },
    {
      id: '2',
      title: '数据库连接超时',
      description: '应用程序无法连接到数据库，出现超时错误',
      severity: 'critical',
      status: 'draft',
      inputData: { query: 'SELECT * FROM users' },
      outputData: { error: 'Connection timeout', code: 504 },
      errorLogs: ['Error: Connection timeout after 30s'],
      timestamp: new Date('2024-01-15T11:00:00'),
    },
  ];

  const mockProjects: CodeProject[] = [
    {
      id: '1',
      name: 'user-auth-service',
      source: 'upload',
      uploadTime: new Date('2024-01-15T09:00:00'),
      files: [],
      structure: { type: 'directory', name: 'root', children: [] },
      totalSize: 1024000,
      languages: ['TypeScript', 'JavaScript'],
    },
    {
      id: '2',
      name: 'database-service',
      source: 'git',
      gitUrl: 'https://github.com/example/db-service',
      uploadTime: new Date('2024-01-15T09:30:00'),
      files: [],
      structure: { type: 'directory', name: 'root', children: [] },
      totalSize: 2048000,
      languages: ['Python', 'SQL'],
    },
  ];

  const mockDiagnosisResult: DiagnosisResultType = {
    possibleCauses: [
      {
        title: '认证服务配置错误',
        category: '配置问题',
        description: '认证服务的配置文件中可能存在错误的数据库连接字符串或认证密钥配置。',
        likelihood: 85,
        evidence: [
          '错误日志显示"Authentication failed"',
          '返回500内部服务器错误',
          '用户输入格式正确但认证失败',
        ],
        codeLocation: {
          file: 'src/auth/auth.service.ts',
          line: 45,
        },
      },
      {
        title: '数据库连接问题',
        category: '基础设施',
        description: '数据库服务可能不可用或网络连接存在问题。',
        likelihood: 65,
        evidence: [
          '认证需要查询用户数据库',
          '可能存在数据库连接超时',
        ],
      },
    ],
    confidence: 85,
    reasoning: `基于代码分析和错误日志，我发现以下关键信息：

1. 错误发生在用户认证过程中，返回500内部服务器错误
2. 用户输入格式正确（邮箱格式有效）
3. 错误日志显示"Authentication failed"，表明问题出现在认证逻辑中

通过分析认证服务代码，发现可能的问题点：
- 认证配置文件中的数据库连接字符串可能不正确
- JWT密钥配置可能存在问题
- 数据库查询逻辑可能存在异常处理不当

建议优先检查认证服务的配置文件和数据库连接状态。`,
    suggestedActions: [
      {
        title: '检查认证服务配置',
        description: '验证认证服务的配置文件，确保数据库连接和JWT密钥配置正确。',
        priority: 'high',
        steps: [
          '检查config/auth.json中的数据库连接字符串',
          '验证JWT_SECRET环境变量是否正确设置',
          '测试数据库连接是否正常',
        ],
        codeExample: `// 检查认证配置
const config = {
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '24h'
  }
};`,
      },
      {
        title: '添加详细错误日志',
        description: '在认证流程中添加更详细的错误日志，以便更好地诊断问题。',
        priority: 'medium',
        steps: [
          '在认证函数中添加try-catch块',
          '记录详细的错误信息和堆栈跟踪',
          '添加数据库查询结果的日志',
        ],
      },
    ],
    timestamp: new Date(),
  };

  const startDiagnosis = () => {
    if (!selectedTicket || !selectedProject) {
      alert('请选择单据和项目');
      return;
    }

    setDiagnosisState('running');
    setCurrentStep('analyze-code');
    setOverallProgress(0);

    // Simulate diagnosis process
    simulateDiagnosisProcess();
  };

  const simulateDiagnosisProcess = async () => {
    const stepIds = steps.map(s => s.id);
    
    for (let i = 0; i < stepIds.length; i++) {
      const stepId = stepIds[i];
      setCurrentStep(stepId);
      
      // Simulate step processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const progress = ((i + 1) / stepIds.length) * 100;
      setOverallProgress(progress);
      
      if (i === stepIds.length - 1) {
        // Diagnosis completed
        setDiagnosisState('completed');
        setDiagnosisResult(mockDiagnosisResult);
      }
    }
  };

  const handleExport = (format: 'pdf' | 'json' | 'markdown') => {
    console.log(`Exporting diagnosis result as ${format}`);
    // TODO: Implement export functionality
  };

  const handleShare = () => {
    console.log('Sharing diagnosis result');
    // TODO: Implement share functionality
  };

  const handleStartNewDiagnosis = () => {
    setDiagnosisState('setup');
    setSelectedTicket(null);
    setSelectedProject(null);
    setCurrentStep('');
    setOverallProgress(0);
    setDiagnosisResult(null);
  };

  const sidebar = (
    <div className="diagnosis-sidebar">
      <h3 className="sidebar-title">诊断工具</h3>
      <div className="sidebar-menu">
        <button 
          className={`sidebar-button ${diagnosisState === 'setup' ? 'active' : ''}`}
          onClick={() => setDiagnosisState('setup')}
        >
          <span className="button-icon">⚙️</span>
          诊断设置
        </button>
        {diagnosisState !== 'setup' && (
          <button 
            className={`sidebar-button ${diagnosisState === 'running' ? 'active' : ''}`}
            disabled={diagnosisState !== 'running'}
          >
            <span className="button-icon">⚡</span>
            诊断进行中
          </button>
        )}
        {diagnosisResult && (
          <button 
            className={`sidebar-button ${diagnosisState === 'completed' ? 'active' : ''}`}
            onClick={() => setDiagnosisState('completed')}
          >
            <span className="button-icon">📊</span>
            诊断结果
          </button>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (diagnosisState) {
      case 'setup':
        return (
          <div className="diagnosis-setup">
            <div className="setup-header">
              <h2 className="section-title">AI问题诊断</h2>
              <p className="section-description">
                选择要诊断的生产单据和相关项目，AI将分析代码和问题信息，提供智能诊断结果
              </p>
            </div>

            <div className="setup-content">
              <div className="selection-section">
                <h3 className="selection-title">选择生产单据</h3>
                <div className="selection-grid">
                  {mockTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`selection-card ${selectedTicket?.id === ticket.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="card-header">
                        <h4 className="card-title">{ticket.title}</h4>
                        <span className={`severity-badge ${ticket.severity}`}>
                          {ticket.severity === 'critical' ? '紧急' : 
                           ticket.severity === 'high' ? '高' : 
                           ticket.severity === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <p className="card-description">{ticket.description}</p>
                      <div className="card-meta">
                        <span>创建时间: {ticket.timestamp.toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="selection-section">
                <h3 className="selection-title">选择相关项目</h3>
                <div className="selection-grid">
                  {mockProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`selection-card ${selectedProject?.id === project.id ? 'selected' : ''}`}
                      onClick={() => setSelectedProject(project)}
                    >
                      <div className="card-header">
                        <h4 className="card-title">{project.name}</h4>
                        <span className="source-badge">
                          {project.source === 'upload' ? '文件上传' : 'Git仓库'}
                        </span>
                      </div>
                      <p className="card-description">
                        {project.languages.join(', ')} • {(project.totalSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <div className="card-meta">
                        <span>上传时间: {project.uploadTime.toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="setup-actions">
                <button
                  className="start-diagnosis-button"
                  onClick={startDiagnosis}
                  disabled={!selectedTicket || !selectedProject}
                >
                  <span className="button-icon">🚀</span>
                  开始AI诊断
                </button>
              </div>
            </div>
          </div>
        );

      case 'running':
        return (
          <DiagnosisProgress
            steps={steps}
            currentStep={currentStep}
            overallProgress={overallProgress}
            isRunning={true}
            onCancel={() => setDiagnosisState('setup')}
          />
        );

      case 'completed':
        return diagnosisResult ? (
          <DiagnosisResult
            result={diagnosisResult}
            onExport={handleExport}
            onShare={handleShare}
            onStartNewDiagnosis={handleStartNewDiagnosis}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <MainLayout sidebar={sidebar} showSidebar={true}>
      <div className="diagnosis-page">
        <div className="diagnosis-content">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
};