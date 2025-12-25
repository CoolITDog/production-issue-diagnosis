// Core data types for the production issue diagnosis platform

export interface CodeProject {
  id: string;
  name: string;
  source: 'upload' | 'git';
  gitUrl?: string;
  uploadTime: Date;
  files: CodeFile[];
  structure: ProjectStructure;
  totalSize: number;
  languages: string[];
}

export interface CodeFile {
  id: string;
  fileName: string;
  filePath: string;
  language: string;
  content: string;
  size: number;
  lastModified: Date;
  functions: FunctionMetadata[];
  classes: ClassMetadata[];
  complexity: number;
}

export interface FunctionMetadata {
  name: string;
  startLine: number;
  endLine: number;
  parameters: Parameter[];
  returnType?: string;
  complexity: number;
  dependencies: string[];
  isExported: boolean;
}

export interface ClassMetadata {
  name: string;
  startLine: number;
  endLine: number;
  methods: FunctionMetadata[];
  properties: PropertyMetadata[];
  extends?: string;
  implements?: string[];
}

export interface PropertyMetadata {
  name: string;
  type?: string;
  isPublic: boolean;
  isStatic: boolean;
}

export interface Parameter {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface ProjectStructure {
  type: 'file' | 'directory';
  name: string;
  path?: string;
  children?: ProjectStructure[];
  size?: number;
  // 保持向后兼容
  directories?: DirectoryNode[];
  totalFiles?: number;
  totalDirectories?: number;
}

export interface DirectoryNode {
  name: string;
  path: string;
  files: string[];
  subdirectories: DirectoryNode[];
}

export interface ProductionTicket {
  id: string;
  title: string;
  description: string;
  inputData: any;
  outputData: any;
  errorLogs?: string[];
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'analyzing' | 'completed';
}

export interface DiagnosisResult {
  possibleCauses: Cause[];
  confidence: number;
  reasoning: string;
  suggestedActions: Action[];
  timestamp: Date;
}

export interface Cause {
  title: string;
  category: string;
  description: string;
  likelihood: number;
  evidence?: string[];
  codeLocation?: {
    file: string;
    line?: number;
  };
  probability?: number; // 保持向后兼容
  relatedCode?: CodeSnippet[];
}

export interface Action {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  type?: 'code_fix' | 'configuration' | 'investigation';
  steps?: string[];
  codeExample?: string;
}

export interface CodeSnippet {
  fileName: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
}

export interface DiagnosisSession {
  id: string;
  ticketId: string;
  projectId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  aiModel: string;
  tokensUsed: number;
  result?: DiagnosisResult;
}

export interface GitCredentials {
  username?: string;
  token?: string;
  sshKey?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectMetrics {
  totalLines: number;
  totalFunctions: number;
  totalClasses: number;
  averageComplexity: number;
  languageDistribution: Record<string, number>;
}

// Error types
export interface FileError extends Error {
  type: 'file_too_large' | 'unsupported_format' | 'read_failed';
  fileName?: string;
}

export interface GitError extends Error {
  type: 'network_failed' | 'auth_failed' | 'repo_not_found' | 'private_repo';
  gitUrl?: string;
}

export interface ParsingError extends Error {
  type: 'syntax_error' | 'encoding_error' | 'file_too_large';
  fileName?: string;
  line?: number;
}

export interface AIError extends Error {
  type:
    | 'api_limit'
    | 'model_unavailable'
    | 'context_too_long'
    | 'network_timeout';
  retryAfter?: number;
}

export interface RecoveryAction {
  type: 'retry' | 'skip' | 'fallback' | 'user_action';
  message: string;
  delay?: number;
  maxRetries?: number;
  fallbackStrategy?: string;
}

// Service interfaces for components

export interface FileUploadManager {
  handleFolderUpload(files: FileList): Promise<CodeProject>;
  handleGitClone(gitUrl: string, credentials?: GitCredentials): Promise<CodeProject>;
  validateFiles(files: File[]): Promise<ValidationResult>;
  filterCodeFiles(files: File[]): Promise<File[]>;
}

export interface FileSystemHandler {
  readFileContent(file: File): Promise<string>;
  getFileStructure(files: File[]): Promise<ProjectStructure>;
  detectLanguage(fileName: string, content: string): string;
  calculateProjectMetrics(files: CodeFile[]): ProjectMetrics;
}

export interface CodeParser {
  parseFile(content: string, language: string): Promise<ParsedFile>;
  extractFunctions(content: string, language: string): Promise<FunctionInfo[]>;
  extractClasses(content: string, language: string): Promise<ClassMetadata[]>;
  buildDependencyMap(files: ParsedFile[]): Promise<DependencyMap>;
}

export interface ParsedFile {
  fileName: string;
  language: string;
  functions: FunctionInfo[];
  classes: ClassMetadata[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  complexity: number;
}

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: Parameter[];
  returnType?: string;
  complexity: number;
  dependencies: string[];
  isExported: boolean;
}

export interface ImportInfo {
  module: string;
  imports: string[];
  isDefault: boolean;
  line: number;
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'default';
  line: number;
}

export interface DependencyMap {
  [fileName: string]: {
    imports: string[];
    exports: string[];
    dependencies: string[];
  };
}

export interface LanguageAnalyzer {
  getSupportedLanguages(): string[];
  analyzeJavaScript(content: string): Promise<JSAnalysisResult>;
  analyzePython(content: string): Promise<PythonAnalysisResult>;
  analyzeJava(content: string): Promise<JavaAnalysisResult>;
  analyzeGeneric(content: string, language: string): Promise<GenericAnalysisResult>;
}

export interface JSAnalysisResult {
  functions: FunctionInfo[];
  classes: ClassMetadata[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  complexity: number;
}

export interface PythonAnalysisResult {
  functions: FunctionInfo[];
  classes: ClassMetadata[];
  imports: ImportInfo[];
  complexity: number;
}

export interface JavaAnalysisResult {
  classes: ClassMetadata[];
  methods: FunctionInfo[];
  imports: ImportInfo[];
  packageName?: string;
  complexity: number;
}

export interface GenericAnalysisResult {
  functions: FunctionInfo[];
  classes: ClassMetadata[];
  complexity: number;
  language: string;
}

export interface TicketManager {
  createTicket(ticket: ProductionTicket): string;
  updateTicket(ticketId: string, updates: Partial<ProductionTicket>): void;
  getTicket(ticketId: string): ProductionTicket | null;
  getCurrentTickets(): ProductionTicket[];
  clearTickets(): void;
}

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

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'json' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface TicketTemplateManager {
  getAllTemplates(): TicketTemplate[];
  getTemplatesByCategory(category: TicketTemplate['category']): TicketTemplate[];
  getTemplate(templateId: string): TicketTemplate | null;
  createTicketFromTemplate(templateId: string, customData?: Record<string, any>): Partial<ProductionTicket>;
  createCustomTemplate(templateData: Omit<TicketTemplate, 'id' | 'isCustom' | 'createdAt' | 'updatedAt'>): string;
  updateCustomTemplate(templateId: string, updates: Partial<TicketTemplate>): void;
  deleteCustomTemplate(templateId: string): void;
  validateTemplateData(template: TicketTemplate, data: Record<string, any>): { isValid: boolean; errors: string[] };
  getCategories(): TicketTemplate['category'][];
}

export interface AIModelClient {
  analyzeIssue(context: AnalysisContext): Promise<DiagnosisResult>;
  generateCodeExplanation(code: string, language: string): Promise<string>;
  suggestSolutions(diagnosis: DiagnosisResult): Promise<Solution[]>;
  testConnection(): Promise<boolean>;
}

export interface AnalysisContext {
  ticket: ProductionTicket;
  relevantCode: CodeSnippet[];
  projectContext: ProjectContext;
}

export interface ProjectContext {
  name: string;
  languages: string[];
  totalFiles: number;
  structure: ProjectStructure;
  metrics: ProjectMetrics;
}

export interface Solution {
  title: string;
  description: string;
  steps: string[];
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: string;
  relatedCode?: CodeSnippet[];
}

export interface ContextOptimizer {
  selectRelevantCode(ticket: ProductionTicket, project: CodeProject): Promise<CodeSnippet[]>;
  optimizePrompt(context: AnalysisContext): Promise<string>;
  manageTokenLimit(content: string, maxTokens: number): Promise<string>;
  prioritizeCodeSections(code: CodeSnippet[], ticket: ProductionTicket): Promise<CodeSnippet[]>;
}

// Error handler interface
export interface ErrorHandler {
  handleFileError(error: FileError): Promise<RecoveryAction>;
  handleGitError(error: GitError): Promise<RecoveryAction>;
  handleParsingError(error: ParsingError): Promise<RecoveryAction>;
  handleAIError(error: AIError): Promise<RecoveryAction>;
}
