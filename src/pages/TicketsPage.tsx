import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/Layout';
import { TicketForm, TicketList, TicketDetail } from '../components/TicketManagement';
import { ProductionTicket } from '../types';
import { TicketManager } from '../services/TicketManager';
import './TicketsPage.css';

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export const TicketsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tickets, setTickets] = useState<ProductionTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<ProductionTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<ProductionTicket | null>(null);

  const ticketManager = new TicketManager();
  const navigate = useNavigate();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = () => {
    const currentTickets = ticketManager.getCurrentTickets();
    setTickets(currentTickets);
  };

  const handleCreateTicket = () => {
    setEditingTicket(null);
    setViewMode('create');
  };

  const handleEditTicket = (ticket: ProductionTicket) => {
    setEditingTicket(ticket);
    setViewMode('edit');
  };

  const handleSaveTicket = (ticketData: Omit<ProductionTicket, 'id' | 'timestamp'>) => {
    try {
      if (editingTicket) {
        // Update existing ticket
        ticketManager.updateTicket(editingTicket.id, ticketData);
      } else {
        // Create new ticket
        ticketManager.createTicket(ticketData as ProductionTicket);
      }
      
      loadTickets();
      setViewMode('list');
      setEditingTicket(null);
    } catch (error) {
      console.error('Failed to save ticket:', error);
      // TODO: Show error notification
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    try {
      // Remove from tickets array
      setTickets(prev => prev.filter(t => t.id !== ticketId));
      
      // Clear selection if deleted ticket was selected
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setViewMode('list');
      }
      
      // TODO: Implement actual deletion in TicketManager
      console.log('Deleting ticket:', ticketId);
    } catch (error) {
      console.error('Failed to delete ticket:', error);
      // TODO: Show error notification
    }
  };

  const handleTicketSelect = (ticket: ProductionTicket) => {
    setSelectedTicket(ticket);
    setViewMode('detail');
  };

  const handleStartDiagnosis = (ticket: ProductionTicket) => {
    try {
      // 将选中的单据存储到localStorage，供诊断页面使用
      localStorage.setItem('selectedTicket', JSON.stringify(ticket));
      
      // 导航到诊断页面
      navigate('/diagnosis');
      
      console.log('Starting diagnosis for ticket:', ticket.id);
    } catch (error) {
      console.error('Failed to start diagnosis:', error);
      alert('启动诊断失败，请重试');
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingTicket(null);
    setSelectedTicket(null);
  };

  const sidebar = (
    <div className="tickets-sidebar">
      <h3 className="sidebar-title">单据操作</h3>
      <div className="sidebar-menu">
        <button 
          className={`sidebar-button ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <span className="button-icon">📋</span>
          单据列表
        </button>
        <button 
          className={`sidebar-button ${viewMode === 'create' ? 'active' : ''}`}
          onClick={handleCreateTicket}
        >
          <span className="button-icon">➕</span>
          创建单据
        </button>
        {selectedTicket && (
          <button 
            className={`sidebar-button ${viewMode === 'detail' ? 'active' : ''}`}
            onClick={() => setViewMode('detail')}
          >
            <span className="button-icon">👁️</span>
            单据详情
          </button>
        )}
      </div>
      
      {tickets.length > 0 && (
        <div className="sidebar-stats">
          <h4 className="stats-title">统计信息</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{tickets.length}</span>
              <span className="stat-label">总单据</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {tickets.filter(t => t.status === 'draft').length}
              </span>
              <span className="stat-label">草稿</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {tickets.filter(t => t.status === 'analyzing').length}
              </span>
              <span className="stat-label">分析中</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {tickets.filter(t => t.status === 'completed').length}
              </span>
              <span className="stat-label">已完成</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'create':
        return (
          <TicketForm
            onSave={handleSaveTicket}
            onCancel={handleCancel}
          />
        );
      
      case 'edit':
        return (
          <TicketForm
            ticket={editingTicket || undefined}
            onSave={handleSaveTicket}
            onCancel={handleCancel}
          />
        );
      
      case 'detail':
        return selectedTicket ? (
          <TicketDetail
            ticket={selectedTicket}
            onEdit={handleEditTicket}
            onDelete={handleDeleteTicket}
            onStartDiagnosis={handleStartDiagnosis}
          />
        ) : null;
      
      case 'list':
      default:
        return (
          <div className="tickets-list-section">
            <div className="list-header">
              <div className="header-content">
                <h2 className="section-title">单据管理</h2>
                <p className="section-description">
                  创建和管理生产问题单据，记录详细的问题信息
                </p>
              </div>
              <button 
                className="create-button"
                onClick={handleCreateTicket}
              >
                <span className="button-icon">➕</span>
                创建新单据
              </button>
            </div>
            
            <TicketList
              tickets={tickets}
              onTicketSelect={handleTicketSelect}
              onTicketEdit={handleEditTicket}
              onTicketDelete={handleDeleteTicket}
              selectedTicketId={selectedTicket?.id}
            />
          </div>
        );
    }
  };

  return (
    <MainLayout sidebar={sidebar} showSidebar={true}>
      <div className="tickets-page">
        <div className="tickets-content">
          {renderContent()}
        </div>
      </div>
    </MainLayout>
  );
};