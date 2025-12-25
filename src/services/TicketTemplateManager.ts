import { ProductionTicket } from '../types';

/**
 * Template for creating production tickets
 */
export interface TicketTemplate {
  id: string;
  name: string;
  description: string;
  category: 'database' | 'api' | 'ui' | 'performance' | 'security' | 'general';
  template: Partial<ProductionTicket>;
  fields: TemplateField[];
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Field definition for template forms
 */
export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'json' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * TicketTemplateManager handles creation, management, and application of production ticket templates
 * Provides predefined templates and supports custom template creation
 */
export class TicketTemplateManager {
  private readonly STORAGE_KEY = 'ticket_templates';
  private readonly CUSTOM_TEMPLATES_KEY = 'custom_ticket_templates';

  /**
   * Gets all available templates (predefined + custom)
   * @returns Array of all ticket templates
   */
  getAllTemplates(): TicketTemplate[] {
    const predefinedTemplates = this.getPredefinedTemplates();
    const customTemplates = this.getCustomTemplates();
    return [...predefinedTemplates, ...customTemplates];
  }

  /**
   * Gets templates by category
   * @param category Template category to filter by
   * @returns Array of templates in the specified category
   */
  getTemplatesByCategory(category: TicketTemplate['category']): TicketTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Gets a specific template by ID
   * @param templateId Template ID
   * @returns Template or null if not found
   */
  getTemplate(templateId: string): TicketTemplate | null {
    const allTemplates = this.getAllTemplates();
    return allTemplates.find(template => template.id === templateId) || null;
  }

  /**
   * Creates a production ticket from a template
   * @param templateId Template ID to use
   * @param customData Custom data to override template defaults
   * @returns Partial production ticket ready for completion
   */
  createTicketFromTemplate(templateId: string, customData: Record<string, any> = {}): Partial<ProductionTicket> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Start with template base
    const ticketData: Partial<ProductionTicket> = {
      ...template.template,
      timestamp: new Date(),
      status: 'draft'
    };

    // Apply custom data based on template fields
    for (const field of template.fields) {
      if (customData[field.key] !== undefined) {
        (ticketData as any)[field.key] = customData[field.key];
      } else if (field.defaultValue !== undefined) {
        (ticketData as any)[field.key] = field.defaultValue;
      }
    }

    return ticketData;
  }

  /**
   * Creates a custom template
   * @param templateData Template data
   * @returns Created template ID
   */
  createCustomTemplate(templateData: Omit<TicketTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): string {
    const template: TicketTemplate = {
      ...templateData,
      id: this.generateTemplateId(),
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const customTemplates = this.getCustomTemplates();
    customTemplates.push(template);
    this.saveCustomTemplates(customTemplates);

    return template.id;
  }

  /**
   * Updates a custom template
   * @param templateId Template ID
   * @param updates Template updates
   */
  updateCustomTemplate(templateId: string, updates: Partial<TicketTemplate>): void {
    const customTemplates = this.getCustomTemplates();
    const templateIndex = customTemplates.findIndex(t => t.id === templateId);
    
    if (templateIndex === -1) {
      throw new Error(`Custom template with ID ${templateId} not found`);
    }

    customTemplates[templateIndex] = {
      ...customTemplates[templateIndex],
      ...updates,
      updatedAt: new Date()
    };

    this.saveCustomTemplates(customTemplates);
  }

  /**
   * Deletes a custom template
   * @param templateId Template ID
   */
  deleteCustomTemplate(templateId: string): void {
    const customTemplates = this.getCustomTemplates();
    const filteredTemplates = customTemplates.filter(t => t.id !== templateId);
    
    if (filteredTemplates.length === customTemplates.length) {
      throw new Error(`Custom template with ID ${templateId} not found`);
    }

    this.saveCustomTemplates(filteredTemplates);
  }

  /**
   * Validates template field data
   * @param template Template to validate against
   * @param data Data to validate
   * @returns Validation result
   */
  validateTemplateData(template: TicketTemplate, data: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of template.fields) {
      const value = data[field.key];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type-specific validation
      if (field.type === 'text' || field.type === 'textarea') {
        if (typeof value !== 'string') {
          errors.push(`${field.label} must be a string`);
          continue;
        }

        if (field.validation?.minLength && value.length < field.validation.minLength) {
          errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
        }

        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          errors.push(`${field.label} must be no more than ${field.validation.maxLength} characters`);
        }

        if (field.validation?.pattern && !new RegExp(field.validation.pattern).test(value)) {
          errors.push(`${field.label} format is invalid`);
        }
      }

      if (field.type === 'select' && field.options) {
        if (!field.options.includes(value)) {
          errors.push(`${field.label} must be one of: ${field.options.join(', ')}`);
        }
      }

      if (field.type === 'json') {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            errors.push(`${field.label} must be valid JSON`);
          }
        } else if (typeof value !== 'object') {
          errors.push(`${field.label} must be a valid JSON object or string`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets available template categories
   * @returns Array of category strings
   */
  getCategories(): TicketTemplate['category'][] {
    return ['database', 'api', 'ui', 'performance', 'security', 'general'];
  }

  /**
   * Gets predefined system templates
   * @returns Array of predefined templates
   */
  private getPredefinedTemplates(): TicketTemplate[] {
    return [
      {
        id: 'database-connection-error',
        name: 'Database Connection Error',
        description: 'Template for database connection issues',
        category: 'database',
        isCustom: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        template: {
          title: 'Database Connection Error',
          description: 'Database connection failure in production environment',
          severity: 'high',
          inputData: {},
          outputData: {},
          errorLogs: []
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text',
            required: true,
            placeholder: 'Brief description of the database issue',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            key: 'description',
            label: 'Detailed Description',
            type: 'textarea',
            required: true,
            placeholder: 'Detailed description of the database connection issue...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            key: 'severity',
            label: 'Severity Level',
            type: 'select',
            required: true,
            options: ['low', 'medium', 'high', 'critical'],
            defaultValue: 'high'
          },
          {
            key: 'inputData',
            label: 'Connection Parameters',
            type: 'json',
            required: true,
            placeholder: '{"host": "db.example.com", "port": 5432, "database": "prod_db"}'
          },
          {
            key: 'errorLogs',
            label: 'Error Logs',
            type: 'textarea',
            required: false,
            placeholder: 'Paste relevant error logs here...'
          }
        ]
      },
      {
        id: 'api-timeout-error',
        name: 'API Timeout Error',
        description: 'Template for API timeout and response issues',
        category: 'api',
        isCustom: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        template: {
          title: 'API Timeout Error',
          description: 'API endpoint experiencing timeout issues',
          severity: 'medium',
          inputData: {},
          outputData: {},
          errorLogs: []
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text',
            required: true,
            placeholder: 'API endpoint timeout issue',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            key: 'description',
            label: 'Detailed Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the API timeout issue in detail...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            key: 'severity',
            label: 'Severity Level',
            type: 'select',
            required: true,
            options: ['low', 'medium', 'high', 'critical'],
            defaultValue: 'medium'
          },
          {
            key: 'inputData',
            label: 'API Request Details',
            type: 'json',
            required: true,
            placeholder: '{"endpoint": "/api/users", "method": "GET", "timeout": 30000}'
          },
          {
            key: 'outputData',
            label: 'Expected Response',
            type: 'json',
            required: false,
            placeholder: '{"status": 200, "data": {...}}'
          },
          {
            key: 'errorLogs',
            label: 'Error Logs',
            type: 'textarea',
            required: false,
            placeholder: 'API error logs and stack traces...'
          }
        ]
      },
      {
        id: 'ui-rendering-issue',
        name: 'UI Rendering Issue',
        description: 'Template for user interface rendering problems',
        category: 'ui',
        isCustom: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        template: {
          title: 'UI Rendering Issue',
          description: 'User interface component not rendering correctly',
          severity: 'medium',
          inputData: {},
          outputData: {},
          errorLogs: []
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text',
            required: true,
            placeholder: 'UI component rendering issue',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            key: 'description',
            label: 'Detailed Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the UI rendering issue...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            key: 'severity',
            label: 'Severity Level',
            type: 'select',
            required: true,
            options: ['low', 'medium', 'high', 'critical'],
            defaultValue: 'medium'
          },
          {
            key: 'inputData',
            label: 'Component State/Props',
            type: 'json',
            required: true,
            placeholder: '{"componentName": "UserProfile", "props": {...}, "state": {...}}'
          },
          {
            key: 'outputData',
            label: 'Expected Rendering',
            type: 'text',
            required: false,
            placeholder: 'Description of expected UI behavior'
          },
          {
            key: 'errorLogs',
            label: 'Console Errors',
            type: 'textarea',
            required: false,
            placeholder: 'Browser console errors and warnings...'
          }
        ]
      },
      {
        id: 'performance-slowdown',
        name: 'Performance Slowdown',
        description: 'Template for performance degradation issues',
        category: 'performance',
        isCustom: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        template: {
          title: 'Performance Slowdown',
          description: 'System experiencing performance degradation',
          severity: 'high',
          inputData: {},
          outputData: {},
          errorLogs: []
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text',
            required: true,
            placeholder: 'Performance slowdown in [component/feature]',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            key: 'description',
            label: 'Detailed Description',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the performance issue and its impact...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            key: 'severity',
            label: 'Severity Level',
            type: 'select',
            required: true,
            options: ['low', 'medium', 'high', 'critical'],
            defaultValue: 'high'
          },
          {
            key: 'inputData',
            label: 'Performance Metrics',
            type: 'json',
            required: true,
            placeholder: '{"responseTime": "5000ms", "memoryUsage": "85%", "cpuUsage": "90%"}'
          },
          {
            key: 'outputData',
            label: 'Expected Performance',
            type: 'json',
            required: false,
            placeholder: '{"responseTime": "500ms", "memoryUsage": "60%", "cpuUsage": "40%"}'
          },
          {
            key: 'errorLogs',
            label: 'Performance Logs',
            type: 'textarea',
            required: false,
            placeholder: 'Performance monitoring logs and metrics...'
          }
        ]
      },
      {
        id: 'general-issue',
        name: 'General Issue',
        description: 'Generic template for any production issue',
        category: 'general',
        isCustom: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
        template: {
          title: '',
          description: '',
          severity: 'medium',
          inputData: {},
          outputData: {},
          errorLogs: []
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text',
            required: true,
            placeholder: 'Brief description of the issue',
            validation: { minLength: 5, maxLength: 100 }
          },
          {
            key: 'description',
            label: 'Detailed Description',
            type: 'textarea',
            required: true,
            placeholder: 'Provide a detailed description of the issue...',
            validation: { minLength: 20, maxLength: 1000 }
          },
          {
            key: 'severity',
            label: 'Severity Level',
            type: 'select',
            required: true,
            options: ['low', 'medium', 'high', 'critical'],
            defaultValue: 'medium'
          },
          {
            key: 'inputData',
            label: 'Input Data',
            type: 'json',
            required: true,
            placeholder: 'Input data that caused the issue (JSON format)'
          },
          {
            key: 'outputData',
            label: 'Output Data',
            type: 'json',
            required: false,
            placeholder: 'Expected or actual output data (JSON format)'
          },
          {
            key: 'errorLogs',
            label: 'Error Logs',
            type: 'textarea',
            required: false,
            placeholder: 'Relevant error logs, stack traces, or diagnostic information...'
          }
        ]
      }
    ];
  }

  /**
   * Gets custom templates from storage
   * @returns Array of custom templates
   */
  private getCustomTemplates(): TicketTemplate[] {
    try {
      const stored = localStorage.getItem(this.CUSTOM_TEMPLATES_KEY);
      if (!stored) return [];
      
      const templates = JSON.parse(stored);
      return templates.map((template: any) => ({
        ...template,
        createdAt: new Date(template.createdAt),
        updatedAt: new Date(template.updatedAt)
      }));
    } catch (error) {
      console.error('Error loading custom templates from storage:', error);
      return [];
    }
  }

  /**
   * Saves custom templates to storage
   * @param templates Array of custom templates to save
   */
  private saveCustomTemplates(templates: TicketTemplate[]): void {
    try {
      localStorage.setItem(this.CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
    } catch (error) {
      throw new Error(`Failed to save custom templates to storage: ${error}`);
    }
  }

  /**
   * Generates a unique template ID
   * @returns Unique template ID
   */
  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}