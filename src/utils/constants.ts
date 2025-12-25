// Constants for the production issue diagnosis platform

export const APP_CONFIG = {
  name: '生产问题诊断平台',
  version: '1.0.0',
  description: 'Production Issue Diagnosis Platform',
};

export const FILE_LIMITS = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxTotalSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 1000,
};

export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'php',
  'ruby',
  'go',
  'rust',
  'kotlin',
  'swift',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
  '.pyw',
  '.java',
  '.cpp',
  '.cc',
  '.cxx',
  '.c++',
  '.c',
  '.cs',
  '.php',
  '.php3',
  '.php4',
  '.php5',
  '.rb',
  '.go',
  '.rs',
  '.kt',
  '.swift',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.less',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.md',
  '.markdown',
  '.sql',
] as const;

export const AI_MODELS = {
  openai: {
    name: 'OpenAI GPT',
    maxTokens: 4096,
    endpoint: 'https://api.openai.com/v1/chat/completions',
  },
} as const;

export const LOCAL_STORAGE_KEYS = {
  projects: 'diagnosis_projects',
  tickets: 'diagnosis_tickets',
  sessions: 'diagnosis_sessions',
  settings: 'diagnosis_settings',
} as const;

export const ROUTES = {
  home: '/',
  project: '/project',
  diagnosis: '/diagnosis',
  settings: '/settings',
} as const;

export const TICKET_SEVERITY = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

export const TICKET_STATUS = {
  draft: 'draft',
  analyzing: 'analyzing',
  completed: 'completed',
} as const;
