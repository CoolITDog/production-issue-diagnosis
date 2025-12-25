import {
  DiagnosisResult,
  DiagnosisSession,
  Solution,
  Cause,
  Action,
  CodeSnippet,
} from '../types';

export interface ProcessedDiagnosisResult {
  session: DiagnosisSession;
  formattedResult: FormattedDiagnosisResult;
  displayData: DiagnosisDisplayData;
  exportData: DiagnosisExportData;
}

export interface FormattedDiagnosisResult {
  summary: DiagnosisSummary;
  causes: FormattedCause[];
  solutions: FormattedSolution[];
  codeAnalysis: FormattedCodeAnalysis;
  recommendations: FormattedRecommendation[];
  metadata: DiagnosisMetadata;
}

export interface DiagnosisSummary {
  title: string;
  confidence: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  primaryCause: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedResolutionTime: string;
  impactAssessment: string;
}

export interface FormattedCause {
  id: string;
  description: string;
  probability: number;
  probabilityLevel: 'low' | 'medium' | 'high';
  category: 'code' | 'data' | 'configuration' | 'infrastructure' | 'external';
  relatedCode: CodeReference[];
  evidence: string[];
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface FormattedSolution {
  id: string;
  title: string;
  description: string;
  steps: FormattedStep[];
  priority: 'low' | 'medium' | 'high';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: string;
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
  relatedCauses: string[];
  codeChanges: CodeChangePreview[];
}

export interface FormattedStep {
  stepNumber: number;
  title: string;
  description: string;
  type: 'investigation' | 'code_change' | 'configuration' | 'testing' | 'deployment';
  estimatedTime: string;
  codeSnippet?: string;
  commands?: string[];
  notes?: string[];
}

export interface FormattedCodeAnalysis {
  affectedFiles: string[];
  codeQualityIssues: CodeQualityIssue[];
  performanceIssues: PerformanceIssue[];
  securityConcerns: SecurityConcern[];
  bestPracticeViolations: BestPracticeViolation[];
}

export interface FormattedRecommendation {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term';
  category: 'monitoring' | 'testing' | 'architecture' | 'process' | 'documentation';
  title: string;
  description: string;
  benefits: string[];
  effort: 'low' | 'medium' | 'high';
}

export interface DiagnosisDisplayData {
  charts: ChartData[];
  timeline: TimelineData[];
  codeHighlights: CodeHighlight[];
  metrics: MetricData[];
  alerts: AlertData[];
}

export interface DiagnosisExportData {
  markdown: string;
  json: string;
  pdf?: string;
  summary: string;
}

export interface CodeReference {
  fileName: string;
  startLine: number;
  endLine: number;
  snippet: string;
  relevance: number;
}

export interface CodeChangePreview {
  fileName: string;
  changeType: 'add' | 'modify' | 'delete';
  before?: string;
  after?: string;
  description: string;
}

export interface CodeQualityIssue {
  type: 'complexity' | 'duplication' | 'naming' | 'structure';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: CodeReference;
  suggestion: string;
}

export interface PerformanceIssue {
  type: 'algorithm' | 'database' | 'memory' | 'network';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: CodeReference;
  impact: string;
  suggestion: string;
}

export interface SecurityConcern {
  type: 'injection' | 'authentication' | 'authorization' | 'data_exposure' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: CodeReference;
  risk: string;
  mitigation: string;
}

export interface BestPracticeViolation {
  type: 'error_handling' | 'logging' | 'testing' | 'documentation' | 'architecture';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location: CodeReference;
  recommendation: string;
}

export interface ChartData {
  type: 'pie' | 'bar' | 'line' | 'scatter';
  title: string;
  data: any[];
  labels: string[];
  colors?: string[];
}

export interface TimelineData {
  timestamp: Date;
  event: string;
  type: 'error' | 'warning' | 'info' | 'success';
  description: string;
  relatedCode?: CodeReference;
}

export interface CodeHighlight {
  fileName: string;
  startLine: number;
  endLine: number;
  type: 'error' | 'warning' | 'info' | 'suggestion';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface MetricData {
  name: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  description: string;
}

export interface AlertData {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  actions?: string[];
  dismissible: boolean;
}

export interface DiagnosisMetadata {
  processingTime: number;
  aiModel: string;
  tokensUsed: number;
  confidence: number;
  timestamp: Date;
  version: string;
}

/**
 * Service for processing and formatting diagnosis results for display
 */
export class DiagnosisResultProcessor {
  private readonly version = '1.0.0';

  /**
   * Process raw diagnosis result into formatted display data
   */
  async processResult(session: DiagnosisSession): Promise<ProcessedDiagnosisResult> {
    if (!session.result) {
      throw new Error('Session does not contain diagnosis result');
    }

    const formattedResult = await this.formatDiagnosisResult(session.result, session);
    const displayData = await this.generateDisplayData(formattedResult, session);
    const exportData = await this.generateExportData(formattedResult, session);

    return {
      session,
      formattedResult,
      displayData,
      exportData,
    };
  }

  /**
   * Format diagnosis result with enhanced structure and metadata
   */
  private async formatDiagnosisResult(
    result: DiagnosisResult,
    session: DiagnosisSession
  ): Promise<FormattedDiagnosisResult> {
    const summary = this.generateSummary(result, session);
    const causes = this.formatCauses(result.possibleCauses);
    const solutions = this.formatSolutions(result.suggestedActions);
    const codeAnalysis = this.analyzeCodeIssues(result);
    const recommendations = this.generateRecommendations(result, session);
    const metadata = this.generateMetadata(session);

    return {
      summary,
      causes,
      solutions,
      codeAnalysis,
      recommendations,
      metadata,
    };
  }

  /**
   * Generate diagnosis summary
   */
  private generateSummary(result: DiagnosisResult, session: DiagnosisSession): DiagnosisSummary {
    const primaryCause = result.possibleCauses.length > 0
      ? result.possibleCauses[0].description
      : 'Unable to determine primary cause';

    const confidenceLevel = this.getConfidenceLevel(result.confidence);
    const urgency = this.determineUrgency(result);
    const estimatedTime = this.estimateResolutionTime(result);
    const impact = this.assessImpact(result);

    return {
      title: `Diagnosis for Session ${session.id}`,
      confidence: result.confidence,
      confidenceLevel,
      primaryCause,
      urgency,
      estimatedResolutionTime: estimatedTime,
      impactAssessment: impact,
    };
  }

  /**
   * Format causes with enhanced metadata
   */
  private formatCauses(causes: Cause[]): FormattedCause[] {
    return causes.map((cause, index) => ({
      id: `cause_${index + 1}`,
      description: cause.description,
      probability: cause.probability || cause.likelihood,
      probabilityLevel: this.getProbabilityLevel(cause.probability || cause.likelihood),
      category: this.categorizeCause(cause.description),
      relatedCode: this.extractCodeReferences(cause.relatedCode || []),
      evidence: this.extractEvidence(cause.description),
      impact: this.assessCauseImpact(cause),
    }));
  }

  /**
   * Format solutions with detailed steps
   */
  private formatSolutions(actions: Action[]): FormattedSolution[] {
    return actions.map((action, index) => ({
      id: `solution_${index + 1}`,
      title: this.extractSolutionTitle(action.description),
      description: action.description,
      steps: this.generateSolutionSteps(action),
      priority: action.priority,
      complexity: this.assessComplexity(action),
      estimatedTime: this.estimateSolutionTime(action),
      riskLevel: this.assessRiskLevel(action),
      prerequisites: this.extractPrerequisites(action),
      relatedCauses: [],
      codeChanges: this.generateCodeChanges(action),
    }));
  }

  /**
   * Analyze code issues from diagnosis
   */
  private analyzeCodeIssues(result: DiagnosisResult): FormattedCodeAnalysis {
    const affectedFiles = this.extractAffectedFiles(result);
    const codeQualityIssues = this.identifyCodeQualityIssues(result);
    const performanceIssues = this.identifyPerformanceIssues(result);
    const securityConcerns = this.identifySecurityConcerns(result);
    const bestPracticeViolations = this.identifyBestPracticeViolations(result);

    return {
      affectedFiles,
      codeQualityIssues,
      performanceIssues,
      securityConcerns,
      bestPracticeViolations,
    };
  }

  /**
   * Generate recommendations for improvement
   */
  private generateRecommendations(
    result: DiagnosisResult,
    session: DiagnosisSession
  ): FormattedRecommendation[] {
    const recommendations: FormattedRecommendation[] = [];

    // Immediate recommendations
    recommendations.push({
      id: 'immediate_monitoring',
      type: 'immediate',
      category: 'monitoring',
      title: 'Enhance Error Monitoring',
      description: 'Implement comprehensive error tracking and alerting for similar issues',
      benefits: ['Early detection', 'Faster response time', 'Better visibility'],
      effort: 'low',
    });

    // Short-term recommendations
    if (result.confidence < 0.8) {
      recommendations.push({
        id: 'short_term_testing',
        type: 'short_term',
        category: 'testing',
        title: 'Improve Test Coverage',
        description: 'Add automated tests to cover the scenarios identified in this diagnosis',
        benefits: ['Prevent regression', 'Increase confidence', 'Better code quality'],
        effort: 'medium',
      });
    }

    // Long-term recommendations
    recommendations.push({
      id: 'long_term_architecture',
      type: 'long_term',
      category: 'architecture',
      title: 'Architecture Review',
      description: 'Conduct a comprehensive review of system architecture to prevent similar issues',
      benefits: ['Improved reliability', 'Better maintainability', 'Reduced technical debt'],
      effort: 'high',
    });

    return recommendations;
  }

  /**
   * Generate display data for UI components
   */
  private async generateDisplayData(
    formattedResult: FormattedDiagnosisResult,
    session: DiagnosisSession
  ): Promise<DiagnosisDisplayData> {
    const charts = this.generateCharts(formattedResult);
    const timeline = this.generateTimeline(session);
    const codeHighlights = this.generateCodeHighlights(formattedResult);
    const metrics = this.generateMetrics(formattedResult);
    const alerts = this.generateAlerts(formattedResult);

    return {
      charts,
      timeline,
      codeHighlights,
      metrics,
      alerts,
    };
  }

  /**
   * Generate export data in various formats
   */
  private async generateExportData(
    formattedResult: FormattedDiagnosisResult,
    session: DiagnosisSession
  ): Promise<DiagnosisExportData> {
    const markdown = this.generateMarkdownReport(formattedResult, session);
    const json = JSON.stringify({ session, result: formattedResult }, null, 2);
    const summary = this.generateSummaryReport(formattedResult);

    return {
      markdown,
      json,
      summary,
    };
  }

  /**
   * Generate metadata for the diagnosis
   */
  private generateMetadata(session: DiagnosisSession): DiagnosisMetadata {
    const processingTime = session.endTime && session.startTime
      ? session.endTime.getTime() - session.startTime.getTime()
      : 0;

    return {
      processingTime,
      aiModel: session.aiModel,
      tokensUsed: session.tokensUsed,
      confidence: session.result?.confidence || 0,
      timestamp: new Date(),
      version: this.version,
    };
  }

  // Helper methods for formatting and analysis

  private getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  }

  private getProbabilityLevel(probability: number): 'low' | 'medium' | 'high' {
    if (probability >= 0.7) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  private categorizeCause(description: string): FormattedCause['category'] {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('code') || lowerDesc.includes('function') || lowerDesc.includes('method')) {
      return 'code';
    }
    if (lowerDesc.includes('data') || lowerDesc.includes('database') || lowerDesc.includes('query')) {
      return 'data';
    }
    if (lowerDesc.includes('config') || lowerDesc.includes('setting') || lowerDesc.includes('parameter')) {
      return 'configuration';
    }
    if (lowerDesc.includes('server') || lowerDesc.includes('network') || lowerDesc.includes('infrastructure')) {
      return 'infrastructure';
    }
    
    return 'external';
  }

  private determineUrgency(result: DiagnosisResult): 'low' | 'medium' | 'high' | 'critical' {
    const highProbabilityCauses = result.possibleCauses.filter(c => (c.probability || c.likelihood) > 0.7);
    const highPriorityActions = result.suggestedActions.filter(a => a.priority === 'high');
    
    if (highProbabilityCauses.length > 0 && highPriorityActions.length > 0) {
      return 'critical';
    }
    if (highPriorityActions.length > 0) {
      return 'high';
    }
    if (result.confidence > 0.7) {
      return 'medium';
    }
    
    return 'low';
  }

  private estimateResolutionTime(result: DiagnosisResult): string {
    const highPriorityActions = result.suggestedActions.filter(a => a.priority === 'high').length;
    const mediumPriorityActions = result.suggestedActions.filter(a => a.priority === 'medium').length;
    
    if (highPriorityActions > 2) return '4-8 hours';
    if (highPriorityActions > 0 || mediumPriorityActions > 3) return '2-4 hours';
    if (mediumPriorityActions > 0) return '1-2 hours';
    
    return '30 minutes - 1 hour';
  }

  private assessImpact(result: DiagnosisResult): string {
    const confidence = result.confidence;
    const actionCount = result.suggestedActions.length;
    
    if (confidence > 0.8 && actionCount > 3) {
      return 'High impact issue requiring immediate attention and multiple fixes';
    }
    if (confidence > 0.6 && actionCount > 1) {
      return 'Medium impact issue with clear resolution path';
    }
    
    return 'Low to medium impact issue with straightforward resolution';
  }

  private extractCodeReferences(codeSnippets: CodeSnippet[]): CodeReference[] {
    return codeSnippets.map(snippet => ({
      fileName: snippet.fileName,
      startLine: snippet.startLine,
      endLine: snippet.endLine,
      snippet: snippet.content,
      relevance: 0.8, // Default relevance
    }));
  }

  private extractEvidence(description: string): string[] {
    const evidence: string[] = [];
    
    // Extract quoted strings as evidence
    const quotes = description.match(/"([^"]+)"/g);
    if (quotes) {
      evidence.push(...quotes.map(q => q.replace(/"/g, '')));
    }
    
    // Extract error codes
    const errorCodes = description.match(/\b[A-Z_]+_ERROR\b/g);
    if (errorCodes) {
      evidence.push(...errorCodes);
    }
    
    // Extract function/method names
    const functions = description.match(/\b\w+\(\)/g);
    if (functions) {
      evidence.push(...functions);
    }
    
    return evidence;
  }

  private assessCauseImpact(cause: Cause): 'low' | 'medium' | 'high' | 'critical' {
    const probability = cause.probability || cause.likelihood;
    if (probability > 0.8) return 'critical';
    if (probability > 0.6) return 'high';
    if (probability > 0.4) return 'medium';
    return 'low';
  }

  private extractSolutionTitle(description: string): string {
    // Extract first sentence or first 50 characters as title
    const firstSentence = description.split('.')[0];
    return firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;
  }

  private generateSolutionSteps(action: Action): FormattedStep[] {
    // Parse action description to extract steps
    const steps: FormattedStep[] = [];
    const lines = action.description.split('\n').filter(line => line.trim());
    
    lines.forEach((line, index) => {
      if (line.match(/^\d+\./) || line.match(/^-\s/) || line.match(/^\*\s/)) {
        steps.push({
          stepNumber: index + 1,
          title: `Step ${index + 1}`,
          description: line.replace(/^[\d\-\*\.]\s*/, ''),
          type: this.determineStepType(line),
          estimatedTime: '15-30 minutes',
        });
      }
    });
    
    // If no structured steps found, create a single step
    if (steps.length === 0) {
      steps.push({
        stepNumber: 1,
        title: 'Implementation',
        description: action.description,
        type: this.determineStepType(action.description),
        estimatedTime: '30-60 minutes',
      });
    }
    
    return steps;
  }

  private determineStepType(description: string): FormattedStep['type'] {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('test') || lowerDesc.includes('verify')) return 'testing';
    if (lowerDesc.includes('deploy') || lowerDesc.includes('release')) return 'deployment';
    if (lowerDesc.includes('config') || lowerDesc.includes('setting')) return 'configuration';
    if (lowerDesc.includes('investigate') || lowerDesc.includes('check')) return 'investigation';
    
    return 'code_change';
  }

  private assessComplexity(action: Action): 'simple' | 'moderate' | 'complex' {
    const description = action.description.toLowerCase();
    
    if (description.includes('refactor') || description.includes('architecture') || description.includes('redesign')) {
      return 'complex';
    }
    if (description.includes('modify') || description.includes('update') || description.includes('change')) {
      return 'moderate';
    }
    
    return 'simple';
  }

  private estimateSolutionTime(action: Action): string {
    const complexity = this.assessComplexity(action);
    const priority = action.priority;
    
    if (complexity === 'complex') return '4-8 hours';
    if (complexity === 'moderate' && priority === 'high') return '2-4 hours';
    if (complexity === 'moderate') return '1-2 hours';
    
    return '30 minutes - 1 hour';
  }

  private assessRiskLevel(action: Action): 'low' | 'medium' | 'high' {
    const description = action.description.toLowerCase();
    
    if (description.includes('database') || description.includes('production') || description.includes('critical')) {
      return 'high';
    }
    if (description.includes('config') || description.includes('api') || description.includes('service')) {
      return 'medium';
    }
    
    return 'low';
  }

  private extractPrerequisites(action: Action): string[] {
    const prerequisites: string[] = [];
    const description = action.description.toLowerCase();
    
    if (description.includes('backup')) {
      prerequisites.push('Create backup of affected data/code');
    }
    if (description.includes('test')) {
      prerequisites.push('Prepare test environment');
    }
    if (description.includes('deploy')) {
      prerequisites.push('Coordinate with deployment team');
    }
    
    return prerequisites;
  }

  private generateCodeChanges(action: Action): CodeChangePreview[] {
    // This would typically analyze the action description to suggest code changes
    // For now, return empty array as this requires more sophisticated parsing
    return [];
  }

  private extractAffectedFiles(result: DiagnosisResult): string[] {
    const files = new Set<string>();
    
    result.possibleCauses.forEach(cause => {
      if (cause.relatedCode) {
        cause.relatedCode.forEach(code => files.add(code.fileName));
      }
    });
    
    return Array.from(files);
  }

  private identifyCodeQualityIssues(result: DiagnosisResult): CodeQualityIssue[] {
    // Analyze diagnosis for code quality issues
    return [];
  }

  private identifyPerformanceIssues(result: DiagnosisResult): PerformanceIssue[] {
    // Analyze diagnosis for performance issues
    return [];
  }

  private identifySecurityConcerns(result: DiagnosisResult): SecurityConcern[] {
    // Analyze diagnosis for security concerns
    return [];
  }

  private identifyBestPracticeViolations(result: DiagnosisResult): BestPracticeViolation[] {
    // Analyze diagnosis for best practice violations
    return [];
  }

  private generateCharts(formattedResult: FormattedDiagnosisResult): ChartData[] {
    const charts: ChartData[] = [];
    
    // Cause probability chart
    if (formattedResult.causes.length > 0) {
      charts.push({
        type: 'pie',
        title: 'Possible Causes by Probability',
        data: formattedResult.causes.map(cause => cause.probability),
        labels: formattedResult.causes.map(cause => cause.description.substring(0, 30) + '...'),
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
      });
    }
    
    // Solution priority chart
    if (formattedResult.solutions.length > 0) {
      const priorityCounts = formattedResult.solutions.reduce((acc, solution) => {
        acc[solution.priority] = (acc[solution.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      charts.push({
        type: 'bar',
        title: 'Solutions by Priority',
        data: Object.values(priorityCounts),
        labels: Object.keys(priorityCounts),
        colors: ['#ff6b6b', '#feca57', '#4ecdc4'],
      });
    }
    
    return charts;
  }

  private generateTimeline(session: DiagnosisSession): TimelineData[] {
    const timeline: TimelineData[] = [];
    
    timeline.push({
      timestamp: session.startTime,
      event: 'Diagnosis Started',
      type: 'info',
      description: 'Began analysis of production issue',
    });
    
    if (session.endTime) {
      timeline.push({
        timestamp: session.endTime,
        event: 'Diagnosis Completed',
        type: session.status === 'completed' ? 'success' : 'error',
        description: session.status === 'completed' 
          ? 'Successfully completed diagnosis'
          : 'Diagnosis failed or was interrupted',
      });
    }
    
    return timeline;
  }

  private generateCodeHighlights(formattedResult: FormattedDiagnosisResult): CodeHighlight[] {
    const highlights: CodeHighlight[] = [];
    
    formattedResult.causes.forEach(cause => {
      cause.relatedCode.forEach(codeRef => {
        highlights.push({
          fileName: codeRef.fileName,
          startLine: codeRef.startLine,
          endLine: codeRef.endLine,
          type: 'error',
          message: `Related to: ${cause.description}`,
          severity: cause.impact === 'critical' ? 'high' : 'medium',
        });
      });
    });
    
    return highlights;
  }

  private generateMetrics(formattedResult: FormattedDiagnosisResult): MetricData[] {
    return [
      {
        name: 'Confidence Level',
        value: `${Math.round(formattedResult.summary.confidence * 100)}%`,
        status: formattedResult.summary.confidenceLevel === 'high' ? 'good' : 'warning',
        description: 'AI confidence in the diagnosis',
      },
      {
        name: 'Possible Causes',
        value: formattedResult.causes.length,
        status: formattedResult.causes.length <= 3 ? 'good' : 'warning',
        description: 'Number of identified potential causes',
      },
      {
        name: 'Suggested Solutions',
        value: formattedResult.solutions.length,
        status: formattedResult.solutions.length > 0 ? 'good' : 'critical',
        description: 'Number of recommended solutions',
      },
      {
        name: 'Estimated Resolution Time',
        value: formattedResult.summary.estimatedResolutionTime,
        status: 'good',
        description: 'Expected time to resolve the issue',
      },
    ];
  }

  private generateAlerts(formattedResult: FormattedDiagnosisResult): AlertData[] {
    const alerts: AlertData[] = [];
    
    if (formattedResult.summary.confidenceLevel === 'low') {
      alerts.push({
        type: 'warning',
        title: 'Low Confidence Diagnosis',
        message: 'The AI has low confidence in this diagnosis. Consider gathering more information or consulting with experts.',
        dismissible: true,
      });
    }
    
    if (formattedResult.summary.urgency === 'critical') {
      alerts.push({
        type: 'error',
        title: 'Critical Issue Detected',
        message: 'This issue requires immediate attention. Consider implementing emergency measures.',
        actions: ['Escalate to senior team', 'Implement emergency fix'],
        dismissible: false,
      });
    }
    
    return alerts;
  }

  private generateMarkdownReport(
    formattedResult: FormattedDiagnosisResult,
    session: DiagnosisSession
  ): string {
    let markdown = `# Diagnosis Report\n\n`;
    markdown += `**Session ID:** ${session.id}\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**AI Model:** ${session.aiModel}\n`;
    markdown += `**Processing Time:** ${formattedResult.metadata.processingTime}ms\n\n`;
    
    markdown += `## Summary\n\n`;
    markdown += `- **Confidence:** ${Math.round(formattedResult.summary.confidence * 100)}% (${formattedResult.summary.confidenceLevel})\n`;
    markdown += `- **Primary Cause:** ${formattedResult.summary.primaryCause}\n`;
    markdown += `- **Urgency:** ${formattedResult.summary.urgency}\n`;
    markdown += `- **Estimated Resolution Time:** ${formattedResult.summary.estimatedResolutionTime}\n\n`;
    
    markdown += `## Possible Causes\n\n`;
    formattedResult.causes.forEach((cause, index) => {
      markdown += `### ${index + 1}. ${cause.description}\n`;
      markdown += `- **Probability:** ${Math.round(cause.probability * 100)}%\n`;
      markdown += `- **Category:** ${cause.category}\n`;
      markdown += `- **Impact:** ${cause.impact}\n\n`;
    });
    
    markdown += `## Recommended Solutions\n\n`;
    formattedResult.solutions.forEach((solution, index) => {
      markdown += `### ${index + 1}. ${solution.title}\n`;
      markdown += `${solution.description}\n\n`;
      markdown += `- **Priority:** ${solution.priority}\n`;
      markdown += `- **Complexity:** ${solution.complexity}\n`;
      markdown += `- **Estimated Time:** ${solution.estimatedTime}\n`;
      markdown += `- **Risk Level:** ${solution.riskLevel}\n\n`;
      
      if (solution.steps.length > 0) {
        markdown += `**Steps:**\n`;
        solution.steps.forEach(step => {
          markdown += `${step.stepNumber}. ${step.description}\n`;
        });
        markdown += '\n';
      }
    });
    
    return markdown;
  }

  private generateSummaryReport(formattedResult: FormattedDiagnosisResult): string {
    let summary = `Diagnosis Summary:\n\n`;
    summary += `Primary Cause: ${formattedResult.summary.primaryCause}\n`;
    summary += `Confidence: ${Math.round(formattedResult.summary.confidence * 100)}%\n`;
    summary += `Urgency: ${formattedResult.summary.urgency}\n`;
    summary += `Estimated Resolution: ${formattedResult.summary.estimatedResolutionTime}\n\n`;
    
    summary += `Key Actions:\n`;
    formattedResult.solutions.slice(0, 3).forEach((solution, index) => {
      summary += `${index + 1}. ${solution.title} (${solution.priority} priority)\n`;
    });
    
    return summary;
  }
}

/**
 * Factory function to create diagnosis result processor
 */
export function createDiagnosisResultProcessor(): DiagnosisResultProcessor {
  return new DiagnosisResultProcessor();
}