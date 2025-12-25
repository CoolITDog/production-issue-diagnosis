import React, { useState, useEffect } from 'react';
import { ProductionTicket, TicketTemplate } from '../../types';
import { TicketTemplateManager } from '../../services/TicketTemplateManager';
import './TicketForm.css';

interface TicketFormProps {
  ticket?: ProductionTicket;
  onSave: (ticket: Omit<ProductionTicket, 'id' | 'timestamp'>) => void;
  onCancel: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({
  ticket,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: ticket?.title || '',
    description: ticket?.description || '',
    severity: ticket?.severity || 'medium' as const,
    status: ticket?.status || 'draft' as const,
    inputData: ticket?.inputData || '',
    outputData: ticket?.outputData || '',
    errorLogs: ticket?.errorLogs?.join('\n') || '',
  });

  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const templateManager = new TicketTemplateManager();

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const availableTemplates = await templateManager.getAllTemplates();
        setTemplates(availableTemplates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    try {
      setIsLoading(true);
      const template = await templateManager.getTemplate(templateId);
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.template.title || template.name,
          description: template.template.description || template.description,
          severity: template.template.severity || 'medium',
        }));
        setSelectedTemplate(templateId);
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const ticketData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      severity: formData.severity,
      status: formData.status,
      inputData: formData.inputData.trim() ? JSON.parse(formData.inputData) : null,
      outputData: formData.outputData.trim() ? JSON.parse(formData.outputData) : null,
      errorLogs: formData.errorLogs.trim() ? formData.errorLogs.split('\n').filter(log => log.trim()) : [],
    };

    onSave(ticketData);
  };

  const isFormValid = formData.title.trim() && formData.description.trim();

  return (
    <div className="ticket-form-container">
      <div className="ticket-form-header">
        <h2 className="form-title">
          {ticket ? '编辑单据' : '创建新单据'}
        </h2>
        <p className="form-description">
          填写生产问题的详细信息，包括输入输出数据和错误日志
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ticket-form">
        {/* Template Selection */}
        {!ticket && templates.length > 0 && (
          <div className="form-section">
            <h3 className="section-title">选择模板</h3>
            <div className="template-selector">
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="template-select"
                disabled={isLoading}
              >
                <option value="">选择模板（可选）</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
              {isLoading && <div className="loading-indicator">加载中...</div>}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="form-section">
          <h3 className="section-title">基本信息</h3>
          
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              标题 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="form-input"
              placeholder="请输入问题标题"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              问题描述 <span className="required">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-textarea"
              rows={4}
              placeholder="详细描述遇到的问题..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="severity" className="form-label">
                严重程度
              </label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="critical">紧急</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status" className="form-label">
                状态
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="draft">草稿</option>
                <option value="analyzing">分析中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Information */}
        <div className="form-section">
          <h3 className="section-title">数据信息</h3>
          
          <div className="form-group">
            <label htmlFor="inputData" className="form-label">
              输入数据
            </label>
            <textarea
              id="inputData"
              name="inputData"
              value={formData.inputData}
              onChange={handleInputChange}
              className="form-textarea code-textarea"
              rows={6}
              placeholder='请输入JSON格式的输入数据，例如：{"userId": 123, "action": "login"}'
            />
            <div className="form-hint">
              请输入有效的JSON格式数据
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="outputData" className="form-label">
              输出数据
            </label>
            <textarea
              id="outputData"
              name="outputData"
              value={formData.outputData}
              onChange={handleInputChange}
              className="form-textarea code-textarea"
              rows={6}
              placeholder='请输入JSON格式的输出数据，例如：{"status": "error", "message": "Invalid credentials"}'
            />
            <div className="form-hint">
              请输入有效的JSON格式数据
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="errorLogs" className="form-label">
              错误日志
            </label>
            <textarea
              id="errorLogs"
              name="errorLogs"
              value={formData.errorLogs}
              onChange={handleInputChange}
              className="form-textarea code-textarea"
              rows={8}
              placeholder="请输入错误日志，每行一条日志记录"
            />
            <div className="form-hint">
              每行输入一条日志记录
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="form-button secondary"
          >
            取消
          </button>
          <button
            type="submit"
            className="form-button primary"
            disabled={!isFormValid || isLoading}
          >
            {ticket ? '更新单据' : '创建单据'}
          </button>
        </div>
      </form>
    </div>
  );
};