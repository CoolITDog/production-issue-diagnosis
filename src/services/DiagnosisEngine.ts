import {
  ProductionTicket,
  CodeProject,
  DiagnosisResult,
  DiagnosisSession,
  AnalysisContext,
  ProjectContext,
  CodeSnippet,
  Solution,
  ContextOptimizer,
} from '../types';

import { AIIntegrationService, DiagnosisOptions } from './AIIntegrationService';
import { DataFormatConverter, createDataFormatConverter } from './DataFormatConverter';
import { createContextOptimizer } from './ContextOptimizer';

export interface DiagnosisEngineConfig {
  aiIntegrationService: AIIntegrationService;
  dataConverter?: DataFormatConverter;
  contextOptimizer?: ContextOptimizer;
  defaultOptions?: DiagnosisOptions;
}

export interface DiagnosisRequest {
  ticket: ProductionTicket;
  project: CodeProject;
  options?: DiagnosisOptions;
}

export interface DiagnosisProgress {
  sessionId: string;
  stage: 'initializing' | 'analyzing_code' | 'optimizing_context' | 'ai_analysis' | 'generating_solutions' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  timestamp: Date;
}

export type DiagnosisProgressCallback = (progress: DiagnosisProgress) => void;

/**
 * Core diagnosis engine that orchestrates the problem analysis process
 * Integrates ticket information, code analysis, and AI model analysis
 */
export class DiagnosisEngine {
  private aiService: AIIntegrationService;
  private dataConverter: DataFormatConverter;
  private contextOptimizer: ContextOptimizer;
  private defaultOptions: DiagnosisOptions;
  private activeSessions: Map<string, DiagnosisSession> = new Map();

  constructor(config: DiagnosisEngineConfig) {
    this.aiService = config.aiIntegrationService;
    this.dataConverter = config.dataConverter || createDataFormatConverter();
    this.contextOptimizer = config.contextOptimizer || createContextOptimizer();
    this.defaultOptions = {
      includeCodeExplanation: true,
      includeSolutions: true,
      maxCodeSnippets: 10,
      priorityThreshold: 0.5,
      ...config.defaultOptions,
    };
  }

  /**
   * Start a new diagnosis session
   */
  async startDiagnosis(
    request: DiagnosisRequest,
    progressCallback?: DiagnosisProgressCallback
  ): Promise<DiagnosisSession> {
    const sessionId = this.generateSessionId();
    const session: DiagnosisSession = {
      id: sessionId,
      ticketId: request.ticket.id,
      projectId: request.project.id,
      startTime: new Date(),
      status: 'running',
      aiModel: 'gpt-3.5-turbo', // Will be updated by AI service
      tokensUsed: 0,
    };

    this.activeSessions.set(sessionId, session);

    try {
      // Stage 1: Initialize and validate inputs
      this.reportProgress(sessionId, 'initializing', 10, 'Initializing diagnosis...', progressCallback);
      await this.validateDiagnosisRequest(request);

      // Stage 2: Analyze code and build context
      this.reportProgress(sessionId, 'analyzing_code', 25, 'Analyzing code structure...', progressCallback);
      const projectContext = await this.buildProjectContext(request.project);

      // Stage 3: Optimize context for AI analysis
      this.reportProgress(sessionId, 'optimizing_context', 40, 'Selecting relevant code...', progressCallback);
      const relevantCode = await this.selectRelevantCode(request.ticket, request.project);

      // Stage 4: Perform AI analysis
      this.reportProgress(sessionId, 'ai_analysis', 60, 'Analyzing issue with AI...', progressCallback);
      const analysisContext: AnalysisContext = {
        ticket: request.ticket,
        relevantCode,
        projectContext,
      };

      const diagnosis = await this.performAIAnalysis(analysisContext, request.options);

      // Stage 5: Generate additional solutions if needed
      if (request.options?.includeSolutions !== false) {
        this.reportProgress(sessionId, 'generating_solutions', 80, 'Generating solutions...', progressCallback);
        const additionalSolutions = await this.generateSolutions(diagnosis);
        diagnosis.suggestedActions.push(...this.convertSolutionsToActions(additionalSolutions));
      }

      // Stage 6: Complete diagnosis
      this.reportProgress(sessionId, 'completed', 100, 'Diagnosis completed successfully', progressCallback);
      
      session.result = diagnosis;
      session.status = 'completed';
      session.endTime = new Date();

      return session;
    } catch (error) {
      session.status = 'failed';
      session.endTime = new Date();
      
      this.reportProgress(sessionId, 'failed', 0, `Diagnosis failed: ${error instanceof Error ? error.message : String(error)}`, progressCallback);
      
      throw error;
    } finally {
      // Keep session in memory for a while for result retrieval
      setTimeout(() => {
        this.activeSessions.delete(sessionId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Get diagnosis session by ID
   */
  getSession(sessionId: string): DiagnosisSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): DiagnosisSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Cancel a running diagnosis session
   */
  cancelSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (session && session.status === 'running') {
      session.status = 'failed';
      session.endTime = new Date();
      return true;
    }
    return false;
  }

  /**
   * Test AI connection and engine readiness
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.aiService.testConnection();
    } catch (error) {
      console.error('Diagnosis engine connection test failed:', error);
      return false;
    }
  }

  /**
   * Update engine configuration
   */
  updateConfig(newConfig: Partial<DiagnosisEngineConfig>): void {
    if (newConfig.defaultOptions) {
      this.defaultOptions = { ...this.defaultOptions, ...newConfig.defaultOptions };
    }
    
    if (newConfig.aiIntegrationService) {
      this.aiService = newConfig.aiIntegrationService;
    }
    
    if (newConfig.dataConverter) {
      this.dataConverter = newConfig.dataConverter;
    }
    
    if (newConfig.contextOptimizer) {
      this.contextOptimizer = newConfig.contextOptimizer;
    }
  }

  /**
   * Get engine statistics
   */
  getStatistics(): {
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    averageProcessingTime: number;
  } {
    const sessions = Array.from(this.activeSessions.values());
    const completed = sessions.filter(s => s.status === 'completed');
    const failed = sessions.filter(s => s.status === 'failed');
    
    const averageTime = completed.length > 0
      ? completed.reduce((sum, s) => {
          const duration = s.endTime && s.startTime 
            ? s.endTime.getTime() - s.startTime.getTime()
            : 0;
          return sum + duration;
        }, 0) / completed.length
      : 0;

    return {
      activeSessions: sessions.filter(s => s.status === 'running').length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      averageProcessingTime: averageTime,
    };
  }

  /**
   * Validate diagnosis request inputs
   */
  private async validateDiagnosisRequest(request: DiagnosisRequest): Promise<void> {
    if (!request.ticket) {
      throw new Error('Production ticket is required for diagnosis');
    }

    if (!request.project) {
      throw new Error('Code project is required for diagnosis');
    }

    if (!request.ticket.title || !request.ticket.description) {
      throw new Error('Ticket must have title and description');
    }

    if (request.project.files.length === 0) {
      throw new Error('Project must contain at least one code file');
    }

    // Validate AI service is ready
    const isReady = await this.aiService.testConnection();
    if (!isReady) {
      throw new Error('AI service is not available');
    }
  }

  /**
   * Build project context for analysis
   */
  private async buildProjectContext(project: CodeProject): Promise<ProjectContext> {
    return this.dataConverter.convertProjectToContext(project);
  }

  /**
   * Select relevant code snippets for analysis
   */
  private async selectRelevantCode(
    ticket: ProductionTicket,
    project: CodeProject
  ): Promise<CodeSnippet[]> {
    return this.contextOptimizer.selectRelevantCode(ticket, project);
  }

  /**
   * Perform AI analysis with the prepared context
   */
  private async performAIAnalysis(
    context: AnalysisContext,
    options?: DiagnosisOptions
  ): Promise<DiagnosisResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Use AI integration service for analysis
      const session = await this.aiService.diagnoseIssue(
        context.ticket,
        { 
          id: context.projectContext.name,
          name: context.projectContext.name,
          source: 'upload' as const,
          uploadTime: new Date(),
          files: [], // Will be populated from context
          structure: context.projectContext.structure,
          totalSize: 0,
          languages: context.projectContext.languages,
        },
        mergedOptions
      );

      if (!session.result) {
        throw new Error('AI analysis did not produce results');
      }

      return session.result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AIError') {
        throw error;
      }
      
      throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate additional solutions based on diagnosis
   */
  private async generateSolutions(diagnosis: DiagnosisResult): Promise<Solution[]> {
    try {
      return await this.aiService.getSolutions(diagnosis);
    } catch (error) {
      console.warn('Failed to generate additional solutions:', error);
      return [];
    }
  }

  /**
   * Convert solutions to actions format
   */
  private convertSolutionsToActions(solutions: Solution[]): any[] {
    return solutions.map(solution => ({
      title: solution.title,
      description: solution.description,
      priority: solution.priority,
      type: 'code_fix' as const,
      steps: solution.steps,
    }));
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    sessionId: string,
    stage: DiagnosisProgress['stage'],
    progress: number,
    message: string,
    callback?: DiagnosisProgressCallback
  ): void {
    if (callback) {
      callback({
        sessionId,
        stage,
        progress,
        message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Factory function to create diagnosis engine
 */
export function createDiagnosisEngine(config: DiagnosisEngineConfig): DiagnosisEngine {
  return new DiagnosisEngine(config);
}

/**
 * Helper function to create engine with default configuration
 */
export function createDefaultDiagnosisEngine(aiService: AIIntegrationService): DiagnosisEngine {
  return new DiagnosisEngine({
    aiIntegrationService: aiService,
    defaultOptions: {
      includeCodeExplanation: true,
      includeSolutions: true,
      maxCodeSnippets: 8,
      priorityThreshold: 0.6,
    },
  });
}