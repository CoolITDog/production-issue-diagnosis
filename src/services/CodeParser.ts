import {
  CodeParser as ICodeParser,
  ParsedFile,
  FunctionInfo,
  ClassMetadata,
  DependencyMap,
  ImportInfo,
  ExportInfo,
  Parameter,
  ParsingError,
} from '../types';

/**
 * 代码解析器 - 支持多种编程语言的代码分析
 * 实现需求 2.2, 2.4: 识别文件类型、函数、类和模块结构
 */
export class CodeParser implements ICodeParser {
  private supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'jsx', 'tsx'];

  /**
   * 解析单个文件内容
   */
  async parseFile(content: string, language: string): Promise<ParsedFile> {
    try {
      const normalizedLanguage = this.normalizeLanguage(language);
      
      if (!this.supportedLanguages.includes(normalizedLanguage)) {
        // 对于不支持的语言，返回基本信息
        return {
          fileName: '',
          language: normalizedLanguage,
          functions: [],
          classes: [],
          imports: [],
          exports: [],
          complexity: this.calculateBasicComplexity(content),
        };
      }

      const functions = await this.extractFunctions(content, normalizedLanguage);
      const classes = await this.extractClasses(content, normalizedLanguage);
      const imports = this.extractImports(content, normalizedLanguage);
      const exports = this.extractExports(content, normalizedLanguage);
      const complexity = this.calculateComplexity(content, functions, classes);

      return {
        fileName: '',
        language: normalizedLanguage,
        functions,
        classes,
        imports,
        exports,
        complexity,
      };
    } catch (error) {
      const parsingError: ParsingError = {
        name: 'ParsingError',
        message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'syntax_error',
      };
      throw parsingError;
    }
  }

  /**
   * 提取函数信息
   */
  async extractFunctions(content: string, language: string): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return this.extractJSFunctions(lines);
      case 'python':
        return this.extractPythonFunctions(lines);
      case 'java':
        return this.extractJavaFunctions(lines);
      default:
        return this.extractGenericFunctions(lines);
    }
  }

  /**
   * 提取类信息
   */
  async extractClasses(content: string, language: string): Promise<ClassMetadata[]> {
    const lines = content.split('\n');

    switch (language) {
      case 'javascript':
      case 'typescript':
      case 'jsx':
      case 'tsx':
        return this.extractJSClasses(lines);
      case 'python':
        return this.extractPythonClasses(lines);
      case 'java':
        return this.extractJavaClasses(lines);
      default:
        return [];
    }
  }

  /**
   * 构建依赖关系图
   */
  async buildDependencyMap(files: ParsedFile[]): Promise<DependencyMap> {
    const dependencyMap: DependencyMap = {};

    for (const file of files) {
      const imports = file.imports.map(imp => imp.module);
      const exports = file.exports.map(exp => exp.name);
      
      // 分析文件间的依赖关系
      const dependencies = this.analyzeDependencies(file, files);

      dependencyMap[file.fileName] = {
        imports,
        exports,
        dependencies,
      };
    }

    return dependencyMap;
  }

  // 私有方法实现

  private normalizeLanguage(language: string): string {
    const lang = language.toLowerCase();
    if (lang === 'js') return 'javascript';
    if (lang === 'ts') return 'typescript';
    if (lang === 'py') return 'python';
    return lang;
  }

  private extractJSFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配函数声明的各种形式
      const functionPatterns = [
        /^function\s+(\w+)\s*\(([^)]*)\)/,  // function name()
        /^const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/,  // const name = () =>
        /^(\w+)\s*:\s*\(([^)]*)\)\s*=>/,  // name: () =>
        /^async\s+function\s+(\w+)\s*\(([^)]*)\)/,  // async function
        /^export\s+function\s+(\w+)\s*\(([^)]*)\)/,  // export function
      ];

      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1];
          const params = this.parseParameters(match[2] || '');
          const endLine = this.findFunctionEnd(lines, i);
          
          functions.push({
            name,
            startLine: i + 1,
            endLine,
            parameters: params,
            complexity: this.calculateFunctionComplexity(lines.slice(i, endLine)),
            dependencies: this.extractFunctionDependencies(lines.slice(i, endLine)),
            isExported: line.includes('export'),
          });
          break;
        }
      }
    }

    return functions;
  }

  private extractPythonFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配Python函数定义
      const match = line.match(/^def\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const name = match[1];
        const params = this.parsePythonParameters(match[2] || '');
        const endLine = this.findPythonFunctionEnd(lines, i);
        
        functions.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: params,
          complexity: this.calculateFunctionComplexity(lines.slice(i, endLine)),
          dependencies: this.extractFunctionDependencies(lines.slice(i, endLine)),
          isExported: true, // Python中所有函数默认可导出
        });
      }
    }

    return functions;
  }

  private extractJavaFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配Java方法定义
      const match = line.match(/^(public|private|protected)?\s*(static)?\s*(\w+)\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const name = match[4];
        const params = this.parseJavaParameters(match[5] || '');
        const endLine = this.findJavaMethodEnd(lines, i);
        
        functions.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: params,
          returnType: match[3],
          complexity: this.calculateFunctionComplexity(lines.slice(i, endLine)),
          dependencies: this.extractFunctionDependencies(lines.slice(i, endLine)),
          isExported: match[1] === 'public',
        });
      }
    }

    return functions;
  }

  private extractGenericFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 通用函数匹配模式
      const match = line.match(/(\w+)\s*\([^)]*\)\s*[{:]/);
      if (match) {
        const name = match[1];
        const endLine = this.findGenericFunctionEnd(lines, i);
        
        functions.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: [],
          complexity: this.calculateFunctionComplexity(lines.slice(i, endLine)),
          dependencies: [],
          isExported: false,
        });
      }
    }

    return functions;
  }

  private extractJSClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配类定义
      const match = line.match(/^class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
      if (match) {
        const name = match[1];
        const extendsClass = match[2];
        const implementsInterfaces = match[3]?.split(',').map(s => s.trim());
        const endLine = this.findClassEnd(lines, i);
        
        const methods = this.extractClassMethods(lines.slice(i, endLine));
        const properties = this.extractClassProperties(lines.slice(i, endLine));
        
        classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods,
          properties,
          extends: extendsClass,
          implements: implementsInterfaces,
        });
      }
    }

    return classes;
  }

  private extractPythonClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配Python类定义
      const match = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
      if (match) {
        const name = match[1];
        const parentClass = match[2];
        const endLine = this.findPythonClassEnd(lines, i);
        
        const methods = this.extractPythonClassMethods(lines.slice(i, endLine));
        
        classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods,
          properties: [], // Python属性提取较复杂，暂时留空
          extends: parentClass,
        });
      }
    }

    return classes;
  }

  private extractJavaClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 匹配Java类定义
      const match = line.match(/^(public|private)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/);
      if (match) {
        const name = match[2];
        const extendsClass = match[3];
        const implementsInterfaces = match[4]?.split(',').map(s => s.trim());
        const endLine = this.findJavaClassEnd(lines, i);
        
        const methods = this.extractJavaClassMethods(lines.slice(i, endLine));
        const properties = this.extractJavaClassProperties(lines.slice(i, endLine));
        
        classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods,
          properties,
          extends: extendsClass,
          implements: implementsInterfaces,
        });
      }
    }

    return classes;
  }

  private extractImports(content: string, language: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      switch (language) {
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
          const jsImport = this.parseJSImport(line, i + 1);
          if (jsImport) imports.push(jsImport);
          break;
        case 'python':
          const pyImport = this.parsePythonImport(line, i + 1);
          if (pyImport) imports.push(pyImport);
          break;
        case 'java':
          const javaImport = this.parseJavaImport(line, i + 1);
          if (javaImport) imports.push(javaImport);
          break;
      }
    }

    return imports;
  }

  private extractExports(content: string, language: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      switch (language) {
        case 'javascript':
        case 'typescript':
        case 'jsx':
        case 'tsx':
          const jsExport = this.parseJSExport(line, i + 1);
          if (jsExport) exports.push(jsExport);
          break;
        // Python和Java的导出机制不同，暂时不实现
      }
    }

    return exports;
  }

  // 辅助方法

  private parseParameters(paramStr: string): Parameter[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      const [name, type] = trimmed.includes(':') ? trimmed.split(':') : [trimmed, undefined];
      
      return {
        name: name.trim(),
        type: type?.trim(),
        isOptional: name.includes('?'),
        defaultValue: name.includes('=') ? name.split('=')[1]?.trim() : undefined,
      };
    });
  }

  private parsePythonParameters(paramStr: string): Parameter[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      const hasDefault = trimmed.includes('=');
      const name = hasDefault ? trimmed.split('=')[0].trim() : trimmed;
      const defaultValue = hasDefault ? trimmed.split('=')[1]?.trim() : undefined;
      
      return {
        name,
        isOptional: hasDefault,
        defaultValue,
      };
    });
  }

  private parseJavaParameters(paramStr: string): Parameter[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const parts = param.trim().split(/\s+/);
      if (parts.length >= 2) {
        return {
          name: parts[1],
          type: parts[0],
          isOptional: false,
        };
      }
      return {
        name: param.trim(),
        isOptional: false,
      };
    });
  }

  private findFunctionEnd(lines: string[], startIndex: number): number {
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    
    return lines.length;
  }

  private findPythonFunctionEnd(lines: string[], startIndex: number): number {
    const baseIndent = this.getIndentLevel(lines[startIndex]);
    
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      
      const currentIndent = this.getIndentLevel(line);
      if (currentIndent <= baseIndent) {
        return i;
      }
    }
    
    return lines.length;
  }

  private findJavaMethodEnd(lines: string[], startIndex: number): number {
    return this.findFunctionEnd(lines, startIndex);
  }

  private findGenericFunctionEnd(lines: string[], startIndex: number): number {
    return this.findFunctionEnd(lines, startIndex);
  }

  private findClassEnd(lines: string[], startIndex: number): number {
    return this.findFunctionEnd(lines, startIndex);
  }

  private findPythonClassEnd(lines: string[], startIndex: number): number {
    return this.findPythonFunctionEnd(lines, startIndex);
  }

  private findJavaClassEnd(lines: string[], startIndex: number): number {
    return this.findFunctionEnd(lines, startIndex);
  }

  private getIndentLevel(line: string): number {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') indent++;
      else if (char === '\t') indent += 4;
      else break;
    }
    return indent;
  }

  private extractClassMethods(lines: string[]): FunctionInfo[] {
    // 重用函数提取逻辑
    return this.extractJSFunctions(lines);
  }

  private extractClassProperties(lines: string[]): any[] {
    // 简化实现，返回空数组
    return [];
  }

  private extractPythonClassMethods(lines: string[]): FunctionInfo[] {
    return this.extractPythonFunctions(lines);
  }

  private extractJavaClassMethods(lines: string[]): FunctionInfo[] {
    return this.extractJavaFunctions(lines);
  }

  private extractJavaClassProperties(lines: string[]): any[] {
    return [];
  }

  private parseJSImport(line: string, lineNumber: number): ImportInfo | null {
    // import { a, b } from 'module'
    const namedImport = line.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedImport) {
      return {
        module: namedImport[2],
        imports: namedImport[1].split(',').map(s => s.trim()),
        isDefault: false,
        line: lineNumber,
      };
    }

    // import defaultExport from 'module'
    const defaultImport = line.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultImport) {
      return {
        module: defaultImport[2],
        imports: [defaultImport[1]],
        isDefault: true,
        line: lineNumber,
      };
    }

    return null;
  }

  private parsePythonImport(line: string, lineNumber: number): ImportInfo | null {
    // from module import a, b
    const fromImport = line.match(/^from\s+(\S+)\s+import\s+(.+)/);
    if (fromImport) {
      return {
        module: fromImport[1],
        imports: fromImport[2].split(',').map(s => s.trim()),
        isDefault: false,
        line: lineNumber,
      };
    }

    // import module
    const directImport = line.match(/^import\s+(\S+)/);
    if (directImport) {
      return {
        module: directImport[1],
        imports: [directImport[1]],
        isDefault: true,
        line: lineNumber,
      };
    }

    return null;
  }

  private parseJavaImport(line: string, lineNumber: number): ImportInfo | null {
    // import package.Class;
    const match = line.match(/^import\s+([^;]+);/);
    if (match) {
      const fullPath = match[1];
      const className = fullPath.split('.').pop() || fullPath;
      
      return {
        module: fullPath,
        imports: [className],
        isDefault: true,
        line: lineNumber,
      };
    }

    return null;
  }

  private parseJSExport(line: string, lineNumber: number): ExportInfo | null {
    // export function name()
    const functionExport = line.match(/^export\s+function\s+(\w+)/);
    if (functionExport) {
      return {
        name: functionExport[1],
        type: 'function',
        line: lineNumber,
      };
    }

    // export class Name
    const classExport = line.match(/^export\s+class\s+(\w+)/);
    if (classExport) {
      return {
        name: classExport[1],
        type: 'class',
        line: lineNumber,
      };
    }

    // export const name
    const constExport = line.match(/^export\s+const\s+(\w+)/);
    if (constExport) {
      return {
        name: constExport[1],
        type: 'variable',
        line: lineNumber,
      };
    }

    // export default
    if (line.match(/^export\s+default/)) {
      return {
        name: 'default',
        type: 'default',
        line: lineNumber,
      };
    }

    return null;
  }

  private calculateComplexity(content: string, functions: FunctionInfo[], classes: ClassMetadata[]): number {
    // 基于函数数量、类数量和代码行数的简单复杂度计算
    const lines = content.split('\n').length;
    const functionComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    const classComplexity = classes.length * 2;
    
    return Math.round((lines / 10) + functionComplexity + classComplexity);
  }

  private calculateBasicComplexity(content: string): number {
    return Math.round(content.split('\n').length / 10);
  }

  private calculateFunctionComplexity(lines: string[]): number {
    let complexity = 1; // 基础复杂度
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // 增加复杂度的关键字
      if (trimmed.includes('if ') || trimmed.includes('else if')) complexity++;
      if (trimmed.includes('for ') || trimmed.includes('while ')) complexity++;
      if (trimmed.includes('switch ') || trimmed.includes('case ')) complexity++;
      if (trimmed.includes('catch ') || trimmed.includes('except ')) complexity++;
      if (trimmed.includes('&&') || trimmed.includes('||')) complexity++;
    }
    
    return complexity;
  }

  private extractFunctionDependencies(lines: string[]): string[] {
    const dependencies: Set<string> = new Set();
    
    for (const line of lines) {
      // 简单的依赖提取：查找函数调用
      const matches = line.match(/(\w+)\s*\(/g);
      if (matches) {
        matches.forEach(match => {
          const funcName = match.replace(/\s*\($/, '');
          if (funcName && !['if', 'for', 'while', 'switch'].includes(funcName)) {
            dependencies.add(funcName);
          }
        });
      }
    }
    
    return Array.from(dependencies);
  }

  private analyzeDependencies(file: ParsedFile, allFiles: ParsedFile[]): string[] {
    const dependencies: Set<string> = new Set();
    
    // 基于导入语句分析依赖
    file.imports.forEach(imp => {
      const dependentFile = allFiles.find(f => 
        f.fileName.includes(imp.module) || 
        f.exports.some(exp => imp.imports.includes(exp.name))
      );
      
      if (dependentFile) {
        dependencies.add(dependentFile.fileName);
      }
    });
    
    return Array.from(dependencies);
  }
}