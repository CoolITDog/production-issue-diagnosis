import {
  AIModelClient,
  AnalysisContext,
  DiagnosisResult,
  Solution,
  AIError,
  Cause,
  Action,
} from '../types';

export interface AIModelConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}

export class OpenAIModelClient implements AIModelClient {
  private config: AIModelConfig;
  private readonly defaultModel = 'gpt-3.5-turbo';
  private readonly defaultMaxTokens = 4000;
  private readonly defaultTemperature = 0.7;

  constructor(config: AIModelConfig) {
    this.config = {
      maxTokens: config.maxTokens || this.defaultMaxTokens,
      temperature: config.temperature || this.defaultTemperature,
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      model: config.model || this.defaultModel,
      apiKey: config.apiKey,
    };

    if (!this.config.apiKey) {
      throw new Error('API key is required for OpenAI client');
    }
  }

  async analyzeIssue(context: AnalysisContext): Promise<DiagnosisResult> {
    try {
      const prompt = this.buildAnalysisPrompt(context);
      const response = await this.callOpenAI(prompt);
      
      return this.parseAnalysisResponse(response);
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async generateCodeExplanation(code: string, language: string): Promise<string> {
    try {
      const prompt = this.buildCodeExplanationPrompt(code, language);
      const response = await this.callOpenAI(prompt);
      
      return response.choices[0]?.message?.content || 'No explanation generated';
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async suggestSolutions(diagnosis: DiagnosisResult): Promise<Solution[]> {
    try {
      const prompt = this.buildSolutionPrompt(diagnosis);
      const response = await this.callOpenAI(prompt);
      
      return this.parseSolutionResponse(response);
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testPrompt = 'Test connection. Please respond with "OK".';
      const response = await this.callOpenAI(testPrompt);
      
      return response.choices && response.choices.length > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private async callOpenAI(prompt: string): Promise<OpenAIResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    return response.json();
  }

  private buildAnalysisPrompt(context: AnalysisContext): string {
    const { ticket, relevantCode, projectContext } = context;
    
    let prompt = `You are an expert software engineer analyzing a production issue. Please analyze the following information and provide a detailed diagnosis.

## Production Issue Details:
- Title: ${ticket.title}
- Description: ${ticket.description}
- Severity: ${ticket.severity}
- Input Data: ${JSON.stringify(ticket.inputData, null, 2)}
- Output Data: ${JSON.stringify(ticket.outputData, null, 2)}`;

    if (ticket.errorLogs && ticket.errorLogs.length > 0) {
      prompt += `\n- Error Logs:\n${ticket.errorLogs.join('\n')}`;
    }

    prompt += `\n\n## Project Context:
- Project: ${projectContext.name}
- Languages: ${projectContext.languages.join(', ')}
- Total Files: ${projectContext.totalFiles}`;

    if (relevantCode.length > 0) {
      prompt += '\n\n## Relevant Code:';
      relevantCode.forEach((snippet, index) => {
        prompt += `\n\n### Code Snippet ${index + 1} (${snippet.fileName}):
\`\`\`${snippet.language}
${snippet.content}
\`\`\``;
      });
    }

    prompt += `\n\nPlease provide your analysis in the following JSON format:
{
  "possibleCauses": [
    {
      "description": "Detailed description of the cause",
      "probability": 0.8
    }
  ],
  "confidence": 0.85,
  "reasoning": "Your detailed reasoning for the diagnosis",
  "suggestedActions": [
    {
      "description": "Action to take",
      "priority": "high",
      "type": "code_fix"
    }
  ]
}`;

    return prompt;
  }

  private buildCodeExplanationPrompt(code: string, language: string): string {
    return `Please explain the following ${language} code in detail, including its purpose, functionality, and any potential issues:

\`\`\`${language}
${code}
\`\`\`

Provide a clear, technical explanation that would help a developer understand this code.`;
  }

  private buildSolutionPrompt(diagnosis: DiagnosisResult): string {
    return `Based on the following diagnosis, please provide detailed solutions:

## Diagnosis:
- Confidence: ${diagnosis.confidence}
- Reasoning: ${diagnosis.reasoning}

## Possible Causes:
${diagnosis.possibleCauses.map(cause => `- ${cause.description} (${Math.round((cause.probability || cause.likelihood) * 100)}% probability)`).join('\n')}

## Current Suggested Actions:
${diagnosis.suggestedActions.map(action => `- ${action.description} (${action.priority} priority)`).join('\n')}

Please provide detailed solutions in the following JSON format:
[
  {
    "title": "Solution title",
    "description": "Detailed description",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "priority": "high",
    "estimatedTime": "30 minutes"
  }
]`;
  }

  private parseAnalysisResponse(response: OpenAIResponse): DiagnosisResult {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        possibleCauses: parsed.possibleCauses || [],
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || content,
        suggestedActions: parsed.suggestedActions || [],
        timestamp: new Date(),
      };
    } catch (error) {
      // Fallback: create a basic diagnosis from the raw response
      const content = response.choices[0]?.message?.content || 'No analysis available';
      
      return {
        possibleCauses: [{
          title: 'Analysis Parsing Error',
          category: 'general',
          description: 'Analysis could not be parsed properly',
          likelihood: 0.5,
          probability: 0.5,
        }],
        confidence: 0.3,
        reasoning: content,
        suggestedActions: [{
          title: 'Manual Investigation',
          description: 'Review the raw analysis and investigate manually',
          priority: 'medium' as const,
          type: 'investigation' as const,
        }],
        timestamp: new Date(),
      };
    }
  }

  private parseSolutionResponse(response: OpenAIResponse): Solution[] {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        return [];
      }

      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        // Fallback: create a single solution from the raw response
        return [{
          title: 'General Solution',
          description: content,
          steps: ['Review the provided guidance'],
          priority: 'medium' as const,
        }];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      // Fallback: create a basic solution from the raw response
      const content = response.choices[0]?.message?.content || 'No solutions available';
      
      return [{
        title: 'Manual Investigation Required',
        description: content,
        steps: ['Review the analysis manually', 'Investigate based on the provided information'],
        priority: 'medium' as const,
      }];
    }
  }

  private handleAPIError(error: any): AIError {
    const aiError = new Error() as AIError;
    aiError.name = 'AIError';
    
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      aiError.type = 'api_limit';
      aiError.message = 'API rate limit exceeded';
      aiError.retryAfter = 60; // seconds
    } else if (error.message?.includes('timeout')) {
      aiError.type = 'network_timeout';
      aiError.message = 'Request timed out';
    } else if (error.message?.includes('model')) {
      aiError.type = 'model_unavailable';
      aiError.message = 'AI model is currently unavailable';
    } else if (error.message?.includes('context') || error.message?.includes('token')) {
      aiError.type = 'context_too_long';
      aiError.message = 'Context is too long for the model';
    } else {
      aiError.type = 'network_timeout';
      aiError.message = error.message || 'Unknown AI service error';
    }
    
    return aiError;
  }

  // Configuration management methods
  updateConfig(newConfig: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): AIModelConfig {
    // Return a copy without the API key for security
    const { apiKey, ...safeConfig } = this.config;
    return { ...safeConfig, apiKey: '***' };
  }

  validateApiKey(): boolean {
    return Boolean(this.config.apiKey && this.config.apiKey.length > 0);
  }
}

// Factory function for creating AI model clients
export function createAIModelClient(config: AIModelConfig): AIModelClient {
  return new OpenAIModelClient(config);
}

// Configuration helper for managing API keys securely
export class AIConfigManager {
  private static readonly STORAGE_KEY = 'ai_model_config';

  static saveConfig(config: Omit<AIModelConfig, 'apiKey'>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  static loadConfig(): Omit<AIModelConfig, 'apiKey'> | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load AI config:', error);
      return null;
    }
  }

  static clearConfig(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear AI config:', error);
    }
  }

  static createClientFromStorage(apiKey: string): AIModelClient | null {
    const config = this.loadConfig();
    if (!config) {
      return null;
    }

    return createAIModelClient({ ...config, apiKey });
  }
}