import { DiagnosisEngine, DiagnosisEngineConfig, DiagnosisRequest } from './DiagnosisEngine';
import { AIIntegrationService } from './AIIntegrationService';
import { ProductionTicket, CodeProject, DiagnosisResult, DiagnosisSession } from '../types';
import * as fc from 'fast-check';

/**
 * Property-based tests for DiagnosisEngine
 * **Feature: production-issue-diagnosis, Property 10: 诊断报告生成**
 * **Validates: Requirements 5.1, 5.2**
 */

// Mock AI Integration Service
class MockAIIntegrationService {
  async diagnoseIssue(ticket: ProductionTicket, project: CodeProject): Promise<DiagnosisSession> {
    const mockResult: DiagnosisResult = {
      possibleCauses: [
        {
          title: `Issue in ${ticket.title}`,
          category: 'code',
          description: `Issue related to ${ticket.title}`,
          likelihood: 0.8,
          probability: 0.8,
        }
      ],
      confidence: 0.75,
      reasoning: `Analysis of ${ticket.description}`,
      suggestedActions: [
        {
          title: `Fix ${ticket.title}`,
          description: `Fix issue in ${ticket.title}`,
          priority: 'high',
          type: 'code_fix'
        }
      ],
      timestamp: new Date()
    };

    return {
      id: `session_${Date.now()}`,
      ticketId: ticket.id,
      projectId: project.id,
      startTime: new Date(),
      endTime: new Date(),
      status: 'completed',
      aiModel: 'mock-gpt-3.5-turbo',
      tokensUsed: 1000,
      result: mockResult
    };
  }

  async getSolutions(diagnosis: DiagnosisResult) {
    return [
      {
        title: 'Mock Solution',
        description: 'Mock solution description',
        steps: ['Step 1', 'Step 2'],
        priority: 'medium' as const,
        estimatedTime: '1-2 hours'
      }
    ];
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async explainCode(code: string, language: string): Promise<string> {
    return `Mock explanation for ${language} code`;
  }

  updateConfig(newConfig: any): void {
    // Mock implementation
  }

  getConfig(): any {
    return { aiModel: { model: 'mock-gpt-3.5-turbo' } };
  }
}

describe('DiagnosisEngine Property-Based Tests', () => {
  let mockAIService: MockAIIntegrationService;
  let diagnosisEngine: DiagnosisEngine;

  beforeEach(() => {
    mockAIService = new MockAIIntegrationService();
    const config: DiagnosisEngineConfig = {
      aiIntegrationService: mockAIService as any,
      defaultOptions: {
        includeCodeExplanation: true,
        includeSolutions: true,
        maxCodeSnippets: 10,
        priorityThreshold: 0.5
      }
    };
    diagnosisEngine = new DiagnosisEngine(config);
  });

  /**
   * Property 10: 诊断报告生成
   * For any valid production ticket and code project, the diagnosis engine should
   * generate a complete diagnosis report with possible causes and suggested actions
   */
  it('should generate diagnosis reports for any valid ticket and project', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary production tickets
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 10, maxLength: 500 }),
          inputData: fc.oneof(
            fc.object(),
            fc.string(),
            fc.integer(),
            fc.array(fc.string())
          ),
          outputData: fc.oneof(
            fc.object(),
            fc.string(),
            fc.integer(),
            fc.array(fc.string())
          ),
          timestamp: fc.date(),
          severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
          status: fc.constantFrom('draft', 'analyzing', 'completed')
        }) as any,
        // Generate arbitrary code projects
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          source: fc.constantFrom('upload', 'git'),
          uploadTime: fc.date(),
          files: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              fileName: fc.string({ minLength: 1, maxLength: 100 }),
              filePath: fc.string({ minLength: 1, maxLength: 200 }),
              language: fc.constantFrom('javascript', 'typescript', 'python', 'java'),
              content: fc.string({ minLength: 10, maxLength: 1000 }),
              size: fc.integer({ min: 1, max: 10000 }),
              lastModified: fc.date(),
              functions: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                startLine: fc.integer({ min: 1, max: 100 }),
                endLine: fc.integer({ min: 1, max: 100 }),
                parameters: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  type: fc.option(fc.string()),
                  isOptional: fc.boolean(),
                  defaultValue: fc.option(fc.string())
                })),
                returnType: fc.option(fc.string()),
                complexity: fc.integer({ min: 1, max: 20 }),
                dependencies: fc.array(fc.string()),
                isExported: fc.boolean()
              })),
              classes: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                startLine: fc.integer({ min: 1, max: 100 }),
                endLine: fc.integer({ min: 1, max: 100 }),
                methods: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  startLine: fc.integer({ min: 1, max: 100 }),
                  endLine: fc.integer({ min: 1, max: 100 }),
                  parameters: fc.array(fc.record({
                    name: fc.string({ minLength: 1 }),
                    type: fc.option(fc.string()),
                    isOptional: fc.boolean(),
                    defaultValue: fc.option(fc.string())
                  })),
                  returnType: fc.option(fc.string()),
                  complexity: fc.integer({ min: 1, max: 20 }),
                  dependencies: fc.array(fc.string()),
                  isExported: fc.boolean()
                })),
                properties: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  type: fc.option(fc.string()),
                  isPublic: fc.boolean(),
                  isStatic: fc.boolean()
                })),
                extends: fc.option(fc.string()),
                implements: fc.option(fc.array(fc.string()))
              })),
              complexity: fc.integer({ min: 1, max: 50 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          structure: fc.record({
            directories: fc.array(fc.record({
              name: fc.string({ minLength: 1 }),
              path: fc.string({ minLength: 1 }),
              files: fc.array(fc.string()),
              subdirectories: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                path: fc.string({ minLength: 1 }),
                files: fc.array(fc.string()),
                subdirectories: fc.array(fc.anything())
              }))
            })),
            totalFiles: fc.integer({ min: 1, max: 100 }),
            totalDirectories: fc.integer({ min: 0, max: 50 })
          }),
          totalSize: fc.integer({ min: 1, max: 1000000 }),
          languages: fc.array(fc.constantFrom('javascript', 'typescript', 'python', 'java'), { minLength: 1 })
        }),
        async (ticket: ProductionTicket, project: CodeProject) => {
          // Ensure endLine >= startLine for functions and classes
          project.files.forEach(file => {
            file.functions.forEach(func => {
              if (func.endLine < func.startLine) {
                func.endLine = func.startLine + 1;
              }
            });
            file.classes.forEach(cls => {
              if (cls.endLine < cls.startLine) {
                cls.endLine = cls.startLine + 1;
              }
              cls.methods.forEach(method => {
                if (method.endLine < method.startLine) {
                  method.endLine = method.startLine + 1;
                }
              });
            });
          });

          const request: DiagnosisRequest = {
            ticket,
            project,
            options: {
              includeCodeExplanation: true,
              includeSolutions: true,
              maxCodeSnippets: 5,
              priorityThreshold: 0.5
            }
          };

          // Execute diagnosis
          const session = await diagnosisEngine.startDiagnosis(request);

          // Verify session properties
          expect(session).toBeDefined();
          expect(session.id).toBeDefined();
          expect(typeof session.id).toBe('string');
          expect(session.id.length).toBeGreaterThan(0);
          expect(session.ticketId).toBe(ticket.id);
          expect(session.projectId).toBe(project.id);
          expect(session.startTime).toBeInstanceOf(Date);
          expect(session.status).toBe('completed');
          expect(session.aiModel).toBeDefined();
          expect(typeof session.tokensUsed).toBe('number');
          expect(session.tokensUsed).toBeGreaterThanOrEqual(0);

          // Verify diagnosis result exists
          expect(session.result).toBeDefined();
          const result = session.result!;

          // Verify diagnosis result structure
          expect(result.possibleCauses).toBeDefined();
          expect(Array.isArray(result.possibleCauses)).toBe(true);
          expect(result.possibleCauses.length).toBeGreaterThan(0);

          expect(result.confidence).toBeDefined();
          expect(typeof result.confidence).toBe('number');
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          expect(result.reasoning).toBeDefined();
          expect(typeof result.reasoning).toBe('string');
          expect(result.reasoning.length).toBeGreaterThan(0);

          expect(result.suggestedActions).toBeDefined();
          expect(Array.isArray(result.suggestedActions)).toBe(true);
          expect(result.suggestedActions.length).toBeGreaterThan(0);

          expect(result.timestamp).toBeInstanceOf(Date);

          // Verify each possible cause has required properties
          result.possibleCauses.forEach(cause => {
            expect(cause.description).toBeDefined();
            expect(typeof cause.description).toBe('string');
            expect(cause.description.length).toBeGreaterThan(0);

            expect(cause.probability).toBeDefined();
            expect(typeof cause.probability).toBe('number');
            expect(cause.probability).toBeGreaterThanOrEqual(0);
            expect(cause.probability).toBeLessThanOrEqual(1);

            if (cause.relatedCode) {
              expect(Array.isArray(cause.relatedCode)).toBe(true);
            }
          });

          // Verify each suggested action has required properties
          result.suggestedActions.forEach(action => {
            expect(action.description).toBeDefined();
            expect(typeof action.description).toBe('string');
            expect(action.description.length).toBeGreaterThan(0);

            expect(action.priority).toBeDefined();
            expect(['low', 'medium', 'high']).toContain(action.priority);

            expect(action.type).toBeDefined();
            expect(['code_fix', 'configuration', 'investigation']).toContain(action.type);
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000); // 30 second timeout for property-based test

  /**
   * Property: Diagnosis consistency
   * For any given ticket and project, running diagnosis multiple times should
   * produce consistent results (same structure, similar confidence levels)
   */
  it('should produce consistent diagnosis results for the same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 10, maxLength: 500 }),
          inputData: fc.object(),
          outputData: fc.object(),
          timestamp: fc.date(),
          severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
          status: fc.constantFrom('draft', 'analyzing', 'completed')
        }),
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 50 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          source: fc.constantFrom('upload', 'git'),
          uploadTime: fc.date(),
          files: fc.array(
            fc.record({
              id: fc.string({ minLength: 1 }),
              fileName: fc.string({ minLength: 1, maxLength: 100 }),
              filePath: fc.string({ minLength: 1, maxLength: 200 }),
              language: fc.constantFrom('javascript', 'typescript', 'python', 'java'),
              content: fc.string({ minLength: 10, maxLength: 1000 }),
              size: fc.integer({ min: 1, max: 10000 }),
              lastModified: fc.date(),
              functions: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                startLine: fc.integer({ min: 1, max: 100 }),
                endLine: fc.integer({ min: 1, max: 100 }),
                parameters: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  type: fc.option(fc.string()),
                  isOptional: fc.boolean(),
                  defaultValue: fc.option(fc.string())
                })),
                returnType: fc.option(fc.string()),
                complexity: fc.integer({ min: 1, max: 20 }),
                dependencies: fc.array(fc.string()),
                isExported: fc.boolean()
              })),
              classes: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                startLine: fc.integer({ min: 1, max: 100 }),
                endLine: fc.integer({ min: 1, max: 100 }),
                methods: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  startLine: fc.integer({ min: 1, max: 100 }),
                  endLine: fc.integer({ min: 1, max: 100 }),
                  parameters: fc.array(fc.record({
                    name: fc.string({ minLength: 1 }),
                    type: fc.option(fc.string()),
                    isOptional: fc.boolean(),
                    defaultValue: fc.option(fc.string())
                  })),
                  returnType: fc.option(fc.string()),
                  complexity: fc.integer({ min: 1, max: 20 }),
                  dependencies: fc.array(fc.string()),
                  isExported: fc.boolean()
                })),
                properties: fc.array(fc.record({
                  name: fc.string({ minLength: 1 }),
                  type: fc.option(fc.string()),
                  isPublic: fc.boolean(),
                  isStatic: fc.boolean()
                })),
                extends: fc.option(fc.string()),
                implements: fc.option(fc.array(fc.string()))
              })),
              complexity: fc.integer({ min: 1, max: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          structure: fc.record({
            directories: fc.array(fc.record({
              name: fc.string({ minLength: 1 }),
              path: fc.string({ minLength: 1 }),
              files: fc.array(fc.string()),
              subdirectories: fc.array(fc.record({
                name: fc.string({ minLength: 1 }),
                path: fc.string({ minLength: 1 }),
                files: fc.array(fc.string()),
                subdirectories: fc.array(fc.anything())
              }))
            })),
            totalFiles: fc.integer({ min: 1, max: 100 }),
            totalDirectories: fc.integer({ min: 0, max: 50 })
          }),
          totalSize: fc.integer({ min: 1, max: 1000000 }),
          languages: fc.array(fc.constantFrom('javascript', 'typescript', 'python', 'java'), { minLength: 1 })
        }),
        async (ticket: ProductionTicket, project: CodeProject) => {
          // Ensure endLine >= startLine for functions and classes
          project.files.forEach(file => {
            file.functions.forEach(func => {
              if (func.endLine < func.startLine) {
                func.endLine = func.startLine + 1;
              }
            });
            file.classes.forEach(cls => {
              if (cls.endLine < cls.startLine) {
                cls.endLine = cls.startLine + 1;
              }
              cls.methods.forEach(method => {
                if (method.endLine < method.startLine) {
                  method.endLine = method.startLine + 1;
                }
              });
            });
          });

          const request: DiagnosisRequest = {
            ticket,
            project
          };

          // Run diagnosis twice
          const session1 = await diagnosisEngine.startDiagnosis(request);
          const session2 = await diagnosisEngine.startDiagnosis(request);

          // Both should succeed
          expect(session1.status).toBe('completed');
          expect(session2.status).toBe('completed');
          expect(session1.result).toBeDefined();
          expect(session2.result).toBeDefined();

          const result1 = session1.result!;
          const result2 = session2.result!;

          // Results should have same structure
          expect(result1.possibleCauses.length).toBe(result2.possibleCauses.length);
          expect(result1.suggestedActions.length).toBe(result2.suggestedActions.length);

          // Confidence should be similar (within reasonable range for mock)
          expect(Math.abs(result1.confidence - result2.confidence)).toBeLessThanOrEqual(0.1);

          // Both should have valid timestamps
          expect(result1.timestamp).toBeInstanceOf(Date);
          expect(result2.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 50 }
    );
  }, 20000);

  /**
   * Property: Error handling for invalid inputs
   * For any invalid ticket or project data, the diagnosis engine should
   * handle errors gracefully and provide meaningful error messages
   */
  it('should handle invalid inputs gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid tickets (missing required fields)
        fc.oneof(
          fc.record({
            id: fc.string(),
            title: fc.constant(''), // Invalid: empty title
            description: fc.string({ minLength: 10 }),
            inputData: fc.object(),
            outputData: fc.object(),
            timestamp: fc.date(),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            status: fc.constantFrom('draft', 'analyzing', 'completed')
          }),
          fc.record({
            id: fc.string(),
            title: fc.string({ minLength: 1 }),
            description: fc.constant(''), // Invalid: empty description
            inputData: fc.object(),
            outputData: fc.object(),
            timestamp: fc.date(),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            status: fc.constantFrom('draft', 'analyzing', 'completed')
          })
        ),
        // Generate invalid projects (empty files array)
        fc.record({
          id: fc.string({ minLength: 1 }),
          name: fc.string({ minLength: 1 }),
          source: fc.constantFrom('upload', 'git'),
          uploadTime: fc.date(),
          files: fc.constant([]), // Invalid: no files
          structure: fc.record({
            directories: fc.array(fc.record({
              name: fc.string({ minLength: 1 }),
              path: fc.string({ minLength: 1 }),
              files: fc.array(fc.string()),
              subdirectories: fc.array(fc.anything())
            })),
            totalFiles: fc.integer({ min: 0, max: 100 }),
            totalDirectories: fc.integer({ min: 0, max: 50 })
          }),
          totalSize: fc.integer({ min: 0, max: 1000000 }),
          languages: fc.array(fc.string(), { minLength: 1 })
        }),
        async (invalidTicket: ProductionTicket, invalidProject: CodeProject) => {
          const request: DiagnosisRequest = {
            ticket: invalidTicket,
            project: invalidProject
          };

          // Should throw an error with meaningful message
          await expect(diagnosisEngine.startDiagnosis(request)).rejects.toThrow();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Unit test: Basic diagnosis functionality
   */
  it('should complete basic diagnosis workflow', async () => {
    const ticket: ProductionTicket = {
      id: 'test-ticket-1',
      title: 'Database Connection Error',
      description: 'Application fails to connect to database during peak hours',
      inputData: { connectionString: 'postgresql://localhost:5432/mydb' },
      outputData: { error: 'Connection timeout after 30 seconds' },
      timestamp: new Date(),
      severity: 'high',
      status: 'analyzing'
    };

    const project: CodeProject = {
      id: 'test-project-1',
      name: 'My Web App',
      source: 'upload',
      uploadTime: new Date(),
      files: [
        {
          id: 'file-1',
          fileName: 'database.js',
          filePath: '/src/database.js',
          language: 'javascript',
          content: 'const db = require("pg"); module.exports = db;',
          size: 100,
          lastModified: new Date(),
          functions: [
            {
              name: 'connect',
              startLine: 1,
              endLine: 10,
              parameters: [],
              complexity: 5,
              dependencies: ['pg'],
              isExported: true
            }
          ],
          classes: [],
          complexity: 5
        }
      ],
      structure: {
        directories: [
          {
            name: 'src',
            path: '/src',
            files: ['database.js'],
            subdirectories: []
          }
        ],
        totalFiles: 1,
        totalDirectories: 1
      },
      totalSize: 100,
      languages: ['javascript']
    };

    const request: DiagnosisRequest = {
      ticket,
      project
    };

    const session = await diagnosisEngine.startDiagnosis(request);

    expect(session.status).toBe('completed');
    expect(session.result).toBeDefined();
    expect(session.result!.possibleCauses.length).toBeGreaterThan(0);
    expect(session.result!.suggestedActions.length).toBeGreaterThan(0);
    expect(session.result!.confidence).toBeGreaterThan(0);
  });

  /**
   * Unit test: Session management
   */
  it('should manage diagnosis sessions correctly', async () => {
    const ticket: ProductionTicket = {
      id: 'test-ticket-2',
      title: 'API Response Slow',
      description: 'API endpoints responding slowly during business hours',
      inputData: { endpoint: '/api/users' },
      outputData: { responseTime: '5000ms' },
      timestamp: new Date(),
      severity: 'medium',
      status: 'draft'
    };

    const project: CodeProject = {
      id: 'test-project-2',
      name: 'API Service',
      source: 'git',
      gitUrl: 'https://github.com/example/api-service',
      uploadTime: new Date(),
      files: [
        {
          id: 'file-1',
          fileName: 'api.js',
          filePath: '/src/api.js',
          language: 'javascript',
          content: 'const express = require("express"); const app = express();',
          size: 200,
          lastModified: new Date(),
          functions: [],
          classes: [],
          complexity: 3
        }
      ],
      structure: {
        directories: [
          {
            name: 'src',
            path: '/src',
            files: ['api.js'],
            subdirectories: []
          }
        ],
        totalFiles: 1,
        totalDirectories: 1
      },
      totalSize: 200,
      languages: ['javascript']
    };

    const request: DiagnosisRequest = {
      ticket,
      project
    };

    // Start diagnosis
    const session = await diagnosisEngine.startDiagnosis(request);

    // Verify session can be retrieved
    const retrievedSession = diagnosisEngine.getSession(session.id);
    expect(retrievedSession).toBeDefined();
    expect(retrievedSession!.id).toBe(session.id);

    // Verify session appears in active sessions
    const activeSessions = diagnosisEngine.getActiveSessions();
    expect(activeSessions.some(s => s.id === session.id)).toBe(true);

    // Test statistics
    const stats = diagnosisEngine.getStatistics();
    expect(stats.completedSessions).toBeGreaterThanOrEqual(1);
    expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
  });

  /**
   * Unit test: Connection testing
   */
  it('should test AI service connection', async () => {
    const isConnected = await diagnosisEngine.testConnection();
    expect(isConnected).toBe(true);
  });
});