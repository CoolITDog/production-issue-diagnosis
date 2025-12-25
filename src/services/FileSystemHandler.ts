import {
  FileSystemHandler as IFileSystemHandler,
  ProjectStructure,
  DirectoryNode,
  ProjectMetrics,
  CodeFile,
} from '../types';

/**
 * 文件系统处理器 - 处理文件读取、结构分析和语言检测
 * 实现需求 2.1, 2.5: 文件结构分析和项目指标计算
 */
export class FileSystemHandler implements IFileSystemHandler {
  
  /**
   * 读取文件内容
   */
  async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      // 尝试以UTF-8编码读取
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * 构建文件结构树
   */
  async getFileStructure(files: File[]): Promise<ProjectStructure> {
    const pathMap = new Map<string, DirectoryNode>();
    const rootDirectories: DirectoryNode[] = [];
    let totalFiles = 0;
    
    // 处理每个文件的路径
    for (const file of files) {
      const filePath = this.getRelativeFilePath(file);
      const pathSegments = filePath.split('/').filter(segment => segment.length > 0);
      
      if (pathSegments.length === 0) continue;
      
      totalFiles++;
      
      // 构建目录层次结构
      let currentPath = '';
      let parentDirectory: DirectoryNode | null = null;
      
      // 处理目录路径（除了最后一个文件名）
      for (let i = 0; i < pathSegments.length - 1; i++) {
        const dirName = pathSegments[i];
        const newPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!pathMap.has(newPath)) {
          const directoryNode: DirectoryNode = {
            name: dirName,
            path: newPath,
            files: [],
            subdirectories: [],
          };
          
          pathMap.set(newPath, directoryNode);
          
          if (parentDirectory) {
            parentDirectory.subdirectories.push(directoryNode);
          } else {
            rootDirectories.push(directoryNode);
          }
        }
        
        parentDirectory = pathMap.get(newPath)!;
        currentPath = newPath;
      }
      
      // 添加文件到对应目录
      const fileName = pathSegments[pathSegments.length - 1];
      if (parentDirectory) {
        parentDirectory.files.push(fileName);
      } else {
        // 根目录文件
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
        rootDir.files.push(fileName);
      }
    }

    // 排序目录和文件
    this.sortDirectoryStructure(rootDirectories);

    return {
      type: 'directory',
      name: 'root',
      directories: rootDirectories,
      totalFiles,
      totalDirectories: pathMap.size,
    };
  }

  /**
   * 检测文件编程语言
   */
  detectLanguage(fileName: string, content: string): string {
    // 首先基于文件扩展名检测
    const languageByExtension = this.detectLanguageByExtension(fileName);
    
    if (languageByExtension !== 'unknown') {
      return languageByExtension;
    }
    
    // 如果扩展名无法确定，则基于内容检测
    return this.detectLanguageByContent(content, fileName);
  }

  /**
   * 计算项目指标
   */
  calculateProjectMetrics(files: CodeFile[]): ProjectMetrics {
    let totalLines = 0;
    let totalFunctions = 0;
    let totalClasses = 0;
    let totalComplexity = 0;
    const languageDistribution: Record<string, number> = {};

    for (const file of files) {
      // 计算有效代码行数
      const effectiveLines = this.countEffectiveLines(file.content);
      totalLines += effectiveLines;
      
      // 统计函数和类
      totalFunctions += file.functions?.length || 0;
      totalClasses += file.classes?.length || 0;
      
      // 累计复杂度
      totalComplexity += file.complexity || 0;
      
      // 语言分布统计
      const language = file.language;
      if (language && language !== 'unknown') {
        languageDistribution[language] = (languageDistribution[language] || 0) + 1;
      }
    }

    const averageComplexity = files.length > 0 ? totalComplexity / files.length : 0;

    return {
      totalLines,
      totalFunctions,
      totalClasses,
      averageComplexity: Math.round(averageComplexity * 100) / 100,
      languageDistribution,
    };
  }

  /**
   * 批量读取文件内容
   */
  async readMultipleFiles(files: File[]): Promise<Map<string, string>> {
    const contentMap = new Map<string, string>();
    const readPromises = files.map(async (file) => {
      try {
        const content = await this.readFileContent(file);
        contentMap.set(file.name, content);
      } catch (error) {
        console.warn(`Failed to read file ${file.name}:`, error);
        contentMap.set(file.name, ''); // 设置为空字符串而不是跳过
      }
    });

    await Promise.all(readPromises);
    return contentMap;
  }

  /**
   * 验证文件是否为代码文件
   */
  isCodeFile(file: File): boolean {
    const fileName = file.name.toLowerCase();
    
    // 检查文件扩展名
    const codeExtensions = this.getCodeExtensions();
    const hasCodeExtension = codeExtensions.some(ext => fileName.endsWith(ext));
    
    if (hasCodeExtension) return true;
    
    // 检查是否为配置文件
    return this.isConfigurationFile(fileName);
  }

  /**
   * 过滤代码文件
   */
  async filterCodeFiles(files: File[]): Promise<File[]> {
    return files.filter(file => this.isCodeFile(file));
  }

  /**
   * 分析文件编码
   */
  async detectFileEncoding(file: File): Promise<string> {
    // 读取文件的前几个字节来检测编码
    const buffer = await this.readFileAsArrayBuffer(file, 1024);
    const bytes = new Uint8Array(buffer);
    
    // 检测BOM
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return 'UTF-8';
    }
    
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return 'UTF-16LE';
    }
    
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return 'UTF-16BE';
    }
    
    // 简单的UTF-8检测
    let isUTF8 = true;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i];
      if (byte > 127) {
        // 检查UTF-8多字节序列
        if ((byte & 0xE0) === 0xC0) {
          // 2字节序列
          if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80) {
            isUTF8 = false;
            break;
          }
          i++;
        } else if ((byte & 0xF0) === 0xE0) {
          // 3字节序列
          if (i + 2 >= bytes.length || 
              (bytes[i + 1] & 0xC0) !== 0x80 || 
              (bytes[i + 2] & 0xC0) !== 0x80) {
            isUTF8 = false;
            break;
          }
          i += 2;
        } else if ((byte & 0xF8) === 0xF0) {
          // 4字节序列
          if (i + 3 >= bytes.length || 
              (bytes[i + 1] & 0xC0) !== 0x80 || 
              (bytes[i + 2] & 0xC0) !== 0x80 || 
              (bytes[i + 3] & 0xC0) !== 0x80) {
            isUTF8 = false;
            break;
          }
          i += 3;
        } else {
          isUTF8 = false;
          break;
        }
      }
    }
    
    return isUTF8 ? 'UTF-8' : 'ASCII';
  }

  // 私有辅助方法

  private getRelativeFilePath(file: File): string {
    // 尝试获取webkitRelativePath，如果没有则使用文件名
    const relativePath = (file as any).webkitRelativePath;
    return relativePath || file.name;
  }

  private sortDirectoryStructure(directories: DirectoryNode[]): void {
    // 排序目录（字母顺序）
    directories.sort((a, b) => a.name.localeCompare(b.name));
    
    // 递归排序子目录和文件
    directories.forEach(dir => {
      dir.files.sort();
      this.sortDirectoryStructure(dir.subdirectories);
    });
  }

  private detectLanguageByExtension(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    const extensionMap: Record<string, string> = {
      // JavaScript/TypeScript
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'mjs': 'javascript',
      'cjs': 'javascript',
      
      // Python
      'py': 'python',
      'pyw': 'python',
      'pyi': 'python',
      'pyx': 'python',
      
      // Java/JVM languages
      'java': 'java',
      'kt': 'kotlin',
      'kts': 'kotlin',
      'scala': 'scala',
      'groovy': 'groovy',
      
      // C/C++
      'c': 'c',
      'cpp': 'cpp',
      'cxx': 'cpp',
      'cc': 'cpp',
      'c++': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'hxx': 'cpp',
      'hh': 'cpp',
      
      // C#/.NET
      'cs': 'csharp',
      'vb': 'vb',
      'fs': 'fsharp',
      
      // Other compiled languages
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'dart': 'dart',
      
      // Scripting languages
      'php': 'php',
      'rb': 'ruby',
      'pl': 'perl',
      'lua': 'lua',
      'r': 'r',
      
      // Functional languages
      'elm': 'elm',
      'hs': 'haskell',
      'ml': 'ocaml',
      'clj': 'clojure',
      'lisp': 'lisp',
      
      // Web technologies
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'vue': 'vue',
      'svelte': 'svelte',
      
      // Data formats
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'config',
      'conf': 'config',
      
      // Database
      'sql': 'sql',
      'graphql': 'graphql',
      'gql': 'graphql',
      
      // Shell/Scripts
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'zsh',
      'fish': 'fish',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch',
      
      // Documentation
      'md': 'markdown',
      'markdown': 'markdown',
      'rst': 'rst',
      'txt': 'text',
      
      // Build/Config files
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'cmake': 'cmake',
      'gradle': 'gradle',
      'maven': 'xml',
    };
    
    return extensionMap[extension] || 'unknown';
  }

  private detectLanguageByContent(content: string, fileName: string): string {
    const firstLine = content.split('\n')[0].trim();
    const lowerFileName = fileName.toLowerCase();
    
    // Shebang检测
    if (firstLine.startsWith('#!')) {
      if (firstLine.includes('python')) return 'python';
      if (firstLine.includes('node')) return 'javascript';
      if (firstLine.includes('bash') || firstLine.includes('/sh')) return 'bash';
      if (firstLine.includes('ruby')) return 'ruby';
      if (firstLine.includes('php')) return 'php';
      if (firstLine.includes('perl')) return 'perl';
    }
    
    // 特殊文件名检测
    if (lowerFileName === 'dockerfile') return 'dockerfile';
    if (lowerFileName === 'makefile') return 'makefile';
    if (lowerFileName === 'rakefile') return 'ruby';
    if (lowerFileName === 'gemfile') return 'ruby';
    if (lowerFileName.includes('package.json')) return 'json';
    if (lowerFileName.includes('composer.json')) return 'json';
    if (lowerFileName.includes('pom.xml')) return 'xml';
    if (lowerFileName.includes('build.gradle')) return 'gradle';
    
    // 基于内容特征的语言检测
    const contentLower = content.toLowerCase();
    
    // Python特征
    if (content.includes('def ') && content.includes(':') && 
        (content.includes('import ') || content.includes('from '))) {
      return 'python';
    }
    
    // Java特征
    if (content.includes('public class ') && content.includes('package ')) {
      return 'java';
    }
    
    // JavaScript/TypeScript特征
    if ((content.includes('function ') || content.includes('=>')) && 
        (content.includes('var ') || content.includes('let ') || content.includes('const '))) {
      if (content.includes('interface ') || content.includes(': string') || content.includes(': number')) {
        return 'typescript';
      }
      return 'javascript';
    }
    
    // C/C++特征
    if (content.includes('#include') && content.includes('int main')) {
      if (contentLower.includes('std::') || contentLower.includes('using namespace')) {
        return 'cpp';
      }
      return 'c';
    }
    
    // C#特征
    if (content.includes('using System') || content.includes('namespace ')) {
      return 'csharp';
    }
    
    // Go特征
    if (content.includes('package ') && content.includes('func ')) {
      return 'go';
    }
    
    // Rust特征
    if (content.includes('fn ') && content.includes('let ')) {
      return 'rust';
    }
    
    // PHP特征
    if (content.includes('<?php')) {
      return 'php';
    }
    
    // Ruby特征
    if (content.includes('def ') && content.includes('end') && !content.includes(':')) {
      return 'ruby';
    }
    
    // HTML特征
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return 'html';
    }
    
    // CSS特征
    if (content.includes('{') && content.includes('}') && content.includes(':') && 
        !content.includes('function') && !content.includes('class')) {
      return 'css';
    }
    
    // JSON特征
    if ((content.trim().startsWith('{') && content.trim().endsWith('}')) ||
        (content.trim().startsWith('[') && content.trim().endsWith(']'))) {
      try {
        JSON.parse(content);
        return 'json';
      } catch {
        // 不是有效的JSON
      }
    }
    
    // XML特征
    if (content.includes('<?xml') || (content.includes('<') && content.includes('/>'))) {
      return 'xml';
    }
    
    // YAML特征
    if (content.includes('---') || (content.includes(':') && !content.includes(';') && !content.includes('{}'))) {
      return 'yaml';
    }
    
    return 'text';
  }

  private countEffectiveLines(content: string): number {
    const lines = content.split('\n');
    let effectiveLines = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 排除空行和纯注释行
      if (trimmed && 
          !this.isCommentLine(trimmed) && 
          !this.isImportLine(trimmed)) {
        effectiveLines++;
      }
    }
    
    return effectiveLines;
  }

  private isCommentLine(line: string): boolean {
    const trimmed = line.trim();
    
    // 常见的注释模式
    const commentPatterns = [
      /^\/\//, // JavaScript, C++, Java, C#
      /^#/, // Python, Shell, Ruby
      /^\/\*/, // C-style block comment start
      /^\*/, // C-style block comment continuation
      /^\*\//, // C-style block comment end
      /^<!--/, // HTML comment
      /^--/, // SQL comment
      /^%/, // LaTeX comment
      /^;/, // Lisp, Assembly comment
    ];
    
    return commentPatterns.some(pattern => pattern.test(trimmed));
  }

  private isImportLine(line: string): boolean {
    const trimmed = line.trim();
    
    // 导入语句模式（通常不算作有效业务逻辑代码）
    const importPatterns = [
      /^import\s/, // JavaScript, Python, Java
      /^from\s.*import/, // Python
      /^using\s/, // C#
      /^#include/, // C/C++
      /^require\s*\(/, // Node.js
    ];
    
    return importPatterns.some(pattern => pattern.test(trimmed));
  }

  private getCodeExtensions(): string[] {
    return [
      // Programming languages
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.pyw', '.pyi', '.pyx',
      '.java', '.kt', '.kts', '.scala', '.groovy',
      '.c', '.cpp', '.cxx', '.cc', '.c++', '.h', '.hpp', '.hxx', '.hh',
      '.cs', '.vb', '.fs',
      '.go', '.rs', '.swift', '.dart',
      '.php', '.rb', '.pl', '.lua', '.r',
      '.elm', '.hs', '.ml', '.clj', '.lisp',
      
      // Web technologies
      '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.vue', '.svelte',
      
      // Data formats
      '.json', '.xml', '.yaml', '.yml', '.toml', '.ini',
      
      // Database
      '.sql', '.graphql', '.gql',
      
      // Shell/Scripts
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      
      // Documentation
      '.md', '.markdown', '.rst', '.txt',
      
      // Configuration
      '.cfg', '.conf', '.config', '.env',
    ];
  }

  private isConfigurationFile(fileName: string): boolean {
    const configFiles = [
      'dockerfile', 'makefile', 'rakefile', 'gemfile', 'pipfile',
      'package.json', 'composer.json', 'pom.xml', 'build.gradle',
      'requirements.txt', 'poetry.lock', 'yarn.lock', 'package-lock.json',
      'tsconfig.json', 'webpack.config.js', 'vite.config.js', 'rollup.config.js',
      '.gitignore', '.eslintrc', '.prettierrc', '.babelrc', '.editorconfig',
      '.env', '.env.local', '.env.development', '.env.production',
      'docker-compose.yml', 'docker-compose.yaml',
    ];
    
    const lowerFileName = fileName.toLowerCase();
    
    return configFiles.includes(lowerFileName) ||
           lowerFileName.startsWith('.') ||
           lowerFileName.includes('config') ||
           lowerFileName.includes('settings') ||
           lowerFileName.endsWith('.config') ||
           lowerFileName.endsWith('.settings');
  }

  private async readFileAsArrayBuffer(file: File, maxBytes?: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      if (maxBytes && file.size > maxBytes) {
        // 只读取文件的前N个字节
        const blob = file.slice(0, maxBytes);
        reader.readAsArrayBuffer(blob);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }
}