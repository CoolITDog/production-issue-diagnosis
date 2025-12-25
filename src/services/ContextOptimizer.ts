import {
  ContextOptimizer,
  ProductionTicket,
  CodeProject,
  CodeSnippet,
  AnalysisContext,
  CodeFile,
} from '../types';

export interface TokenEstimator {
  estimateTokens(text: string): number;
  truncateToTokenLimit(text: string, maxTokens: number): string;
}

export interface RelevanceScorer {
  scoreCodeRelevance(code: CodeSnippet, ticket: ProductionTicket): number;
  scoreFileRelevance(file: CodeFile, ticket: ProductionTicket): number;
}

export class SmartContextOptimizer implements ContextOptimizer {
  private tokenEstimator: TokenEstimator;
  private relevanceScorer: RelevanceScorer;
  private readonly defaultMaxTokens = 3000;

  constructor(
    tokenEstimator?: TokenEstimator,
    relevanceScorer?: RelevanceScorer
  ) {
    this.tokenEstimator = tokenEstimator || new SimpleTokenEstimator();
    this.relevanceScorer = relevanceScorer || new KeywordRelevanceScorer();
  }

  async selectRelevantCode(
    ticket: ProductionTicket,
    project: CodeProject
  ): Promise<CodeSnippet[]> {
    // Step 1: Score all files for relevance
    const scoredFiles = project.files
      .map(file => ({
        file,
        score: this.relevanceScorer.scoreFileRelevance(file, ticket),
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Step 2: Extract code snippets from relevant files
    const codeSnippets: CodeSnippet[] = [];
    
    for (const { file, score } of scoredFiles) {
      const snippets = await this.extractRelevantSnippets(file, ticket);
      
      // Add relevance score to snippets for later prioritization
      const scoredSnippets = snippets.map(snippet => ({
        ...snippet,
        relevanceScore: score,
      }));
      
      codeSnippets.push(...scoredSnippets);
    }

    // Step 3: Prioritize and limit snippets
    return this.prioritizeCodeSections(codeSnippets, ticket);
  }

  async optimizePrompt(context: AnalysisContext): Promise<string> {
    const { ticket, relevantCode, projectContext } = context;
    
    // Build base prompt
    let prompt = this.buildBasePrompt(ticket, projectContext);
    
    // Estimate tokens for base prompt
    const baseTokens = this.tokenEstimator.estimateTokens(prompt);
    const availableTokens = this.defaultMaxTokens - baseTokens - 500; // Reserve 500 for response
    
    if (availableTokens <= 0) {
      // Base prompt is too long, truncate it
      return this.tokenEstimator.truncateToTokenLimit(prompt, this.defaultMaxTokens - 500);
    }
    
    // Add code snippets within token limit
    const optimizedCode = await this.fitCodeWithinTokenLimit(relevantCode, availableTokens);
    
    if (optimizedCode.length > 0) {
      prompt += '\n\n## Relevant Code:\n';
      optimizedCode.forEach((snippet, index) => {
        prompt += `\n### Code Snippet ${index + 1} (${snippet.fileName}, lines ${snippet.startLine}-${snippet.endLine}):\n`;
        prompt += `\`\`\`${snippet.language}\n${snippet.content}\n\`\`\`\n`;
      });
    }
    
    return prompt;
  }

  async manageTokenLimit(content: string, maxTokens: number): Promise<string> {
    const estimatedTokens = this.tokenEstimator.estimateTokens(content);
    
    if (estimatedTokens <= maxTokens) {
      return content;
    }
    
    return this.tokenEstimator.truncateToTokenLimit(content, maxTokens);
  }

  async prioritizeCodeSections(
    code: CodeSnippet[],
    ticket: ProductionTicket
  ): Promise<CodeSnippet[]> {
    // Score each code snippet for relevance
    const scoredSnippets = code.map(snippet => ({
      snippet,
      score: this.relevanceScorer.scoreCodeRelevance(snippet, ticket),
    }));
    
    // Sort by relevance score (highest first)
    scoredSnippets.sort((a, b) => b.score - a.score);
    
    // Return top snippets, limiting to reasonable number
    const maxSnippets = 10;
    return scoredSnippets
      .slice(0, maxSnippets)
      .map(item => item.snippet);
  }

  private buildBasePrompt(ticket: ProductionTicket, projectContext: any): string {
    let prompt = `You are an expert software engineer analyzing a production issue.

## Issue Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Severity: ${ticket.severity}
- Status: ${ticket.status}`;

    if (ticket.inputData) {
      const inputStr = typeof ticket.inputData === 'string' 
        ? ticket.inputData 
        : JSON.stringify(ticket.inputData, null, 2);
      prompt += `\n- Input Data: ${inputStr}`;
    }

    if (ticket.outputData) {
      const outputStr = typeof ticket.outputData === 'string'
        ? ticket.outputData
        : JSON.stringify(ticket.outputData, null, 2);
      prompt += `\n- Output Data: ${outputStr}`;
    }

    if (ticket.errorLogs && ticket.errorLogs.length > 0) {
      prompt += `\n- Error Logs:\n${ticket.errorLogs.join('\n')}`;
    }

    prompt += `\n\n## Project Context:
- Name: ${projectContext.name}
- Languages: ${projectContext.languages.join(', ')}
- Total Files: ${projectContext.totalFiles}`;

    return prompt;
  }

  private async extractRelevantSnippets(
    file: CodeFile,
    ticket: ProductionTicket
  ): Promise<CodeSnippet[]> {
    const snippets: CodeSnippet[] = [];
    
    // Extract function-level snippets
    for (const func of file.functions) {
      const snippet: CodeSnippet = {
        fileName: file.fileName,
        startLine: func.startLine,
        endLine: func.endLine,
        content: this.extractLinesFromContent(file.content, func.startLine, func.endLine),
        language: file.language,
      };
      snippets.push(snippet);
    }
    
    // Extract class-level snippets
    for (const cls of file.classes) {
      const snippet: CodeSnippet = {
        fileName: file.fileName,
        startLine: cls.startLine,
        endLine: cls.endLine,
        content: this.extractLinesFromContent(file.content, cls.startLine, cls.endLine),
        language: file.language,
      };
      snippets.push(snippet);
    }
    
    // If no functions or classes, include the whole file (truncated)
    if (snippets.length === 0) {
      const lines = file.content.split('\n');
      const maxLines = 50; // Limit file snippets to 50 lines
      const endLine = Math.min(lines.length, maxLines);
      
      snippets.push({
        fileName: file.fileName,
        startLine: 1,
        endLine,
        content: lines.slice(0, endLine).join('\n'),
        language: file.language,
      });
    }
    
    return snippets;
  }

  private extractLinesFromContent(content: string, startLine: number, endLine: number): string {
    const lines = content.split('\n');
    const start = Math.max(0, startLine - 1); // Convert to 0-based index
    const end = Math.min(lines.length, endLine);
    
    return lines.slice(start, end).join('\n');
  }

  private async fitCodeWithinTokenLimit(
    codeSnippets: CodeSnippet[],
    availableTokens: number
  ): Promise<CodeSnippet[]> {
    const result: CodeSnippet[] = [];
    let usedTokens = 0;
    
    for (const snippet of codeSnippets) {
      const snippetText = `### ${snippet.fileName}\n\`\`\`${snippet.language}\n${snippet.content}\n\`\`\`\n`;
      const snippetTokens = this.tokenEstimator.estimateTokens(snippetText);
      
      if (usedTokens + snippetTokens <= availableTokens) {
        result.push(snippet);
        usedTokens += snippetTokens;
      } else {
        // Try to fit a truncated version
        const remainingTokens = availableTokens - usedTokens;
        if (remainingTokens > 100) { // Only if we have reasonable space left
          const truncatedContent = this.tokenEstimator.truncateToTokenLimit(
            snippet.content,
            remainingTokens - 50 // Reserve tokens for formatting
          );
          
          result.push({
            ...snippet,
            content: truncatedContent,
          });
        }
        break;
      }
    }
    
    return result;
  }
}

// Simple token estimator implementation
export class SimpleTokenEstimator implements TokenEstimator {
  // Rough approximation: 1 token ≈ 4 characters for English text
  private readonly CHARS_PER_TOKEN = 4;

  estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;
    
    if (text.length <= maxChars) {
      return text;
    }
    
    // Try to truncate at word boundaries
    const truncated = text.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxChars * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }
}

// Keyword-based relevance scorer
export class KeywordRelevanceScorer implements RelevanceScorer {
  scoreCodeRelevance(code: CodeSnippet, ticket: ProductionTicket): number {
    let score = 0;
    const content = code.content.toLowerCase();
    const searchTerms = this.extractSearchTerms(ticket);
    
    // Score based on keyword matches
    for (const term of searchTerms) {
      const matches = (content.match(new RegExp(term, 'gi')) || []).length;
      score += matches * this.getTermWeight(term);
    }
    
    // Bonus for error-related code if ticket has errors
    if (ticket.errorLogs && ticket.errorLogs.length > 0) {
      const errorKeywords = ['error', 'exception', 'throw', 'catch', 'try'];
      for (const keyword of errorKeywords) {
        if (content.includes(keyword)) {
          score += 2;
        }
      }
    }
    
    // Bonus for functions/classes mentioned in ticket
    const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
    const functionNames = this.extractFunctionNames(code.content);
    for (const funcName of functionNames) {
      if (ticketText.includes(funcName.toLowerCase())) {
        score += 5;
      }
    }
    
    return score;
  }

  scoreFileRelevance(file: CodeFile, ticket: ProductionTicket): number {
    let score = 0;
    const fileName = file.fileName.toLowerCase();
    const searchTerms = this.extractSearchTerms(ticket);
    
    // Score based on filename matches
    for (const term of searchTerms) {
      if (fileName.includes(term)) {
        score += 3;
      }
    }
    
    // Score based on file content
    const contentScore = this.scoreCodeRelevance({
      fileName: file.fileName,
      startLine: 1,
      endLine: file.content.split('\n').length,
      content: file.content,
      language: file.language,
    }, ticket);
    
    score += contentScore * 0.1; // Weight content score lower for file-level scoring
    
    // Bonus for certain file types based on ticket severity
    if (ticket.severity === 'critical' || ticket.severity === 'high') {
      const criticalPatterns = ['main', 'index', 'app', 'server', 'api'];
      for (const pattern of criticalPatterns) {
        if (fileName.includes(pattern)) {
          score += 2;
        }
      }
    }
    
    return score;
  }

  private extractSearchTerms(ticket: ProductionTicket): string[] {
    const text = `${ticket.title} ${ticket.description}`.toLowerCase();
    const terms: string[] = [];
    
    // Extract words (3+ characters)
    const words = text.match(/\b\w{3,}\b/g) || [];
    terms.push(...words);
    
    // Extract quoted strings
    const quoted = text.match(/"([^"]+)"/g) || [];
    terms.push(...quoted.map(q => q.replace(/"/g, '')));
    
    // Extract camelCase/PascalCase identifiers
    const identifiers = text.match(/\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/g) || [];
    terms.push(...identifiers);
    
    // Remove duplicates and common words
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'man', 'men', 'put', 'say', 'she', 'too', 'use'];
    
    return Array.from(new Set(terms)).filter(term => 
      term.length >= 3 && !commonWords.includes(term)
    );
  }

  private getTermWeight(term: string): number {
    // Give higher weight to technical terms
    const technicalTerms = ['function', 'method', 'class', 'variable', 'api', 'database', 'query', 'request', 'response', 'error', 'exception'];
    
    if (technicalTerms.includes(term.toLowerCase())) {
      return 2;
    }
    
    // Longer terms are generally more specific
    if (term.length > 8) {
      return 1.5;
    }
    
    return 1;
  }

  private extractFunctionNames(content: string): string[] {
    const functionNames: string[] = [];
    
    // JavaScript/TypeScript function patterns
    const jsFunctionPatterns = [
      /function\s+(\w+)/g,
      /(\w+)\s*:\s*function/g,
      /(\w+)\s*=\s*function/g,
      /(\w+)\s*=\s*\(/g,
      /(\w+)\s*\(/g,
    ];
    
    // Python function patterns
    const pyFunctionPatterns = [
      /def\s+(\w+)/g,
    ];
    
    // Java method patterns
    const javaMethodPatterns = [
      /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g,
    ];
    
    const allPatterns = [...jsFunctionPatterns, ...pyFunctionPatterns, ...javaMethodPatterns];
    
    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1] && match[1].length > 2) {
          functionNames.push(match[1]);
        }
      }
    }
    
    return Array.from(new Set(functionNames));
  }
}

// Factory function
export function createContextOptimizer(
  tokenEstimator?: TokenEstimator,
  relevanceScorer?: RelevanceScorer
): ContextOptimizer {
  return new SmartContextOptimizer(tokenEstimator, relevanceScorer);
}