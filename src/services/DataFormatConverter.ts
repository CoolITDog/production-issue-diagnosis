import {
  CodeProject,
  CodeFile,
  ProductionTicket,
  AnalysisContext,
  ProjectContext,
  CodeSnippet,
  FunctionMetadata,
  ClassMetadata,
} from '../types';

export interface AIModelFormat {
  ticket: FormattedTicket;
  project: FormattedProject;
  relevantCode: FormattedCodeSnippet[];
  context: FormattedContext;
}

export interface FormattedTicket {
  id: string;
  title: string;
  description: string;
  severity: string;
  inputData: string;
  outputData: string;
  errorLogs: string[];
  timestamp: string;
}

export interface FormattedProject {
  name: string;
  languages: string[];
  totalFiles: number;
  structure: string;
  metrics: {
    totalLines: number;
    totalFunctions: number;
    totalClasses: number;
    averageComplexity: number;
    languageDistribution: Record<string, number>;
  };
}

export interface FormattedCodeSnippet {
  fileName: string;
  language: string;
  startLine: number;
  endLine: number;
  content: string;
  functions: string[];
  classes: string[];
  complexity: number;
}

export interface FormattedContext {
  analysisType: 'production_issue_diagnosis';
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  keywords: string[];
  relatedFiles: string[];
}

export interface StructuredPrompt {
  systemMessage: string;
  userMessage: string;
  context: AIModelFormat;
  instructions: string[];
}

export class DataFormatConverter {
  /**
   * Convert analysis context to AI model format
   */
  convertToAIFormat(context: AnalysisContext): AIModelFormat {
    return {
      ticket: this.formatTicket(context.ticket),
      project: this.formatProject(context.projectContext),
      relevantCode: this.formatCodeSnippets(context.relevantCode),
      context: this.formatAnalysisContext(context),
    };
  }

  /**
   * Generate structured prompt for AI model
   */
  generateStructuredPrompt(context: AnalysisContext): StructuredPrompt {
    const aiFormat = this.convertToAIFormat(context);
    
    return {
      systemMessage: this.buildSystemMessage(),
      userMessage: this.buildUserMessage(aiFormat),
      context: aiFormat,
      instructions: this.buildInstructions(context.ticket.severity),
    };
  }

  /**
   * Convert code project to structured context information
   */
  convertProjectToContext(project: CodeProject): ProjectContext {
    const metrics = this.calculateProjectMetrics(project);
    
    return {
      name: project.name,
      languages: project.languages,
      totalFiles: project.files.length,
      structure: project.structure,
      metrics,
    };
  }

  /**
   * Extract and format code snippets with metadata
   */
  extractStructuredCodeInfo(file: CodeFile): FormattedCodeSnippet[] {
    const snippets: FormattedCodeSnippet[] = [];
    
    // Extract function-level snippets
    for (const func of file.functions) {
      const content = this.extractCodeSection(file.content, func.startLine, func.endLine);
      
      snippets.push({
        fileName: file.fileName,
        language: file.language,
        startLine: func.startLine,
        endLine: func.endLine,
        content,
        functions: [func.name],
        classes: [],
        complexity: func.complexity,
      });
    }
    
    // Extract class-level snippets
    for (const cls of file.classes) {
      const content = this.extractCodeSection(file.content, cls.startLine, cls.endLine);
      
      snippets.push({
        fileName: file.fileName,
        language: file.language,
        startLine: cls.startLine,
        endLine: cls.endLine,
        content,
        functions: cls.methods.map(m => m.name),
        classes: [cls.name],
        complexity: this.calculateClassComplexity(cls),
      });
    }
    
    return snippets;
  }

  /**
   * Format production ticket for AI consumption
   */
  private formatTicket(ticket: ProductionTicket): FormattedTicket {
    return {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      severity: ticket.severity,
      inputData: this.formatDataForAI(ticket.inputData),
      outputData: this.formatDataForAI(ticket.outputData),
      errorLogs: ticket.errorLogs || [],
      timestamp: ticket.timestamp.toISOString(),
    };
  }

  /**
   * Format project context for AI consumption
   */
  private formatProject(projectContext: ProjectContext): FormattedProject {
    return {
      name: projectContext.name,
      languages: projectContext.languages,
      totalFiles: projectContext.totalFiles,
      structure: this.formatProjectStructure(projectContext.structure),
      metrics: projectContext.metrics,
    };
  }

  /**
   * Format code snippets for AI consumption
   */
  private formatCodeSnippets(snippets: CodeSnippet[]): FormattedCodeSnippet[] {
    return snippets.map(snippet => ({
      fileName: snippet.fileName,
      language: snippet.language,
      startLine: snippet.startLine,
      endLine: snippet.endLine,
      content: snippet.content,
      functions: this.extractFunctionNames(snippet.content, snippet.language),
      classes: this.extractClassNames(snippet.content, snippet.language),
      complexity: this.estimateCodeComplexity(snippet.content),
    }));
  }

  /**
   * Format analysis context metadata
   */
  private formatAnalysisContext(context: AnalysisContext): FormattedContext {
    const keywords = this.extractKeywords(context.ticket);
    const relatedFiles = context.relevantCode.map(code => code.fileName);
    
    return {
      analysisType: 'production_issue_diagnosis',
      timestamp: new Date().toISOString(),
      priority: context.ticket.severity,
      keywords,
      relatedFiles: Array.from(new Set(relatedFiles)),
    };
  }

  /**
   * Build system message for AI model
   */
  private buildSystemMessage(): string {
    return `You are an expert software engineer and production issue analyst. Your role is to:

1. Analyze production issues by examining error logs, input/output data, and relevant code
2. Identify root causes with high confidence based on evidence
3. Provide actionable solutions with clear implementation steps
4. Consider system architecture, data flow, and potential edge cases
5. Prioritize solutions based on impact and implementation complexity

Always provide structured, evidence-based analysis with specific references to code and data.`;
  }

  /**
   * Build user message with formatted context
   */
  private buildUserMessage(aiFormat: AIModelFormat): string {
    let message = `Please analyze the following production issue:

## Issue Summary
**Title:** ${aiFormat.ticket.title}
**Severity:** ${aiFormat.ticket.severity}
**Description:** ${aiFormat.ticket.description}

## Data Analysis
**Input Data:**
\`\`\`json
${aiFormat.ticket.inputData}
\`\`\`

**Output Data:**
\`\`\`json
${aiFormat.ticket.outputData}
\`\`\``;

    if (aiFormat.ticket.errorLogs.length > 0) {
      message += `\n\n**Error Logs:**
\`\`\`
${aiFormat.ticket.errorLogs.join('\n')}
\`\`\``;
    }

    message += `\n\n## Project Context
- **Project:** ${aiFormat.project.name}
- **Languages:** ${aiFormat.project.languages.join(', ')}
- **Total Files:** ${aiFormat.project.totalFiles}
- **Complexity:** ${aiFormat.project.metrics.averageComplexity.toFixed(2)} (average)`;

    if (aiFormat.relevantCode.length > 0) {
      message += '\n\n## Relevant Code Analysis';
      
      aiFormat.relevantCode.forEach((code, index) => {
        message += `\n\n### Code Section ${index + 1}: ${code.fileName}
**Lines:** ${code.startLine}-${code.endLine}
**Language:** ${code.language}
**Functions:** ${code.functions.join(', ') || 'None'}
**Classes:** ${code.classes.join(', ') || 'None'}
**Complexity:** ${code.complexity}

\`\`\`${code.language}
${code.content}
\`\`\``;
      });
    }

    return message;
  }

  /**
   * Build analysis instructions based on severity
   */
  private buildInstructions(severity: string): string[] {
    const baseInstructions = [
      'Analyze the error logs and identify the immediate cause',
      'Examine the input/output data for patterns or anomalies',
      'Review the relevant code for potential issues',
      'Consider system dependencies and external factors',
      'Provide specific, actionable solutions',
    ];

    const severityInstructions = {
      critical: [
        'Focus on immediate mitigation strategies',
        'Identify potential data corruption or security issues',
        'Provide emergency rollback procedures if applicable',
      ],
      high: [
        'Prioritize solutions that restore service quickly',
        'Consider impact on dependent systems',
        'Suggest monitoring improvements',
      ],
      medium: [
        'Balance quick fixes with long-term solutions',
        'Consider code quality improvements',
        'Suggest preventive measures',
      ],
      low: [
        'Focus on root cause analysis',
        'Suggest code refactoring opportunities',
        'Consider technical debt reduction',
      ],
    };

    return [
      ...baseInstructions,
      ...(severityInstructions[severity as keyof typeof severityInstructions] || []),
    ];
  }

  /**
   * Format arbitrary data for AI consumption
   */
  private formatDataForAI(data: any): string {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (typeof data === 'string') {
      return data;
    }
    
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Format project structure as readable text
   */
  private formatProjectStructure(structure: any): string {
    if (!structure || !structure.directories) {
      return 'Structure information not available';
    }
    
    const formatDirectory = (dir: any, indent = 0): string => {
      const spaces = '  '.repeat(indent);
      let result = `${spaces}${dir.name}/\n`;
      
      // Add files
      if (dir.files && dir.files.length > 0) {
        for (const file of dir.files.slice(0, 5)) { // Limit to first 5 files
          result += `${spaces}  ${file}\n`;
        }
        if (dir.files.length > 5) {
          result += `${spaces}  ... and ${dir.files.length - 5} more files\n`;
        }
      }
      
      // Add subdirectories
      if (dir.subdirectories && dir.subdirectories.length > 0) {
        for (const subdir of dir.subdirectories.slice(0, 3)) { // Limit depth
          result += formatDirectory(subdir, indent + 1);
        }
        if (dir.subdirectories.length > 3) {
          result += `${spaces}  ... and ${dir.subdirectories.length - 3} more directories\n`;
        }
      }
      
      return result;
    };
    
    let result = 'Project Structure:\n';
    for (const dir of structure.directories.slice(0, 3)) {
      result += formatDirectory(dir);
    }
    
    return result;
  }

  /**
   * Extract code section by line numbers
   */
  private extractCodeSection(content: string, startLine: number, endLine: number): string {
    const lines = content.split('\n');
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, endLine);
    
    return lines.slice(start, end).join('\n');
  }

  /**
   * Calculate project metrics
   */
  private calculateProjectMetrics(project: CodeProject): any {
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalComplexity = 0;
    const languageDistribution: Record<string, number> = {};
    
    for (const file of project.files) {
      totalLines += file.content.split('\n').length;
      totalFunctions += file.functions.length;
      totalClasses += file.classes.length;
      totalComplexity += file.complexity;
      
      languageDistribution[file.language] = (languageDistribution[file.language] || 0) + 1;
    }
    
    return {
      totalLines,
      totalFunctions,
      totalClasses,
      averageComplexity: project.files.length > 0 ? totalComplexity / project.files.length : 0,
      languageDistribution,
    };
  }

  /**
   * Calculate class complexity
   */
  private calculateClassComplexity(cls: ClassMetadata): number {
    return cls.methods.reduce((sum, method) => sum + method.complexity, 0);
  }

  /**
   * Extract function names from code
   */
  private extractFunctionNames(content: string, language: string): string[] {
    const patterns: Record<string, RegExp[]> = {
      javascript: [/function\s+(\w+)/g, /(\w+)\s*:\s*function/g, /(\w+)\s*=\s*\(/g],
      typescript: [/function\s+(\w+)/g, /(\w+)\s*:\s*function/g, /(\w+)\s*=\s*\(/g],
      python: [/def\s+(\w+)/g],
      java: [/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g],
    };
    
    const langPatterns = patterns[language.toLowerCase()] || patterns.javascript;
    const names: string[] = [];
    
    for (const pattern of langPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          names.push(match[1]);
        }
      }
    }
    
    return Array.from(new Set(names));
  }

  /**
   * Extract class names from code
   */
  private extractClassNames(content: string, language: string): string[] {
    const patterns: Record<string, RegExp[]> = {
      javascript: [/class\s+(\w+)/g],
      typescript: [/class\s+(\w+)/g, /interface\s+(\w+)/g],
      python: [/class\s+(\w+)/g],
      java: [/(?:public|private)?\s*class\s+(\w+)/g, /(?:public|private)?\s*interface\s+(\w+)/g],
    };
    
    const langPatterns = patterns[language.toLowerCase()] || patterns.javascript;
    const names: string[] = [];
    
    for (const pattern of langPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          names.push(match[1]);
        }
      }
    }
    
    return Array.from(new Set(names));
  }

  /**
   * Estimate code complexity (simple heuristic)
   */
  private estimateCodeComplexity(content: string): number {
    const complexityKeywords = [
      'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch',
      'forEach', 'map', 'filter', 'reduce', '&&', '||', '?'
    ];
    
    let complexity = 1; // Base complexity
    
    for (const keyword of complexityKeywords) {
      const matches = content.match(new RegExp(`\\b${keyword}\\b`, 'g'));
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Extract keywords from ticket for context
   */
  private extractKeywords(ticket: ProductionTicket): string[] {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    const keywords: string[] = [];
    
    // Technical keywords
    const technicalTerms = text.match(/\b(?:api|database|query|request|response|error|exception|timeout|connection|authentication|authorization|validation|parsing|serialization|deserialization|cache|session|transaction|lock|deadlock|memory|cpu|disk|network|ssl|tls|http|https|json|xml|sql|nosql|redis|mongodb|postgresql|mysql)\b/g);
    if (technicalTerms) {
      keywords.push(...technicalTerms);
    }
    
    // Function/method names (camelCase, PascalCase)
    const identifiers = text.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g);
    if (identifiers) {
      keywords.push(...identifiers);
    }
    
    // Error codes and HTTP status codes
    const codes = text.match(/\b(?:[45]\d{2}|[1-9]\d{3,})\b/g);
    if (codes) {
      keywords.push(...codes);
    }
    
    return Array.from(new Set(keywords));
  }
}

// Factory function
export function createDataFormatConverter(): DataFormatConverter {
  return new DataFormatConverter();
}

// Utility functions for external use
export function convertTicketToAIFormat(ticket: ProductionTicket): FormattedTicket {
  const converter = new DataFormatConverter();
  return converter['formatTicket'](ticket);
}

export function convertProjectToAIFormat(project: CodeProject): FormattedProject {
  const converter = new DataFormatConverter();
  const projectContext = converter.convertProjectToContext(project);
  return converter['formatProject'](projectContext);
}