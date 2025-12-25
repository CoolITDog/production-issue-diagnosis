import React from 'react';
import { ProductionTicket } from '../../types';
import './TicketDetail.css';

interface TicketDetailProps {
  ticket: ProductionTicket;
  onEdit: (ticket: ProductionTicket) => void;
  onDelete: (ticketId: string) => void;
  onStartDiagnosis: (ticket: ProductionTicket) => void;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  onEdit,
  onDelete,
  onStartDiagnosis,
}) => {
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return '#28a745';
      case 'analyzing':
        return '#007bff';
      case 'draft':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getSeverityText = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '紧急';
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return severity;
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'analyzing':
        return '分析中';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatJsonData = (data: any): string => {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这个单据吗？此操作不可撤销。')) {
      onDelete(ticket.id);
    }
  };

  return (
    <div className="ticket-detail-container">
      <div className="ticket-detail-header">
        <div className="header-content">
          <h2 className="ticket-title">{ticket.title}</h2>
          <div className="ticket-meta">
            <span 
              className="severity-badge"
              style={{ backgroundColor: getSeverityColor(ticket.severity) }}
            >
              {getSeverityText(ticket.severity)}
            </span>
            <span 
              className="status-badge"
              style={{ color: getStatusColor(ticket.status) }}
            >
              {getStatusText(ticket.status)}
            </span>
            <span className="timestamp">
              创建时间: {formatDate(ticket.timestamp)}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button
            className="action-button secondary"
            onClick={() => onEdit(ticket)}
          >
            <span className="button-icon">✏️</span>
            编辑
          </button>
          <button
            className="action-button primary"
            onClick={() => onStartDiagnosis(ticket)}
            disabled={ticket.status === 'analyzing'}
          >
            <span className="button-icon">🔍</span>
            {ticket.status === 'analyzing' ? '分析中...' : '开始诊断'}
          </button>
          <button
            className="action-button danger"
            onClick={handleDelete}
          >
            <span className="button-icon">🗑️</span>
            删除
          </button>
        </div>
      </div>

      <div className="ticket-detail-content">
        <div className="detail-section">
          <h3 className="section-title">问题描述</h3>
          <div className="section-content">
            <p className="description-text">{ticket.description}</p>
          </div>
        </div>

        {ticket.inputData && (
          <div className="detail-section">
            <h3 className="section-title">输入数据</h3>
            <div className="section-content">
              <pre className="code-block">
                <code>{formatJsonData(ticket.inputData)}</code>
              </pre>
            </div>
          </div>
        )}

        {ticket.outputData && (
          <div className="detail-section">
            <h3 className="section-title">输出数据</h3>
            <div className="section-content">
              <pre className="code-block">
                <code>{formatJsonData(ticket.outputData)}</code>
              </pre>
            </div>
          </div>
        )}

        {ticket.errorLogs && ticket.errorLogs.length > 0 && (
          <div className="detail-section">
            <h3 className="section-title">错误日志</h3>
            <div className="section-content">
              <div className="log-container">
                {ticket.errorLogs.map((log, index) => (
                  <div key={index} className="log-line">
                    <span className="log-number">{index + 1}</span>
                    <span className="log-text">{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="detail-section">
          <h3 className="section-title">单据信息</h3>
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">单据ID:</span>
                <span className="info-value">{ticket.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">严重程度:</span>
                <span 
                  className="info-value severity"
                  style={{ color: getSeverityColor(ticket.severity) }}
                >
                  {getSeverityText(ticket.severity)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">当前状态:</span>
                <span 
                  className="info-value status"
                  style={{ color: getStatusColor(ticket.status) }}
                >
                  {getStatusText(ticket.status)}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">创建时间:</span>
                <span className="info-value">{formatDate(ticket.timestamp)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};