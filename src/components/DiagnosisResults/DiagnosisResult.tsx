import React, { useState } from 'react';
import { DiagnosisResult as DiagnosisResultType } from '../../types';
import './DiagnosisResult.css';

interface DiagnosisResultProps {
  result: DiagnosisResultType;
  onExport?: (format: 'pdf' | 'json' | 'markdown') => void;
  onShare?: () => void;
  onStartNewDiagnosis?: () => void;
}

export const DiagnosisResult: React.FC<DiagnosisResultProps> = ({
  result,
  onExport,
  onShare,
  onStartNewDiagnosis,
}) => {
  const [expandedCause, setExpandedCause] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState<'causes' | 'actions' | 'reasoning'>('causes');

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#28a745';
    if (confidence >= 60) return '#ffc107';
    if (confidence >= 40) return '#fd7e14';
    return '#dc3545';
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 80) return '高置信度';
    if (confidence >= 60) return '中等置信度';
    if (confidence >= 40) return '低置信度';
    return '极低置信度';
  };

  const formatTimestamp = (timestamp: Date): string => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleExport = (format: 'pdf' | 'json' | 'markdown') => {
    if (onExport) {
      onExport(format);
    }
  };

  return (
    <div className="diagnosis-result-container">
      <div className="result-header">
        <div className="header-content">
          <h2 className="result-title">诊断结果</h2>
          <div className="result-meta">
            <div className="confidence-indicator">
              <span className="confidence-label">置信度:</span>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill"
                  style={{ 
                    width: `${result.confidence}%`,
                    backgroundColor: getConfidenceColor(result.confidence)
                  }}
                />
              </div>
              <span 
                className="confidence-text"
                style={{ color: getConfidenceColor(result.confidence) }}
              >
                {result.confidence}% ({getConfidenceText(result.confidence)})
              </span>
            </div>
            <div className="timestamp">
              诊断时间: {formatTimestamp(result.timestamp)}
            </div>
          </div>
        </div>
        
        <div className="header-actions">
          {onExport && (
            <div className="export-dropdown">
              <button className="action-button secondary dropdown-toggle">
                <span className="button-icon">📥</span>
                导出结果
              </button>
              <div className="dropdown-menu">
                <button onClick={() => handleExport('pdf')}>
                  <span className="menu-icon">📄</span>
                  导出为PDF
                </button>
                <button onClick={() => handleExport('markdown')}>
                  <span className="menu-icon">📝</span>
                  导出为Markdown
                </button>
                <button onClick={() => handleExport('json')}>
                  <span className="menu-icon">📋</span>
                  导出为JSON
                </button>
              </div>
            </div>
          )}
          
          {onShare && (
            <button 
              className="action-button secondary"
              onClick={onShare}
            >
              <span className="button-icon">🔗</span>
              分享结果
            </button>
          )}
          
          {onStartNewDiagnosis && (
            <button 
              className="action-button primary"
              onClick={onStartNewDiagnosis}
            >
              <span className="button-icon">🔍</span>
              新建诊断
            </button>
          )}
        </div>
      </div>

      <div className="result-content">
        <div className="result-tabs">
          <button 
            className={`tab-button ${activeTab === 'causes' ? 'active' : ''}`}
            onClick={() => setActiveTab('causes')}
          >
            <span className="tab-icon">🔍</span>
            可能原因 ({result.possibleCauses.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <span className="tab-icon">🛠️</span>
            建议操作 ({result.suggestedActions.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'reasoning' ? 'active' : ''}`}
            onClick={() => setActiveTab('reasoning')}
          >
            <span className="tab-icon">🧠</span>
            分析推理
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'causes' && (
            <div className="causes-section">
              <div className="section-header">
                <h3 className="section-title">可能的问题原因</h3>
                <p className="section-description">
                  基于代码分析和问题模式识别，以下是可能导致问题的原因：
                </p>
              </div>
              
              <div className="causes-list">
                {result.possibleCauses.map((cause, index) => (
                  <div key={index} className="cause-item">
                    <div 
                      className="cause-header"
                      onClick={() => setExpandedCause(expandedCause === index ? null : index)}
                    >
                      <div className="cause-info">
                        <h4 className="cause-title">{cause.title}</h4>
                        <div className="cause-meta">
                          <span className="cause-category">{cause.category}</span>
                          <span 
                            className="cause-likelihood"
                            style={{ color: getConfidenceColor(cause.likelihood) }}
                          >
                            可能性: {cause.likelihood}%
                          </span>
                        </div>
                      </div>
                      <button className="expand-button">
                        {expandedCause === index ? '▼' : '▶'}
                      </button>
                    </div>
                    
                    {expandedCause === index && (
                      <div className="cause-details">
                        <div className="cause-description">
                          <h5>详细说明</h5>
                          <p>{cause.description}</p>
                        </div>
                        
                        {cause.evidence && cause.evidence.length > 0 && (
                          <div className="cause-evidence">
                            <h5>支持证据</h5>
                            <ul>
                              {cause.evidence.map((evidence, evidenceIndex) => (
                                <li key={evidenceIndex}>{evidence}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {cause.codeLocation && (
                          <div className="cause-location">
                            <h5>相关代码位置</h5>
                            <div className="code-location">
                              <span className="file-path">{cause.codeLocation.file}</span>
                              {cause.codeLocation.line && (
                                <span className="line-number">第 {cause.codeLocation.line} 行</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="actions-section">
              <div className="section-header">
                <h3 className="section-title">建议的解决方案</h3>
                <p className="section-description">
                  根据问题分析，建议按优先级执行以下操作：
                </p>
              </div>
              
              <div className="actions-list">
                {result.suggestedActions.map((action, index) => (
                  <div key={index} className="action-item">
                    <div className="action-header">
                      <div className="action-priority">
                        <span className={`priority-badge ${action.priority}`}>
                          {action.priority === 'high' ? '高' : 
                           action.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <div className="action-info">
                        <h4 className="action-title">{action.title}</h4>
                        <p className="action-description">{action.description}</p>
                      </div>
                    </div>
                    
                    {action.steps && action.steps.length > 0 && (
                      <div className="action-steps">
                        <h5>执行步骤</h5>
                        <ol>
                          {action.steps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    
                    {action.codeExample && (
                      <div className="action-code">
                        <h5>代码示例</h5>
                        <pre className="code-block">
                          <code>{action.codeExample}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reasoning' && (
            <div className="reasoning-section">
              <div className="section-header">
                <h3 className="section-title">AI分析推理过程</h3>
                <p className="section-description">
                  以下是AI模型的详细分析思路和推理过程：
                </p>
              </div>
              
              <div className="reasoning-content">
                <div className="reasoning-text">
                  {result.reasoning.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};