import React, { useState } from 'react';
import { ProductionTicket } from '../../types';
import './TicketList.css';

interface TicketListProps {
  tickets: ProductionTicket[];
  onTicketSelect: (ticket: ProductionTicket) => void;
  onTicketEdit: (ticket: ProductionTicket) => void;
  onTicketDelete: (ticketId: string) => void;
  selectedTicketId?: string;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  onTicketSelect,
  onTicketEdit,
  onTicketDelete,
  selectedTicketId,
}) => {
  const [sortBy, setSortBy] = useState<'timestamp' | 'severity' | 'status'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

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

  const filteredAndSortedTickets = tickets
    .filter(ticket => {
      if (filterStatus !== 'all' && ticket.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && ticket.severity !== filterSeverity) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'severity':
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          comparison = (severityOrder[a.severity as keyof typeof severityOrder] || 0) - 
                      (severityOrder[b.severity as keyof typeof severityOrder] || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'timestamp' | 'severity' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (tickets.length === 0) {
    return (
      <div className="ticket-list-empty">
        <div className="empty-icon">📋</div>
        <h3 className="empty-title">暂无单据</h3>
        <p className="empty-description">
          还没有创建任何生产问题单据
        </p>
      </div>
    );
  }

  return (
    <div className="ticket-list-container">
      <div className="ticket-list-header">
        <div className="list-title">
          <h3>单据列表</h3>
          <span className="ticket-count">共 {filteredAndSortedTickets.length} 条</span>
        </div>
        
        <div className="list-controls">
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">所有状态</option>
              <option value="draft">草稿</option>
              <option value="analyzing">分析中</option>
              <option value="completed">已完成</option>
            </select>
            
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="filter-select"
            >
              <option value="all">所有级别</option>
              <option value="critical">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
        </div>
      </div>

      <div className="ticket-list">
        <div className="ticket-list-table">
          <div className="table-header">
            <div className="header-cell title-cell">标题</div>
            <div 
              className={`header-cell sortable ${sortBy === 'severity' ? 'active' : ''}`}
              onClick={() => handleSort('severity')}
            >
              严重程度
              {sortBy === 'severity' && (
                <span className="sort-indicator">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <div 
              className={`header-cell sortable ${sortBy === 'status' ? 'active' : ''}`}
              onClick={() => handleSort('status')}
            >
              状态
              {sortBy === 'status' && (
                <span className="sort-indicator">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <div 
              className={`header-cell sortable ${sortBy === 'timestamp' ? 'active' : ''}`}
              onClick={() => handleSort('timestamp')}
            >
              创建时间
              {sortBy === 'timestamp' && (
                <span className="sort-indicator">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </div>
            <div className="header-cell actions-cell">操作</div>
          </div>

          <div className="table-body">
            {filteredAndSortedTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`ticket-row ${selectedTicketId === ticket.id ? 'selected' : ''}`}
                onClick={() => onTicketSelect(ticket)}
              >
                <div className="cell title-cell">
                  <div className="ticket-title">{ticket.title}</div>
                  <div className="ticket-description">{ticket.description}</div>
                </div>
                
                <div className="cell severity-cell">
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(ticket.severity) }}
                  >
                    {getSeverityText(ticket.severity)}
                  </span>
                </div>
                
                <div className="cell status-cell">
                  <span 
                    className="status-badge"
                    style={{ color: getStatusColor(ticket.status) }}
                  >
                    {getStatusText(ticket.status)}
                  </span>
                </div>
                
                <div className="cell timestamp-cell">
                  {formatDate(ticket.timestamp)}
                </div>
                
                <div className="cell actions-cell">
                  <button
                    className="action-button edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTicketEdit(ticket);
                    }}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="action-button delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('确定要删除这个单据吗？')) {
                        onTicketDelete(ticket.id);
                      }
                    }}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};