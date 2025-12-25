import {
  AIModelClient,
  ContextOptimizer,
  ProductionTicket,
  CodeProject,
  DiagnosisResult,
  Solution,
  AnalysisContext,
  DiagnosisSession,
  AIError,
} from '../types';

import { createAIModelClient, AIConfigManager, AIModelConfig } from './AIModelClient';
import { createContextOptimizer } from './ContextOptimizer';
import { DataFormatConverter, createDataFormatConverter } from './DataFormatConverter';

export interface AIIntegrationConfig {
  aiModel: AIModelConfig;
  maxTokens?: number;
  enableContextOptimization?: boolean;
  enableDataFormatting?: boolean;
}

export interface DiagnosisOptions {
  includeCodeExplanation?: boolean;
  includeSolutions?: boolean;
  maxCodeSnippets?: number;
  priorityThreshold?: number;
}

export class AIIntegrationService {
  private aiClient: AIModelClient;
  private contextOptimizer: ContextOptimizer;
  private dataConverter: DataFormatConverter;
  private config: AIIntegrationConfig;

  constructor(config: AIIntegrationConfig) {
    this.config = {
      maxTokens: 4000,
      enableContextOptimization: true,
      enableDataFormatting: true,
      ...config,
    };

    this.aiClient = createAIModelClient(config.aiModel);
    this.contextOptimizer = createContextOptimizer();
    this.dataConverter = createDataFormatConverter();
  }

  /**
   * Perform complete issue diagnosis with AI analysis
   */
  async diagnoseIssue(
    ticket: ProductionTicket,
    project: CodeProject,
    options: DiagnosisOptions = {}
  ): Promise<DiagnosisSession> {
    const session: DiagnosisSession = {
      id: this.generateSessionId(),
      ticketId: ticket.id,
      projectId: project.id,
      startTime: new Date(),
      status: 'running',
      aiModel: this.config.aiModel.model || 'gpt-3.5-turbo',
      tokensUsed: 0,
    };

    try {
      // Step 1: Build analysis context
      const context = await this.buildAnalysisContext(ticket, project, options);
      
      // Step 2: Perform AI analysis
      const diagnosis = await this.aiClient.analyzeIssue(context);
      
      // Step 3: Generate additional solutions if requested
      if (options.includeSolutions) {
        const solutions = await this.aiClient.suggestSolutions(diagnosis);
        diagnosis.suggestedActions = [
          ...diagnosis.suggestedActions,
          ...solutions.map(sol => ({
            title: sol.title,
            description: sol.description,
            priority: sol.priority,
            type: 'code_fix' as const,
          })),
        ];
      }

      // Step 4: Add code explanations if requested
      if (options.includeCodeExplanation && context.relevantCode.length > 0) {
        const explanations = await this.generateCodeExplanations(context.relevantCode);
        diagnosis.reasoning += '\n\n## Code Analysis:\n' + explanations.join('\n\n');
      }

      session.result = diagnosis;
      session.status = 'completed';
      session.endTime = new Date();
      
      return session;
    } catch (error) {
      session.status = 'failed';
      session.endTime = new Date();
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error(`Diagnosis failed: ${String(error)}`);
    }
  }

  /**
   * Test AI model connection and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.aiClient.testConnection();
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  /**
   * Generate code explanation for specific code snippets
   */
  async explainCode(code: string, language: string): Promise<string> {
    try {
      return await this.aiClient.generateCodeExplanation(code, language);
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Get suggested solutions for a diagnosis
   */
  async getSolutions(diagnosis: DiagnosisResult): Promise<Solution[]> {
    try {
      return await this.aiClient.suggestSolutions(diagnosis);
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Update AI model configuration
   */
  updateConfig(newConfig: Partial<AIIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.aiModel) {
      this.aiClient = createAIModelClient({ ...this.config.aiModel, ...newConfig.aiModel });
    }
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AIIntegrationConfig, 'aiModel'> & { aiModel: Omit<AIModelConfig, 'apiKey'> } {
    const { aiModel, ...otherConfig } = this.config;
    const { apiKey, ...safeAiConfig } = aiModel;
    
    return {
      ...otherConfig,
      aiModel: safeAiConfig,
    };
  }

  /**
   * Build analysis context with optimized code selection
   */
  private async buildAnalysisContext(
    ticket: ProductionTicket,
    project: CodeProject,
    options: DiagnosisOptions
  ): Promise<AnalysisContext> {
    // Convert project to context format
    const projectContext = this.dataConverter.convertProjectToContext(project);
    
    // Select relevant code snippets
    let relevantCode = await this.contextOptimizer.selectRelevantCode(ticket, project);
    
    // Apply options filters
    if (options.maxCodeSnippets && relevantCode.length > options.maxCodeSnippets) {
      relevantCode = relevantCode.slice(0, options.maxCodeSnippets);
    }
    
    // Prioritize code sections
    relevantCode = await this.contextOptimizer.prioritizeCodeSections(relevantCode, ticket);
    
    return {
      ticket,
      relevantCode,
      projectContext,
    };
  }

  /**
   * Generate explanations for multiple code snippets
   */
  private async generateCodeExplanations(codeSnippets: any[]): Promise<string[]> {
    const explanations: string[] = [];
    
    for (const snippet of codeSnippets.slice(0, 3)) { // Limit to 3 explanations
      try {
        const explanation = await this.aiClient.generateCodeExplanation(
          snippet.content,
          snippet.language
        );
        explanations.push(`**${snippet.fileName}** (lines ${snippet.startLine}-${snippet.endLine}):\n${explanation}`);
      } catch (error) {
        console.warn(`Failed to explain code snippet ${snippet.fileName}:`, error);
        explanations.push(`**${snippet.fileName}**: Code explanation unavailable`);
      }
    }
    
    return explanations;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Handle AI-specific errors
   */
  private handleAIError(error: any): AIError {
    if (error.name === 'AIError') {
      return error as AIError;
    }
    
    const aiError = new Error(error.message || 'Unknown AI error') as AIError;
    aiError.name = 'AIError';
    aiError.type = 'network_timeout';
    
    return aiError;
  }
}

/**
 * Factory function to create AI integration service
 */
export function createAIIntegrationService(config: AIIntegrationConfig): AIIntegrationService {
  return new AIIntegrationService(config);
}

/**
 * Helper function to create service from stored configuration
 */
export function createAIIntegrationServiceFromStorage(apiKey: string): AIIntegrationService | null {
  const storedConfig = AIConfigManager.loadConfig();
  if (!storedConfig) {
    return null;
  }

  const config: AIIntegrationConfig = {
    aiModel: {
      ...storedConfig,
      apiKey,
    },
  };

  return createAIIntegrationService(config);
}

/**
 * Configuration validation helper
 */
export function validateAIConfig(config: AIIntegrationConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.aiModel) {
    errors.push('AI model configuration is required');
  } else {
    if (!config.aiModel.apiKey) {
      errors.push('API key is required');
    }
    
    if (!config.aiModel.model) {
      errors.push('Model name is required');
    }
    
    if (config.aiModel.maxTokens && config.aiModel.maxTokens < 100) {
      errors.push('Max tokens must be at least 100');
    }
    
    if (config.aiModel.temperature && (config.aiModel.temperature < 0 || config.aiModel.temperature > 2)) {
      errors.push('Temperature must be between 0 and 2');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Default configuration for common AI models
 */
export const DEFAULT_AI_CONFIGS = {
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    maxTokens: 4000,
    temperature: 0.7,
  },
  'gpt-4': {
    model: 'gpt-4',
    maxTokens: 8000,
    temperature: 0.7,
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo-preview',
    maxTokens: 4000,
    temperature: 0.7,
  },
} as const;