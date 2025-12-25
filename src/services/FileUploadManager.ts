import {
  CodeProject,
  CodeFile,
  FileUploadManager as IFileUploadManager,
  ValidationResult,
  GitCredentials,
  FileError,
  GitError,
  ProjectStructure,
  DirectoryNode,
  FunctionMetadata,
  ClassMetadata,
} from '../types';
import {
  generateId,
  formatFileSize,
  detectLanguageFromExtension,
  isValidGitUrl,
} from '../utils';

export class FileUploadManager implements IFileUploadManager {
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly SUPPORTED_EXTENSIONS = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb',
    'go', 'rs', 'kt', 'swift', 'html', 'css', 'scss', 'less', 'json', 'xml',
    'yaml', 'yml', 'md', 'sql', 'txt', 'log'
  ];

  /**
   * Handle folder upload from drag and drop or file input
   */
  async handleFolderUpload(files: FileList): Promise<CodeProject> {
    try {
      // Convert FileList to array
      const fileArray = Array.from(files);
      
      // Validate files
      const validation = await this.validateFiles(fileArray);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Filter code files
      const codeFiles = await this.filterCodeFiles(fileArray);
      
      if (codeFiles.length === 0) {
        throw new Error('No supported code files found in the uploaded folder');
      }

      // Process files
      const processedFiles = await this.processFiles(codeFiles);
      
      // Build project structure
      const structure = await this.buildProjectStructure(codeFiles);
      
      // Calculate total size and languages
      const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0);
      const languages = Array.from(new Set(processedFiles.map(file => file.language)));

      // Create project
      const project: CodeProject = {
        id: generateId(),
        name: this.extractProjectName(codeFiles),
        source: 'upload',
        uploadTime: new Date(),
        files: processedFiles,
        structure,
        totalSize,
        languages,
      };

      return project;
    } catch (error) {
      const fileError: FileError = {
        name: 'FileUploadError',
        message: error instanceof Error ? error.message : 'Unknown file upload error',
        type: 'read_failed',
      };
      throw fileError;
    }
  }

  /**
   * Handle Git repository cloning (limited browser implementation)
   */
  async handleGitClone(gitUrl: string, credentials?: GitCredentials): Promise<CodeProject> {
    // Validate Git URL
    if (!isValidGitUrl(gitUrl)) {
      const gitError: GitError = {
        name: 'GitCloneError',
        message: 'Invalid Git URL format',
        type: 'repo_not_found',
        gitUrl,
      };
      throw gitError;
    }

    // In browser environment, we can't actually clone Git repositories
    // This is a placeholder that would guide users to use file upload instead
    const gitError: GitError = {
      name: 'GitCloneError',
      message: 'Git repository cloning is not supported in browser environment. ' +
        'Please download the repository and upload the files instead.',
      type: 'private_repo',
      gitUrl,
    };
    throw gitError;
  }

  /**
   * Validate uploaded files
   */
  async validateFiles(files: File[]): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (files.length === 0) {
      errors.push('No files selected');
      return { isValid: false, errors, warnings };
    }

    let totalSize = 0;
    const oversizedFiles: string[] = [];

    for (const file of files) {
      // Check individual file size
      if (file.size > this.MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
      }
      
      totalSize += file.size;
    }

    // Check total size
    if (totalSize > this.MAX_TOTAL_SIZE) {
      errors.push(`Total upload size (${formatFileSize(totalSize)}) exceeds limit (${formatFileSize(this.MAX_TOTAL_SIZE)})`);
    }

    // Report oversized files
    if (oversizedFiles.length > 0) {
      warnings.push(`Large files detected: ${oversizedFiles.join(', ')}`);
    }

    // Check for supported files
    const supportedFiles = files.filter(file => this.isSupportedFile(file.name));
    if (supportedFiles.length === 0) {
      errors.push('No supported file types found');
    } else if (supportedFiles.length < files.length) {
      warnings.push(`${files.length - supportedFiles.length} unsupported files will be ignored`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Filter files to only include supported code files
   */
  async filterCodeFiles(files: File[]): Promise<File[]> {
    return files.filter(file => this.isSupportedFile(file.name));
  }

  /**
   * Check if file is supported based on extension
   */
  private isSupportedFile(fileName: string): boolean {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ? this.SUPPORTED_EXTENSIONS.includes(extension) : false;
  }

  /**
   * Process files to create CodeFile objects
   */
  private async processFiles(files: File[]): Promise<CodeFile[]> {
    const processedFiles: CodeFile[] = [];

    for (const file of files) {
      try {
        const content = await this.readFileContent(file);
        const language = detectLanguageFromExtension(file.name);
        
        const codeFile: CodeFile = {
          id: generateId(),
          fileName: file.name,
          filePath: file.webkitRelativePath || file.name,
          language,
          content,
          size: file.size,
          lastModified: new Date(file.lastModified),
          functions: [], // Will be populated by code parser
          classes: [], // Will be populated by code parser
          complexity: 0, // Will be calculated by code parser
        };

        processedFiles.push(codeFile);
      } catch (error) {
        console.warn(`Failed to process file ${file.name}:`, error);
        // Continue processing other files
      }
    }

    return processedFiles;
  }

  /**
   * Read file content as text
   */
  private async readFileContent(file: File): Promise<string> {
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
      
      reader.readAsText(file);
    });
  }

  /**
   * Build project structure from files
   */
  private async buildProjectStructure(files: File[]): Promise<ProjectStructure> {
    const directories = new Map<string, DirectoryNode>();
    
    // Process each file to build directory structure
    for (const file of files) {
      const path = file.webkitRelativePath || file.name;
      const pathParts = path.split('/');
      
      // Build directory hierarchy
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!directories.has(currentPath)) {
          const dirNode: DirectoryNode = {
            name: dirName,
            path: currentPath,
            files: [],
            subdirectories: [],
          };
          directories.set(currentPath, dirNode);
          
          // Link to parent directory
          if (parentPath && directories.has(parentPath)) {
            const parentDir = directories.get(parentPath)!;
            parentDir.subdirectories.push(dirNode);
          }
        }
      }
      
      // Add file to its directory
      const fileDir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';
      if (fileDir && directories.has(fileDir)) {
        directories.get(fileDir)!.files.push(file.name);
      }
    }

    // Get root directories (those without parent)
    const rootDirectories = Array.from(directories.values()).filter(dir => 
      !dir.path.includes('/')
    );

    return {
      type: 'directory',
      name: 'root',
      directories: rootDirectories,
      totalFiles: files.length,
      totalDirectories: directories.size,
    };
  }

  /**
   * Extract project name from uploaded files
   */
  private extractProjectName(files: File[]): string {
    // Try to get project name from common paths
    const paths = files.map(file => file.webkitRelativePath || file.name);
    
    // Look for common root directory
    if (paths.length > 0 && paths[0].includes('/')) {
      const rootDir = paths[0].split('/')[0];
      // Check if all files share the same root directory
      if (paths.every(path => path.startsWith(rootDir))) {
        return rootDir;
      }
    }
    
    // Fallback to timestamp-based name
    return `Project_${new Date().toISOString().slice(0, 10)}`;
  }
}