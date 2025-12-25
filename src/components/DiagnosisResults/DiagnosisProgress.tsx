import React from 'react';
import './DiagnosisProgress.css';

interface DiagnosisStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  error?: string;
}

interface DiagnosisProgressProps {
  steps: DiagnosisStep[];
  currentStep: string;
  overallProgress: number;
  isRunning: boolean;
  onCancel?: () => void;
}

export const DiagnosisProgress: React.FC<DiagnosisProgressProps> = ({
  steps,
  currentStep,
  overallProgress,
  isRunning,
  onCancel,
}) => {
  const getStepIcon = (status: DiagnosisStep['status']): string => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⚡';
      case 'error':
        return '❌';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const getStepStatusText = (status: DiagnosisStep['status']): string => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'running':
        return '进行中';
      case 'error':
        return '错误';
      case 'pending':
      default:
        return '等待中';
    }
  };

  return (
    <div className="diagnosis-progress-container">
      <div className="progress-header">
        <div className="header-content">
          <h2 className="progress-title">AI诊断进行中</h2>
          <p className="progress-subtitle">
            正在分析您的代码和问题信息，请稍候...
          </p>
        </div>
        
        {onCancel && isRunning && (
          <button 
            className="cancel-button"
            onClick={onCancel}
            title="取消诊断"
          >
            <span className="button-icon">⏹️</span>
            取消
          </button>
        )}
      </div>

      <div className="overall-progress">
        <div className="progress-info">
          <span className="progress-label">总体进度</span>
          <span className="progress-percentage">{Math.round(overallProgress)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="steps-container">
        <h3 className="steps-title">诊断步骤</h3>
        <div className="steps-list">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className={`step-item ${step.status} ${currentStep === step.id ? 'current' : ''}`}
            >
              <div className="step-indicator">
                <div className="step-number">{index + 1}</div>
                <div className="step-icon">{getStepIcon(step.status)}</div>
              </div>
              
              <div className="step-content">
                <div className="step-header">
                  <h4 className="step-title">{step.title}</h4>
                  <span className="step-status">
                    {getStepStatusText(step.status)}
                  </span>
                </div>
                
                <p className="step-description">{step.description}</p>
                
                {step.status === 'running' && step.progress !== undefined && (
                  <div className="step-progress">
                    <div className="step-progress-bar">
                      <div 
                        className="step-progress-fill"
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                    <span className="step-progress-text">{step.progress}%</span>
                  </div>
                )}
                
                {step.status === 'error' && step.error && (
                  <div className="step-error">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{step.error}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="progress-footer">
        <div className="footer-info">
          <div className="info-item">
            <span className="info-icon">🕒</span>
            <span className="info-text">
              预计剩余时间: {isRunning ? '2-3分钟' : '已完成'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-icon">🤖</span>
            <span className="info-text">
              AI模型正在分析您的代码结构和问题模式
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};