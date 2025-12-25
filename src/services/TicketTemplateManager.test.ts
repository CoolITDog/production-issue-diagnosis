import { TicketTemplateManager, TicketTemplate } from './TicketTemplateManager';

/**
 * Unit tests for TicketTemplateManager
 * Tests template management and ticket creation functionality
 */

describe('TicketTemplateManager Tests', () => {
  let templateManager: TicketTemplateManager;

  beforeEach(() => {
    templateManager = new TicketTemplateManager();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  describe('Template Retrieval', () => {
    it('should return predefined templates', () => {
      const templates = templateManager.getAllTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for specific predefined templates
      const databaseTemplate = templates.find(t => t.id === 'database-connection-error');
      const apiTemplate = templates.find(t => t.id === 'api-timeout-error');
      const uiTemplate = templates.find(t => t.id === 'ui-rendering-issue');
      const performanceTemplate = templates.find(t => t.id === 'performance-slowdown');
      const generalTemplate = templates.find(t => t.id === 'general-issue');
      
      expect(databaseTemplate).toBeDefined();
      expect(apiTemplate).toBeDefined();
      expect(uiTemplate).toBeDefined();
      expect(performanceTemplate).toBeDefined();
      expect(generalTemplate).toBeDefined();
      
      // Verify template structure
      expect(databaseTemplate!.name).toBe('Database Connection Error');
      expect(databaseTemplate!.category).toBe('database');
      expect(databaseTemplate!.isCustom).toBe(false);
      expect(databaseTemplate!.fields.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', () => {
      const databaseTemplates = templateManager.getTemplatesByCategory('database');
      const apiTemplates = templateManager.getTemplatesByCategory('api');
      const uiTemplates = templateManager.getTemplatesByCategory('ui');
      
      expect(databaseTemplates.length).toBeGreaterThan(0);
      expect(apiTemplates.length).toBeGreaterThan(0);
      expect(uiTemplates.length).toBeGreaterThan(0);
      
      // Verify all returned templates are in the correct category
      databaseTemplates.forEach(template => {
        expect(template.category).toBe('database');
      });
      
      apiTemplates.forEach(template => {
        expect(template.category).toBe('api');
      });
    });

    it('should get specific template by ID', () => {
      const template = templateManager.getTemplate('database-connection-error');
      
      expect(template).not.toBeNull();
      expect(template!.id).toBe('database-connection-error');
      expect(template!.name).toBe('Database Connection Error');
      expect(template!.category).toBe('database');
    });

    it('should return null for non-existent template', () => {
      const template = templateManager.getTemplate('non-existent-template');
      
      expect(template).toBeNull();
    });
  });

  describe('Ticket Creation from Templates', () => {
    it('should create ticket from database template', () => {
      const customData = {
        title: 'Production DB Connection Failed',
        description: 'Unable to connect to production database server',
        inputData: { host: 'prod-db.example.com', port: 5432 },
        errorLogs: 'Connection timeout after 30 seconds'
      };
      
      const ticket = templateManager.createTicketFromTemplate('database-connection-error', customData);
      
      expect(ticket.title).toBe(customData.title);
      expect(ticket.description).toBe(customData.description);
      expect(ticket.severity).toBe('high'); // Default from template
      expect(ticket.status).toBe('draft');
      expect(ticket.timestamp).toBeInstanceOf(Date);
      expect(ticket.inputData).toEqual(customData.inputData);
      expect(ticket.errorLogs).toBe(customData.errorLogs);
    });

    it('should create ticket from API template with defaults', () => {
      const customData = {
        title: 'API Endpoint Timeout',
        description: 'User API endpoint timing out consistently',
        inputData: { endpoint: '/api/users', method: 'GET' }
      };
      
      const ticket = templateManager.createTicketFromTemplate('api-timeout-error', customData);
      
      expect(ticket.title).toBe(customData.title);
      expect(ticket.description).toBe(customData.description);
      expect(ticket.severity).toBe('medium'); // Default from template
      expect(ticket.inputData).toEqual(customData.inputData);
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        templateManager.createTicketFromTemplate('non-existent-template', {});
      }).toThrow('Template with ID non-existent-template not found');
    });

    it('should use template defaults when custom data is not provided', () => {
      const ticket = templateManager.createTicketFromTemplate('performance-slowdown', {
        title: 'Slow Response Times',
        description: 'Application response times have increased significantly'
      });
      
      expect(ticket.title).toBe('Slow Response Times');
      expect(ticket.description).toBe('Application response times have increased significantly');
      expect(ticket.severity).toBe('high'); // Template default
      expect(ticket.status).toBe('draft');
    });
  });

  describe('Custom Template Management', () => {
    it('should create custom template', () => {
      const templateData = {
        name: 'Custom Security Issue',
        description: 'Template for security-related issues',
        category: 'security' as const,
        template: {
          title: 'Security Issue',
          description: 'Security vulnerability detected',
          severity: 'critical' as const,
          inputData: {},
          outputData: {}
        },
        fields: [
          {
            key: 'title',
            label: 'Issue Title',
            type: 'text' as const,
            required: true
          },
          {
            key: 'description',
            label: 'Description',
            type: 'textarea' as const,
            required: true
          }
        ]
      };
      
      const templateId = templateManager.createCustomTemplate(templateData);
      
      expect(templateId).toBeDefined();
      expect(typeof templateId).toBe('string');
      expect(templateId.length).toBeGreaterThan(0);
      
      // Verify template was created
      const createdTemplate = templateManager.getTemplate(templateId);
      expect(createdTemplate).not.toBeNull();
      expect(createdTemplate!.name).toBe(templateData.name);
      expect(createdTemplate!.category).toBe(templateData.category);
      expect(createdTemplate!.isCustom).toBe(true);
      expect(createdTemplate!.createdAt).toBeInstanceOf(Date);
      expect(createdTemplate!.updatedAt).toBeInstanceOf(Date);
    });

    it('should update custom template', () => {
      // Create a custom template first
      const templateData = {
        name: 'Test Template',
        description: 'Test description',
        category: 'general' as const,
        template: { title: 'Test', description: 'Test', severity: 'low' as const, inputData: {}, outputData: {} },
        fields: []
      };
      
      const templateId = templateManager.createCustomTemplate(templateData);
      
      // Update the template
      const updates = {
        name: 'Updated Test Template',
        description: 'Updated description'
      };
      
      templateManager.updateCustomTemplate(templateId, updates);
      
      // Verify update
      const updatedTemplate = templateManager.getTemplate(templateId);
      expect(updatedTemplate!.name).toBe(updates.name);
      expect(updatedTemplate!.description).toBe(updates.description);
      expect(updatedTemplate!.updatedAt.getTime()).toBeGreaterThan(updatedTemplate!.createdAt.getTime());
    });

    it('should delete custom template', () => {
      // Create a custom template first
      const templateData = {
        name: 'Template to Delete',
        description: 'This template will be deleted',
        category: 'general' as const,
        template: { title: 'Test', description: 'Test', severity: 'low' as const, inputData: {}, outputData: {} },
        fields: []
      };
      
      const templateId = templateManager.createCustomTemplate(templateData);
      
      // Verify template exists
      expect(templateManager.getTemplate(templateId)).not.toBeNull();
      
      // Delete the template
      templateManager.deleteCustomTemplate(templateId);
      
      // Verify template is deleted
      expect(templateManager.getTemplate(templateId)).toBeNull();
    });

    it('should throw error when updating non-existent custom template', () => {
      expect(() => {
        templateManager.updateCustomTemplate('non-existent-id', { name: 'Updated' });
      }).toThrow('Custom template with ID non-existent-id not found');
    });

    it('should throw error when deleting non-existent custom template', () => {
      expect(() => {
        templateManager.deleteCustomTemplate('non-existent-id');
      }).toThrow('Custom template with ID non-existent-id not found');
    });
  });

  describe('Template Data Validation', () => {
    it('should validate required fields', () => {
      const template = templateManager.getTemplate('database-connection-error')!;
      
      // Missing required fields
      const invalidData = {
        severity: 'high'
        // Missing title, description, inputData
      };
      
      const validation = templateManager.validateTemplateData(template, invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('Issue Title'))).toBe(true);
      expect(validation.errors.some(error => error.includes('Detailed Description'))).toBe(true);
      expect(validation.errors.some(error => error.includes('Connection Parameters'))).toBe(true);
    });

    it('should validate field types and constraints', () => {
      const template = templateManager.getTemplate('database-connection-error')!;
      
      const invalidData = {
        title: 'DB', // Too short (min 5 chars)
        description: 'Short desc', // Too short (min 20 chars)
        severity: 'invalid-severity', // Invalid option
        inputData: 'invalid-json{', // Invalid JSON
      };
      
      const validation = templateManager.validateTemplateData(template, invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('at least 5 characters'))).toBe(true);
      expect(validation.errors.some(error => error.includes('at least 20 characters'))).toBe(true);
      expect(validation.errors.some(error => error.includes('must be one of'))).toBe(true);
      expect(validation.errors.some(error => error.includes('valid JSON'))).toBe(true);
    });

    it('should pass validation for valid data', () => {
      const template = templateManager.getTemplate('database-connection-error')!;
      
      const validData = {
        title: 'Database Connection Issue',
        description: 'The production database is not responding to connection attempts',
        severity: 'high',
        inputData: { host: 'db.example.com', port: 5432 },
        errorLogs: 'Connection timeout error logs...'
      };
      
      const validation = templateManager.validateTemplateData(template, validData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle optional fields correctly', () => {
      const template = templateManager.getTemplate('database-connection-error')!;
      
      const dataWithoutOptionalFields = {
        title: 'Database Connection Issue',
        description: 'The production database is not responding to connection attempts',
        severity: 'high',
        inputData: { host: 'db.example.com', port: 5432 }
        // errorLogs is optional and not provided
      };
      
      const validation = templateManager.validateTemplateData(template, dataWithoutOptionalFields);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Categories and Utilities', () => {
    it('should return available categories', () => {
      const categories = templateManager.getCategories();
      
      expect(categories).toContain('database');
      expect(categories).toContain('api');
      expect(categories).toContain('ui');
      expect(categories).toContain('performance');
      expect(categories).toContain('security');
      expect(categories).toContain('general');
    });

    it('should include custom templates in category filtering', () => {
      // Create a custom security template
      const customTemplate = {
        name: 'Custom Security Template',
        description: 'Custom security issue template',
        category: 'security' as const,
        template: { title: 'Security Issue', description: 'Security problem', severity: 'critical' as const, inputData: {}, outputData: {} },
        fields: []
      };
      
      templateManager.createCustomTemplate(customTemplate);
      
      const securityTemplates = templateManager.getTemplatesByCategory('security');
      
      expect(securityTemplates.length).toBeGreaterThan(0);
      expect(securityTemplates.some(t => t.name === 'Custom Security Template')).toBe(true);
      expect(securityTemplates.some(t => t.isCustom === true)).toBe(true);
    });
  });

  describe('Storage Persistence', () => {
    it('should persist custom templates across instances', () => {
      // Create custom template with first instance
      const templateData = {
        name: 'Persistent Template',
        description: 'This should persist',
        category: 'general' as const,
        template: { title: 'Test', description: 'Test', severity: 'medium' as const, inputData: {}, outputData: {} },
        fields: []
      };
      
      const templateId = templateManager.createCustomTemplate(templateData);
      
      // Create new instance (simulating page reload)
      const newTemplateManager = new TicketTemplateManager();
      
      // Verify template persists
      const persistedTemplate = newTemplateManager.getTemplate(templateId);
      expect(persistedTemplate).not.toBeNull();
      expect(persistedTemplate!.name).toBe(templateData.name);
      expect(persistedTemplate!.isCustom).toBe(true);
    });

    it('should handle corrupted storage gracefully', () => {
      // Set corrupted data in localStorage
      localStorage.setItem('custom_ticket_templates', 'invalid json');
      
      // Should not crash and return empty array
      const templates = templateManager.getAllTemplates();
      
      // Should still have predefined templates
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => !t.isCustom)).toBe(true);
    });
  });
});