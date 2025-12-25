import {
  CodeProject,
  CodeFile,
  ProjectStructure,
  DirectoryNode,
  ProjectMetrics,
  DependencyMap,
  ParsedFile,
} from '../types';
import { CodeParser } from './CodeParser';
import { LanguageAnalyzer } from './LanguageAnalyzer';

/**
 * 项目分析器 - 构建项目文件结构树和依赖关系图
 * 实现需求 2.1, 2.5: 构建项目文件结构树、生成依赖关系图、计算代码复杂度指标
 */
export class ProjectAnalyzer {
  private codeParser: CodeParser;
  private languageAnalyzer: LanguageAnalyzer;

  constructor() {
    this.codeParser = new CodeParser();
    this.languageAnalyzer = new LanguageAnalyzer();
  }

  /**
   * 分析整个代码项目
   */
  async analyzeProject(files: File[]): Promise<CodeProject> {
    const projectId = this.generateProjectId();
    const projectName = this.extractProjectName(files);
    
    // 过滤和处理代码文件
    const codeFiles = await this.processCodeFiles(files);
    
    // 构建项目结构
    const structure = await this.buildProjectStructure(files);
    
    // 计算项目指标
    const metrics = this.calculateProjectMetrics(codeFiles);
    
    // 提取使用的编程语言
    const languages = this.extractLanguages(codeFiles);
    
    const project: CodeProject = {
      id: projectId,
      name: projectName,
      source: 'upload',
      uploadTime: new Date(),
      files: codeFiles,
      structure,
      totalSize: this.calculateTotalSize(codeFiles),
      languages,
    };

    return project;
  }

  /**
   * 构建项目文件结构树
   */
  async buildProjectStructure(files: File[]): Promise<ProjectStructure> {
    const pathMap = new Map<string, DirectoryNode>();
    const rootDirectories: DirectoryNode[] = [];
    
    // 处理所有文件路径
    for (const file of files) {
      const filePath = this.getRelativeFilePath(file);
      const pathParts = filePath.split('/');
      
      // 构建目录层次结构
      let currentPath = '';
      let parentDir: DirectoryNode | null = null;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!pathMap.has(currentPath)) {
          const dirNode: DirectoryNode = {
            name: dirName,
            path: currentPath,
            files: [],
            subdirectories: [],
          };
          
          pathMap.set(currentPath, dirNode);
          
          if (parentDir) {
            parentDir.subdirectories.push(dirNode);
          } else {
            rootDirectories.push(dirNode);
          }
        }
        
        parentDir = pathMap.get(currentPath)!;
      }
      
      // 将文件添加到对应目录
      const fileName = pathParts[pathParts.length - 1];
      if (parentDir) {
        parentDir.files.push(fileName);
      } else {
        // 根目录文件
        const rootFileName = pathParts[0];
        let rootDir = rootDirectories.find(dir => dir.name === '.');
        if (!rootDir) {
          rootDir = {
            name: '.',
            path: '.',
            files: [],
            subdirectories: [],
          };
          rootDirectories.unshift(rootDir);
        }
        rootDir.files.push(rootFileName);
      }
    }

    // 排序目录和文件
    this.sortStructure(rootDirectories);

    return {
      type: 'directory',
      name: 'root',
      directories: rootDirectories,
      totalFiles: files.length,
      totalDirectories: pathMap.size,
    };
  }

  /**
   * 生成依赖关系图
   */
  async buildDependencyMap(codeFiles: CodeFile[]): Promise<DependencyMap> {
    const parsedFiles: ParsedFile[] = [];
    
    // 解析所有代码文件
    for (const file of codeFiles) {
      try {
        const parsed = await this.codeParser.parseFile(file.content, file.language);
        parsed.fileName = file.fileName;
        parsedFiles.push(parsed);
      } catch (error) {
        console.warn(`Failed to parse file ${file.fileName}:`, error);
        // 创建基本的解析结果
        parsedFiles.push({
          fileName: file.fileName,
          language: file.language,
          functions: [],
          classes: [],
          imports: [],
          exports: [],
          complexity: 0,
        });
      }
    }
    
    // 构建依赖关系图
    return await this.codeParser.buildDependencyMap(parsedFiles);
  }

  /**
   * 计算项目复杂度指标
   */
  calculateProjectMetrics(codeFiles: CodeFile[]): ProjectMetrics {
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalComplexity = 0;
    const languageDistribution: Record<string, number> = {};

    for (const file of codeFiles) {
      // 计算代码行数（排除空行和注释）
      const lines = this.countEffectiveLines(file.content);
      totalLines += lines;
      
      // 统计函数和类
      totalFunctions += file.functions.length;
      totalClasses += file.classes.length;
      
      // 累计复杂度
      totalComplexity += file.complexity;
      
      // 语言分布统计
      const language = file.language;
      languageDistribution[language] = (languageDistribution[language] || 0) + 1;
    }

    const averageComplexity = codeFiles.length > 0 ? totalComplexity / codeFiles.length : 0;

    return {
      totalLines,
      totalFunctions,
      totalClasses,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      languageDistribution,
    };
  }

  /**
   * 分析代码质量指标
   */
  async analyzeCodeQuality(codeFiles: CodeFile[]): Promise<{
    duplicateCode: number;
    testCoverage: number;
    maintainabilityIndex: number;
    technicalDebt: string[];
  }> {
    const duplicateCode = await this.detectDuplicateCode(codeFiles);
    const testCoverage = this.calculateTestCoverage(codeFiles);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(codeFiles);
    const technicalDebt = this.identifyTechnicalDebt(codeFiles);

    return {
      duplicateCode,
      testCoverage,
      maintainabilityIndex,
      technicalDebt,
    };
  }

  /**
   * 分析项目架构模式
   */
  analyzeArchitecturePatterns(codeFiles: CodeFile[], structure: ProjectStructure): {
    patterns: string[];
    layerStructure: string[];
    designPatterns: string[];
  } {
    const patterns = this.detectArchitecturePatterns(structure);
    const layerStructure = this.analyzeLayerStructure(structure);
    const designPatterns = this.detectDesignPatterns(codeFiles);

    return {
      patterns,
      layerStructure,
      designPatterns,
    };
  }

  // 私有辅助方法

  private generateProjectId(): string {
    return `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractProjectName(files: File[]): string {
    // 尝试从package.json或其他配置文件中提取项目名称
    const packageJsonFile = files.find(f => f.name === 'package.json');
    if (packageJsonFile) {
      try {
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onload = (e) => {
            try {
              const content = e.target?.result as string;
              const packageJson = JSON.parse(content);
              resolve(packageJson.name || 'Unknown Project');
            } catch {
              resolve('Unknown Project');
            }
          };
          reader.readAsText(packageJsonFile);
        }) as any;
      } catch {
        // 忽略解析错误
      }
    }
    
    // 从文件路径中推断项目名称
    const commonPath = this.findCommonPath(files);
    if (commonPath) {
      const pathParts = commonPath.split('/');
      return pathParts[pathParts.length - 1] || 'Code Project';
    }
    
    return 'Code Project';
  }

  private async processCodeFiles(files: File[]): Promise<CodeFile[]> {
    const codeFiles: CodeFile[] = [];
    
    for (const file of files) {
      if (this.isCodeFile(file)) {
        try {
          const content = await this.readFileContent(file);
          const language = this.detectLanguage(file.name, content);
          
          // 解析文件获取函数和类信息
          let functions: any[] = [];
          let classes: any[] = [];
          let complexity = 0;
          
          try {
            const parsed = await this.codeParser.parseFile(content, language);
            functions = parsed.functions;
            classes = parsed.classes;
            complexity = parsed.complexity;
          } catch (error) {
            console.warn(`Failed to parse ${file.name}:`, error);
            complexity = this.calculateBasicComplexity(content);
          }
          
          const codeFile: CodeFile = {
            id: this.generateFileId(file),
            fileName: file.name,
            filePath: this.getRelativeFilePath(file),
            language,
            content,
            size: file.size,
            lastModified: new Date(file.lastModified),
            functions,
            classes,
            complexity,
          };
          
          codeFiles.push(codeFile);
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
        }
      }
    }
    
    return codeFiles;
  }

  private isCodeFile(file: File): boolean {
    const codeExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
      '.py', '.pyw', '.pyi',
      '.java', '.kt', '.scala',
      '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp',
      '.cs', '.vb',
      '.go', '.rs',
      '.php', '.rb', '.swift',
      '.dart', '.elm',
      '.sql', '.graphql',
      '.html', '.css', '.scss', '.sass', '.less',
      '.json', '.xml', '.yaml', '.yml', '.toml',
      '.md', '.txt', '.config', '.env',
    ];
    
    const fileName = file.name.toLowerCase();
    return codeExtensions.some(ext => fileName.endsWith(ext)) ||
           this.isConfigFile(fileName);
  }

  private isConfigFile(fileName: string): boolean {
    const configFiles = [
      'dockerfile', 'makefile', 'rakefile', 'gemfile',
      'package.json', 'composer.json', 'pom.xml', 'build.gradle',
      'requirements.txt', 'pipfile', 'poetry.lock',
      'tsconfig.json', 'webpack.config.js', 'vite.config.js',
      '.gitignore', '.eslintrc', '.prettierrc',
    ];
    
    return configFiles.includes(fileName) ||
           fileName.startsWith('.') ||
           fileName.includes('config') ||
           fileName.includes('settings');
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsText(file);
    });
  }

  private detectLanguage(fileName: string, content: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    // 基于文件扩展名的语言映射
    const extensionMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'vue': 'vue',
      'svelte': 'svelte',
      'py': 'python',
      'pyw': 'python',
      'pyi': 'python',
      'java': 'java',
      'kt': 'kotlin',
      'scala': 'scala',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'vb': 'vb',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'dart': 'dart',
      'elm': 'elm',
      'sql': 'sql',
      'graphql': 'graphql',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'txt': 'text',
    };
    
    let language = extensionMap[extension] || 'unknown';
    
    // 基于内容的语言检测（用于无扩展名文件）
    if (language === 'unknown' || extension === '') {
      language = this.detectLanguageByContent(content);
    }
    
    return language;
  }

  private detectLanguageByContent(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    
    // Shebang检测
    if (firstLine.startsWith('#!')) {
      if (firstLine.includes('python')) return 'python';
      if (firstLine.includes('node')) return 'javascript';
      if (firstLine.includes('bash') || firstLine.includes('sh')) return 'bash';
      if (firstLine.includes('ruby')) return 'ruby';
      if (firstLine.includes('php')) return 'php';
    }
    
    // 语言特征检测
    if (content.includes('import ') && content.includes('from ')) return 'python';
    if (content.includes('package ') && content.includes('class ')) return 'java';
    if (content.includes('function ') || content.includes('=>')) return 'javascript';
    if (content.includes('interface ') && content.includes('implements')) return 'typescript';
    if (content.includes('#include') && content.includes('int main')) return 'c';
    if (content.includes('using namespace') || content.includes('std::')) return 'cpp';
    if (content.includes('using System') || content.includes('namespace ')) return 'csharp';
    if (content.includes('func ') && content.includes('package ')) return 'go';
    if (content.includes('fn ') && content.includes('let ')) return 'rust';
    
    return 'text';
  }

  private getRelativeFilePath(file: File): string {
    // 从webkitRelativePath获取相对路径，如果没有则使用文件名
    return (file as any).webkitRelativePath || file.name;
  }

  private findCommonPath(files: File[]): string {
    if (files.length === 0) return '';
    
    const paths = files.map(f => this.getRelativeFilePath(f));
    if (paths.length === 1) return paths[0];
    
    const firstPath = paths[0].split('/');
    let commonPath = '';
    
    for (let i = 0; i < firstPath.length - 1; i++) {
      const segment = firstPath[i];
      if (paths.every(path => path.split('/')[i] === segment)) {
        commonPath = commonPath ? `${commonPath}/${segment}` : segment;
      } else {
        break;
      }
    }
    
    return commonPath;
  }

  private generateFileId(file: File): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateBasicComplexity(content: string): number {
    const lines = content.split('\n').length;
    const controlStructures = (content.match(/\b(if|for|while|switch|try|catch)\b/g) || []).length;
    return Math.round(lines / 10 + controlStructures);
  }

  private calculateTotalSize(codeFiles: CodeFile[]): number {
    return codeFiles.reduce((total, file) => total + file.size, 0);
  }

  private extractLanguages(codeFiles: CodeFile[]): string[] {
    const languages = new Set<string>();
    codeFiles.forEach(file => languages.add(file.language));
    return Array.from(languages).filter(lang => lang !== 'unknown');
  }

  private sortStructure(directories: DirectoryNode[]): void {
    directories.sort((a, b) => a.name.localeCompare(b.name));
    directories.forEach(dir => {
      dir.files.sort();
      this.sortStructure(dir.subdirectories);
    });
  }

  private countEffectiveLines(content: string): number {
    const lines = content.split('\n');
    let effectiveLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      // 排除空行和纯注释行
      if (trimmed && 
          !trimmed.startsWith('//') && 
          !trimmed.startsWith('#') && 
          !trimmed.startsWith('/*') && 
          !trimmed.startsWith('*') &&
          trimmed !== '*/') {
        effectiveLines++;
      }
    }
    
    return effectiveLines;
  }

  // 代码质量分析方法

  private async detectDuplicateCode(codeFiles: CodeFile[]): Promise<number> {
    // 简化的重复代码检测
    const codeBlocks = new Map<string, number>();
    let duplicateLines = 0;
    
    for (const file of codeFiles) {
      const lines = file.content.split('\n');
      
      // 检测连续的代码块（5行以上）
      for (let i = 0; i <= lines.length - 5; i++) {
        const block = lines.slice(i, i + 5)
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('//') && !line.startsWith('#'))
          .join('\n');
        
        if (block) {
          const count = codeBlocks.get(block) || 0;
          codeBlocks.set(block, count + 1);
          
          if (count > 0) {
            duplicateLines += 5;
          }
        }
      }
    }
    
    const totalLines = codeFiles.reduce((sum, file) => sum + this.countEffectiveLines(file.content), 0);
    return totalLines > 0 ? Math.round((duplicateLines / totalLines) * 100) : 0;
  }

  private calculateTestCoverage(codeFiles: CodeFile[]): number {
    const testFiles = codeFiles.filter(file => 
      file.fileName.includes('test') || 
      file.fileName.includes('spec') ||
      file.filePath.includes('test') ||
      file.filePath.includes('spec')
    );
    
    const sourceFiles = codeFiles.filter(file => 
      !file.fileName.includes('test') && 
      !file.fileName.includes('spec') &&
      !file.filePath.includes('test') &&
      !file.filePath.includes('spec') &&
      ['javascript', 'typescript', 'python', 'java'].includes(file.language)
    );
    
    if (sourceFiles.length === 0) return 0;
    
    // 简化的测试覆盖率估算
    const testRatio = testFiles.length / sourceFiles.length;
    return Math.min(Math.round(testRatio * 100), 100);
  }

  private calculateMaintainabilityIndex(codeFiles: CodeFile[]): number {
    if (codeFiles.length === 0) return 0;
    
    const avgComplexity = codeFiles.reduce((sum, file) => sum + file.complexity, 0) / codeFiles.length;
    const avgFileSize = codeFiles.reduce((sum, file) => sum + this.countEffectiveLines(file.content), 0) / codeFiles.length;
    
    // 简化的可维护性指数计算 (0-100)
    const complexityFactor = Math.max(0, 100 - avgComplexity * 2);
    const sizeFactor = Math.max(0, 100 - avgFileSize / 10);
    
    return Math.round((complexityFactor + sizeFactor) / 2);
  }

  private identifyTechnicalDebt(codeFiles: CodeFile[]): string[] {
    const debt: string[] = [];
    
    for (const file of codeFiles) {
      const content = file.content.toLowerCase();
      
      // 检测技术债务指标
      if (content.includes('todo') || content.includes('fixme')) {
        debt.push(`${file.fileName}: Contains TODO/FIXME comments`);
      }
      
      if (file.complexity > 20) {
        debt.push(`${file.fileName}: High complexity (${file.complexity})`);
      }
      
      if (this.countEffectiveLines(file.content) > 500) {
        debt.push(`${file.fileName}: Large file (${this.countEffectiveLines(file.content)} lines)`);
      }
      
      if (file.functions.some((fn: any) => fn.complexity > 15)) {
        debt.push(`${file.fileName}: Contains complex functions`);
      }
      
      // 检测代码异味
      if (content.includes('eval(') || content.includes('exec(')) {
        debt.push(`${file.fileName}: Uses eval/exec (security risk)`);
      }
      
      if ((content.match(/console\.log/g) || []).length > 5) {
        debt.push(`${file.fileName}: Many console.log statements`);
      }
    }
    
    return debt;
  }

  // 架构模式分析方法

  private detectArchitecturePatterns(structure: ProjectStructure): string[] {
    const patterns: string[] = [];
    const dirNames = this.getAllDirectoryNames(structure.directories || []);
    
    // MVC模式
    if (dirNames.includes('models') && dirNames.includes('views') && dirNames.includes('controllers')) {
      patterns.push('MVC (Model-View-Controller)');
    }
    
    // MVP模式
    if (dirNames.includes('models') && dirNames.includes('views') && dirNames.includes('presenters')) {
      patterns.push('MVP (Model-View-Presenter)');
    }
    
    // MVVM模式
    if (dirNames.includes('models') && dirNames.includes('views') && dirNames.includes('viewmodels')) {
      patterns.push('MVVM (Model-View-ViewModel)');
    }
    
    // 分层架构
    if (dirNames.includes('services') && dirNames.includes('repositories') && dirNames.includes('controllers')) {
      patterns.push('Layered Architecture');
    }
    
    // 微服务架构
    if (dirNames.some(name => name.includes('service')) && dirNames.includes('api')) {
      patterns.push('Microservices Architecture');
    }
    
    // 组件化架构
    if (dirNames.includes('components') || dirNames.includes('widgets')) {
      patterns.push('Component-Based Architecture');
    }
    
    return patterns;
  }

  private analyzeLayerStructure(structure: ProjectStructure): string[] {
    const layers: string[] = [];
    const dirNames = this.getAllDirectoryNames(structure.directories || []);
    
    // 常见的层次结构
    const layerPatterns = [
      { name: 'Presentation Layer', dirs: ['views', 'components', 'ui', 'pages'] },
      { name: 'Business Logic Layer', dirs: ['services', 'business', 'logic', 'domain'] },
      { name: 'Data Access Layer', dirs: ['repositories', 'dao', 'data', 'models'] },
      { name: 'Infrastructure Layer', dirs: ['infrastructure', 'config', 'utils', 'helpers'] },
      { name: 'API Layer', dirs: ['api', 'controllers', 'routes', 'endpoints'] },
    ];
    
    for (const pattern of layerPatterns) {
      if (pattern.dirs.some(dir => dirNames.includes(dir))) {
        layers.push(pattern.name);
      }
    }
    
    return layers;
  }

  private detectDesignPatterns(codeFiles: CodeFile[]): string[] {
    const patterns: string[] = [];
    
    for (const file of codeFiles) {
      const content = file.content;
      const fileName = file.fileName.toLowerCase();
      
      // 单例模式
      if (content.includes('getInstance') || fileName.includes('singleton')) {
        patterns.push('Singleton Pattern');
      }
      
      // 工厂模式
      if (fileName.includes('factory') || content.includes('createInstance')) {
        patterns.push('Factory Pattern');
      }
      
      // 观察者模式
      if (content.includes('addEventListener') || content.includes('subscribe') || fileName.includes('observer')) {
        patterns.push('Observer Pattern');
      }
      
      // 装饰器模式
      if (content.includes('@') && (file.language === 'typescript' || file.language === 'python')) {
        patterns.push('Decorator Pattern');
      }
      
      // 策略模式
      if (fileName.includes('strategy') || content.includes('Strategy')) {
        patterns.push('Strategy Pattern');
      }
      
      // 适配器模式
      if (fileName.includes('adapter') || content.includes('Adapter')) {
        patterns.push('Adapter Pattern');
      }
    }
    
    return Array.from(new Set(patterns)); // 去重
  }

  private getAllDirectoryNames(directories: DirectoryNode[]): string[] {
    const names: string[] = [];
    
    for (const dir of directories) {
      names.push(dir.name.toLowerCase());
      names.push(...this.getAllDirectoryNames(dir.subdirectories));
    }
    
    return names;
  }
}