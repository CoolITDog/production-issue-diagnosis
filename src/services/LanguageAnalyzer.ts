import {
  LanguageAnalyzer as ILanguageAnalyzer,
  JSAnalysisResult,
  PythonAnalysisResult,
  JavaAnalysisResult,
  GenericAnalysisResult,
  FunctionInfo,
  ClassMetadata,
  ImportInfo,
  ExportInfo,
} from '../types';

/**
 * 语言分析器 - 针对不同编程语言的专门分析
 * 实现需求 2.2, 2.4: 支持多种编程语言的代码分析
 */
export class LanguageAnalyzer implements ILanguageAnalyzer {
  private readonly supportedLanguages = [
    'javascript',
    'typescript',
    'python',
    'java',
    'jsx',
    'tsx',
    'c',
    'cpp',
    'csharp',
    'go',
    'rust',
  ];

  /**
   * 获取支持的编程语言列表
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * 分析JavaScript/TypeScript代码
   */
  async analyzeJavaScript(content: string): Promise<JSAnalysisResult> {
    const lines = content.split('\n');
    
    const functions = this.extractJSFunctions(lines);
    const classes = this.extractJSClasses(lines);
    const imports = this.extractJSImports(lines);
    const exports = this.extractJSExports(lines);
    const complexity = this.calculateJSComplexity(content, functions, classes);

    return {
      functions,
      classes,
      imports,
      exports,
      complexity,
    };
  }

  /**
   * 分析Python代码
   */
  async analyzePython(content: string): Promise<PythonAnalysisResult> {
    const lines = content.split('\n');
    
    const functions = this.extractPythonFunctions(lines);
    const classes = this.extractPythonClasses(lines);
    const imports = this.extractPythonImports(lines);
    const complexity = this.calculatePythonComplexity(content, functions, classes);

    return {
      functions,
      classes,
      imports,
      complexity,
    };
  }

  /**
   * 分析Java代码
   */
  async analyzeJava(content: string): Promise<JavaAnalysisResult> {
    const lines = content.split('\n');
    
    const classes = this.extractJavaClasses(lines);
    const methods = this.extractJavaMethods(lines);
    const imports = this.extractJavaImports(lines);
    const packageName = this.extractJavaPackage(content);
    const complexity = this.calculateJavaComplexity(content, methods, classes);

    return {
      classes,
      methods,
      imports,
      packageName,
      complexity,
    };
  }

  /**
   * 通用代码分析（用于不完全支持的语言）
   */
  async analyzeGeneric(content: string, language: string): Promise<GenericAnalysisResult> {
    const lines = content.split('\n');
    
    const functions = this.extractGenericFunctions(lines, language);
    const classes = this.extractGenericClasses(lines, language);
    const complexity = this.calculateGenericComplexity(content);

    return {
      functions,
      classes,
      complexity,
      language,
    };
  }

  // JavaScript/TypeScript 分析方法

  private extractJSFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 各种JavaScript函数定义模式
      const patterns = [
        // function declaration
        { regex: /^function\s+(\w+)\s*\(([^)]*)\)/, type: 'declaration' },
        // arrow function with const
        { regex: /^const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/, type: 'arrow' },
        // arrow function with let
        { regex: /^let\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/, type: 'arrow' },
        // method in object
        { regex: /^(\w+)\s*:\s*function\s*\(([^)]*)\)/, type: 'method' },
        // method shorthand
        { regex: /^(\w+)\s*\(([^)]*)\)\s*\{/, type: 'method' },
        // async function
        { regex: /^async\s+function\s+(\w+)\s*\(([^)]*)\)/, type: 'async' },
        // export function
        { regex: /^export\s+function\s+(\w+)\s*\(([^)]*)\)/, type: 'export' },
        // export const arrow
        { regex: /^export\s+const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/, type: 'export_arrow' },
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const name = match[1];
          const params = this.parseJSParameters(match[2] || '');
          const endLine = this.findJSFunctionEnd(lines, i);
          const functionLines = lines.slice(i, endLine);
          
          functions.push({
            name,
            startLine: i + 1,
            endLine,
            parameters: params,
            returnType: this.inferJSReturnType(functionLines),
            complexity: this.calculateFunctionComplexity(functionLines),
            dependencies: this.extractJSFunctionDependencies(functionLines),
            isExported: line.includes('export') || pattern.type.includes('export'),
          });
          break;
        }
      }
    }

    return functions;
  }

  private extractJSClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 类定义模式
      const patterns = [
        /^class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/,
        /^export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1];
          const extendsClass = match[2];
          const implementsInterfaces = match[3]?.split(',').map(s => s.trim().replace(/\s+/g, ' '));
          const endLine = this.findJSClassEnd(lines, i);
          const classLines = lines.slice(i, endLine);
          
          const methods = this.extractJSClassMethods(classLines);
          const properties = this.extractJSClassProperties(classLines);
          
          classes.push({
            name,
            startLine: i + 1,
            endLine,
            methods,
            properties,
            extends: extendsClass,
            implements: implementsInterfaces,
          });
          break;
        }
      }
    }

    return classes;
  }

  private extractJSImports(lines: string[]): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 各种import模式
      const patterns = [
        // import { a, b } from 'module'
        { regex: /^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/, type: 'named' },
        // import defaultExport from 'module'
        { regex: /^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/, type: 'default' },
        // import * as name from 'module'
        { regex: /^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/, type: 'namespace' },
        // import 'module' (side effect)
        { regex: /^import\s+['"]([^'"]+)['"]/, type: 'side_effect' },
        // import defaultExport, { named } from 'module'
        { regex: /^import\s+(\w+),\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/, type: 'mixed' },
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          let module: string;
          let importNames: string[];
          let isDefault = false;

          switch (pattern.type) {
            case 'named':
              module = match[2];
              importNames = match[1].split(',').map(s => s.trim());
              break;
            case 'default':
              module = match[2];
              importNames = [match[1]];
              isDefault = true;
              break;
            case 'namespace':
              module = match[2];
              importNames = [match[1]];
              break;
            case 'side_effect':
              module = match[1];
              importNames = [];
              break;
            case 'mixed':
              module = match[3];
              importNames = [match[1], ...match[2].split(',').map(s => s.trim())];
              isDefault = true;
              break;
            default:
              continue;
          }

          imports.push({
            module,
            imports: importNames,
            isDefault,
            line: i + 1,
          });
          break;
        }
      }
    }

    return imports;
  }

  private extractJSExports(lines: string[]): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 各种export模式
      const patterns = [
        // export function name()
        { regex: /^export\s+function\s+(\w+)/, type: 'function' },
        // export class Name
        { regex: /^export\s+class\s+(\w+)/, type: 'class' },
        // export const name
        { regex: /^export\s+const\s+(\w+)/, type: 'variable' },
        // export let name
        { regex: /^export\s+let\s+(\w+)/, type: 'variable' },
        // export var name
        { regex: /^export\s+var\s+(\w+)/, type: 'variable' },
        // export default
        { regex: /^export\s+default/, type: 'default' },
        // export { name }
        { regex: /^export\s+\{([^}]+)\}/, type: 'named_export' },
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          if (pattern.type === 'named_export') {
            // 处理 export { a, b }
            const names = match[1].split(',').map(s => s.trim());
            names.forEach(name => {
              exports.push({
                name: name.split(' as ')[0].trim(), // 处理 export { a as b }
                type: 'variable',
                line: i + 1,
              });
            });
          } else if (pattern.type === 'default') {
            exports.push({
              name: 'default',
              type: 'default',
              line: i + 1,
            });
          } else {
            exports.push({
              name: match[1],
              type: pattern.type as 'function' | 'class' | 'variable',
              line: i + 1,
            });
          }
          break;
        }
      }
    }

    return exports;
  }

  // Python 分析方法

  private extractPythonFunctions(lines: string[]): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Python函数定义模式
      const patterns = [
        /^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/,  // def name(params) -> return_type:
        /^async\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?:/,  // async def
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1];
          const params = this.parsePythonParameters(match[2] || '');
          const returnType = match[3]?.trim();
          const endLine = this.findPythonFunctionEnd(lines, i);
          const functionLines = lines.slice(i, endLine);
          
          functions.push({
            name,
            startLine: i + 1,
            endLine,
            parameters: params,
            returnType,
            complexity: this.calculateFunctionComplexity(functionLines),
            dependencies: this.extractPythonFunctionDependencies(functionLines),
            isExported: !name.startsWith('_'), // Python约定：下划线开头为私有
          });
          break;
        }
      }
    }

    return functions;
  }

  private extractPythonClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Python类定义
      const match = line.match(/^class\s+(\w+)(?:\(([^)]+)\))?:/);
      if (match) {
        const name = match[1];
        const parentClasses = match[2]?.split(',').map(s => s.trim());
        const endLine = this.findPythonClassEnd(lines, i);
        const classLines = lines.slice(i, endLine);
        
        const methods = this.extractPythonClassMethods(classLines);
        const properties = this.extractPythonClassProperties(classLines);
        
        classes.push({
          name,
          startLine: i + 1,
          endLine,
          methods,
          properties,
          extends: parentClasses?.[0], // Python支持多继承，这里只取第一个
          implements: parentClasses?.slice(1), // 其他作为接口
        });
      }
    }

    return classes;
  }

  private extractPythonImports(lines: string[]): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Python import模式
      const patterns = [
        // from module import a, b
        { regex: /^from\s+([^\s]+)\s+import\s+(.+)/, type: 'from_import' },
        // import module
        { regex: /^import\s+([^\s]+)(?:\s+as\s+(\w+))?/, type: 'import' },
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          let module: string;
          let importNames: string[];

          if (pattern.type === 'from_import') {
            module = match[1];
            importNames = match[2].split(',').map(s => {
              const trimmed = s.trim();
              return trimmed.includes(' as ') ? trimmed.split(' as ')[1] : trimmed;
            });
          } else {
            module = match[1];
            importNames = [match[2] || match[1].split('.').pop() || match[1]];
          }

          imports.push({
            module,
            imports: importNames,
            isDefault: pattern.type === 'import',
            line: i + 1,
          });
          break;
        }
      }
    }

    return imports;
  }

  // Java 分析方法

  private extractJavaClasses(lines: string[]): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Java类定义模式
      const patterns = [
        /^(?:public\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/,
        /^(?:public\s+)?interface\s+(\w+)(?:\s+extends\s+([^{]+))?/,
        /^(?:public\s+)?enum\s+(\w+)/,
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1];
          const extendsClass = match[2];
          const implementsInterfaces = match[3]?.split(',').map(s => s.trim());
          const endLine = this.findJavaClassEnd(lines, i);
          const classLines = lines.slice(i, endLine);
          
          const methods = this.extractJavaClassMethods(classLines);
          const properties = this.extractJavaClassProperties(classLines);
          
          classes.push({
            name,
            startLine: i + 1,
            endLine,
            methods,
            properties,
            extends: extendsClass,
            implements: implementsInterfaces,
          });
          break;
        }
      }
    }

    return classes;
  }

  private extractJavaMethods(lines: string[]): FunctionInfo[] {
    const methods: FunctionInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Java方法定义模式
      const match = line.match(/^(?:public|private|protected)?\s*(?:static)?\s*(?:final)?\s*(\w+)\s+(\w+)\s*\(([^)]*)\)/);
      if (match) {
        const returnType = match[1];
        const name = match[2];
        const params = this.parseJavaParameters(match[3] || '');
        const endLine = this.findJavaMethodEnd(lines, i);
        const methodLines = lines.slice(i, endLine);
        
        methods.push({
          name,
          startLine: i + 1,
          endLine,
          parameters: params,
          returnType,
          complexity: this.calculateFunctionComplexity(methodLines),
          dependencies: this.extractJavaMethodDependencies(methodLines),
          isExported: line.includes('public'),
        });
      }
    }

    return methods;
  }

  private extractJavaImports(lines: string[]): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Java import模式
      const patterns = [
        /^import\s+static\s+([^;]+);/,  // static import
        /^import\s+([^;]+);/,          // regular import
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const fullPath = match[1];
          const className = fullPath.split('.').pop() || fullPath;
          
          imports.push({
            module: fullPath,
            imports: [className],
            isDefault: true,
            line: i + 1,
          });
          break;
        }
      }
    }

    return imports;
  }

  private extractJavaPackage(content: string): string | undefined {
    const match = content.match(/^package\s+([^;]+);/m);
    return match?.[1];
  }

  // 通用分析方法

  private extractGenericFunctions(lines: string[], language: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    
    // 基于语言的通用函数模式
    const patterns = this.getGenericFunctionPatterns(language);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1] || 'unknown';
          const endLine = this.findGenericFunctionEnd(lines, i, language);
          
          functions.push({
            name,
            startLine: i + 1,
            endLine,
            parameters: [],
            complexity: this.calculateFunctionComplexity(lines.slice(i, endLine)),
            dependencies: [],
            isExported: false,
          });
          break;
        }
      }
    }

    return functions;
  }

  private extractGenericClasses(lines: string[], language: string): ClassMetadata[] {
    const classes: ClassMetadata[] = [];
    
    const patterns = this.getGenericClassPatterns(language);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[1] || 'unknown';
          const endLine = this.findGenericClassEnd(lines, i, language);
          
          classes.push({
            name,
            startLine: i + 1,
            endLine,
            methods: [],
            properties: [],
          });
          break;
        }
      }
    }

    return classes;
  }

  // 辅助方法

  private parseJSParameters(paramStr: string): any[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      
      // 处理TypeScript类型注解
      const typeMatch = trimmed.match(/^(\w+)(?:\?)?:\s*([^=]+)(?:\s*=\s*(.+))?$/);
      if (typeMatch) {
        return {
          name: typeMatch[1],
          type: typeMatch[2].trim(),
          isOptional: trimmed.includes('?') || !!typeMatch[3],
          defaultValue: typeMatch[3]?.trim(),
        };
      }
      
      // 处理默认参数
      const defaultMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (defaultMatch) {
        return {
          name: defaultMatch[1],
          isOptional: true,
          defaultValue: defaultMatch[2].trim(),
        };
      }
      
      // 处理解构参数
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        return {
          name: trimmed,
          isOptional: false,
        };
      }
      
      return {
        name: trimmed,
        isOptional: false,
      };
    });
  }

  private parsePythonParameters(paramStr: string): any[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const trimmed = param.trim();
      
      // 处理类型注解 name: type = default
      const typeMatch = trimmed.match(/^(\w+):\s*([^=]+)(?:\s*=\s*(.+))?$/);
      if (typeMatch) {
        return {
          name: typeMatch[1],
          type: typeMatch[2].trim(),
          isOptional: !!typeMatch[3],
          defaultValue: typeMatch[3]?.trim(),
        };
      }
      
      // 处理默认参数 name=default
      const defaultMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
      if (defaultMatch) {
        return {
          name: defaultMatch[1],
          isOptional: true,
          defaultValue: defaultMatch[2].trim(),
        };
      }
      
      return {
        name: trimmed,
        isOptional: false,
      };
    });
  }

  private parseJavaParameters(paramStr: string): any[] {
    if (!paramStr.trim()) return [];
    
    return paramStr.split(',').map(param => {
      const parts = param.trim().split(/\s+/);
      if (parts.length >= 2) {
        return {
          name: parts[parts.length - 1],
          type: parts.slice(0, -1).join(' '),
          isOptional: false,
        };
      }
      return {
        name: param.trim(),
        isOptional: false,
      };
    });
  }

  private getGenericFunctionPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      c: [/^(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/],
      cpp: [/^(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/],
      csharp: [/^(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\([^)]*\)/],
      go: [/^func\s+(\w+)\s*\([^)]*\)/],
      rust: [/^fn\s+(\w+)\s*\([^)]*\)/],
    };
    
    return patterns[language] || [/(\w+)\s*\([^)]*\)\s*[{:]/];
  }

  private getGenericClassPatterns(language: string): RegExp[] {
    const patterns: Record<string, RegExp[]> = {
      c: [],
      cpp: [/^class\s+(\w+)/],
      csharp: [/^(?:public|private)?\s*class\s+(\w+)/],
      go: [/^type\s+(\w+)\s+struct/],
      rust: [/^struct\s+(\w+)/, /^enum\s+(\w+)/],
    };
    
    return patterns[language] || [/^class\s+(\w+)/];
  }

  // 复杂度计算方法

  private calculateJSComplexity(content: string, functions: FunctionInfo[], classes: ClassMetadata[]): number {
    const lines = content.split('\n').length;
    const functionComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    const classComplexity = classes.length * 3;
    
    // JavaScript特有的复杂度因子
    const asyncCount = (content.match(/async|await/g) || []).length;
    const promiseCount = (content.match(/Promise|\.then|\.catch/g) || []).length;
    
    return Math.round((lines / 15) + functionComplexity + classComplexity + asyncCount + promiseCount);
  }

  private calculatePythonComplexity(content: string, functions: FunctionInfo[], classes: ClassMetadata[]): number {
    const lines = content.split('\n').length;
    const functionComplexity = functions.reduce((sum, fn) => sum + fn.complexity, 0);
    const classComplexity = classes.length * 2;
    
    // Python特有的复杂度因子
    const decoratorCount = (content.match(/@\w+/g) || []).length;
    const comprehensionCount = (content.match(/\[.*for.*in.*\]|\{.*for.*in.*\}/g) || []).length;
    
    return Math.round((lines / 12) + functionComplexity + classComplexity + decoratorCount + comprehensionCount);
  }

  private calculateJavaComplexity(content: string, methods: FunctionInfo[], classes: ClassMetadata[]): number {
    const lines = content.split('\n').length;
    const methodComplexity = methods.reduce((sum, method) => sum + method.complexity, 0);
    const classComplexity = classes.length * 4;
    
    // Java特有的复杂度因子
    const interfaceCount = (content.match(/interface\s+\w+/g) || []).length;
    const annotationCount = (content.match(/@\w+/g) || []).length;
    
    return Math.round((lines / 20) + methodComplexity + classComplexity + interfaceCount + annotationCount);
  }

  private calculateGenericComplexity(content: string): number {
    const lines = content.split('\n').length;
    const braceCount = (content.match(/[{}]/g) || []).length;
    const controlCount = (content.match(/\b(if|for|while|switch|case)\b/g) || []).length;
    
    return Math.round((lines / 10) + (braceCount / 2) + controlCount);
  }

  private calculateFunctionComplexity(lines: string[]): number {
    let complexity = 1; // 基础复杂度
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      // 控制流语句增加复杂度
      if (/\b(if|else\s+if|elif)\b/.test(trimmed)) complexity++;
      if (/\b(for|while|do)\b/.test(trimmed)) complexity++;
      if (/\b(switch|case)\b/.test(trimmed)) complexity++;
      if (/\b(try|catch|except|finally)\b/.test(trimmed)) complexity++;
      if (/\b(break|continue|return)\b/.test(trimmed)) complexity++;
      
      // 逻辑操作符
      if (/&&|\|\||and\s+|or\s+/.test(trimmed)) complexity++;
      
      // 三元操作符
      if (/\?.*:/.test(trimmed)) complexity++;
    }
    
    return complexity;
  }

  // 查找函数/类结束位置的方法

  private findJSFunctionEnd(lines: string[], startIndex: number): number {
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findJSClassEnd(lines: string[], startIndex: number): number {
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findPythonFunctionEnd(lines: string[], startIndex: number): number {
    return this.findIndentBlockEnd(lines, startIndex);
  }

  private findPythonClassEnd(lines: string[], startIndex: number): number {
    return this.findIndentBlockEnd(lines, startIndex);
  }

  private findJavaMethodEnd(lines: string[], startIndex: number): number {
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findJavaClassEnd(lines: string[], startIndex: number): number {
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findGenericFunctionEnd(lines: string[], startIndex: number, language: string): number {
    if (['python'].includes(language)) {
      return this.findIndentBlockEnd(lines, startIndex);
    }
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findGenericClassEnd(lines: string[], startIndex: number, language: string): number {
    if (['python'].includes(language)) {
      return this.findIndentBlockEnd(lines, startIndex);
    }
    return this.findBlockEnd(lines, startIndex, '{', '}');
  }

  private findBlockEnd(lines: string[], startIndex: number, openChar: string, closeChar: string): number {
    let braceCount = 0;
    let inBlock = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === openChar) {
          braceCount++;
          inBlock = true;
        } else if (char === closeChar) {
          braceCount--;
          if (inBlock && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }
    
    return lines.length;
  }

  private findIndentBlockEnd(lines: string[], startIndex: number): number {
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

  private getIndentLevel(line: string): number {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') indent++;
      else if (char === '\t') indent += 4;
      else break;
    }
    return indent;
  }

  // 提取类方法和属性

  private extractJSClassMethods(lines: string[]): FunctionInfo[] {
    return this.extractJSFunctions(lines);
  }

  private extractJSClassProperties(lines: string[]): any[] {
    const properties: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 类属性模式
      const patterns = [
        /^(public|private|protected)?\s*(\w+)\s*[:=]/,  // TypeScript property
        /^this\.(\w+)\s*=/,  // JavaScript property assignment
      ];

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const name = match[2] || match[1];
          const isPublic = !match[1] || match[1] === 'public';
          
          properties.push({
            name,
            type: undefined,
            isPublic,
            isStatic: line.includes('static'),
          });
          break;
        }
      }
    }
    
    return properties;
  }

  private extractPythonClassMethods(lines: string[]): FunctionInfo[] {
    return this.extractPythonFunctions(lines);
  }

  private extractPythonClassProperties(lines: string[]): any[] {
    const properties: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Python类属性模式
      const match = trimmed.match(/^self\.(\w+)\s*=/);
      if (match) {
        properties.push({
          name: match[1],
          isPublic: !match[1].startsWith('_'),
          isStatic: false,
        });
      }
    }
    
    return properties;
  }

  private extractJavaClassMethods(lines: string[]): FunctionInfo[] {
    return this.extractJavaMethods(lines);
  }

  private extractJavaClassProperties(lines: string[]): any[] {
    const properties: any[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Java字段定义模式
      const match = trimmed.match(/^(public|private|protected)?\s*(static)?\s*(final)?\s*(\w+)\s+(\w+)/);
      if (match && !trimmed.includes('(')) { // 排除方法
        const visibility = match[1] || 'package';
        const isStatic = !!match[2];
        const type = match[4];
        const name = match[5];
        
        properties.push({
          name,
          type,
          isPublic: visibility === 'public',
          isStatic,
        });
      }
    }
    
    return properties;
  }

  // 提取依赖关系

  private extractJSFunctionDependencies(lines: string[]): string[] {
    const dependencies: Set<string> = new Set();
    
    for (const line of lines) {
      // 函数调用模式
      const calls = line.match(/(\w+)\s*\(/g);
      if (calls) {
        calls.forEach(call => {
          const funcName = call.replace(/\s*\($/, '');
          if (funcName && !this.isJSKeyword(funcName)) {
            dependencies.add(funcName);
          }
        });
      }
      
      // 对象方法调用
      const methodCalls = line.match(/(\w+)\.(\w+)\s*\(/g);
      if (methodCalls) {
        methodCalls.forEach(call => {
          const parts = call.split('.');
          if (parts.length >= 2) {
            dependencies.add(parts[0]);
          }
        });
      }
    }
    
    return Array.from(dependencies);
  }

  private extractPythonFunctionDependencies(lines: string[]): string[] {
    const dependencies: Set<string> = new Set();
    
    for (const line of lines) {
      // 函数调用模式
      const calls = line.match(/(\w+)\s*\(/g);
      if (calls) {
        calls.forEach(call => {
          const funcName = call.replace(/\s*\($/, '');
          if (funcName && !this.isPythonKeyword(funcName)) {
            dependencies.add(funcName);
          }
        });
      }
    }
    
    return Array.from(dependencies);
  }

  private extractJavaMethodDependencies(lines: string[]): string[] {
    const dependencies: Set<string> = new Set();
    
    for (const line of lines) {
      // 方法调用模式
      const calls = line.match(/(\w+)\s*\(/g);
      if (calls) {
        calls.forEach(call => {
          const methodName = call.replace(/\s*\($/, '');
          if (methodName && !this.isJavaKeyword(methodName)) {
            dependencies.add(methodName);
          }
        });
      }
    }
    
    return Array.from(dependencies);
  }

  // 类型推断

  private inferJSReturnType(lines: string[]): string | undefined {
    for (const line of lines) {
      const returnMatch = line.match(/return\s+(.+);?/);
      if (returnMatch) {
        const returnValue = returnMatch[1].trim();
        
        if (returnValue.match(/^['"`]/)) return 'string';
        if (returnValue.match(/^\d+$/)) return 'number';
        if (returnValue.match(/^(true|false)$/)) return 'boolean';
        if (returnValue.match(/^\[/)) return 'array';
        if (returnValue.match(/^\{/)) return 'object';
        if (returnValue === 'null') return 'null';
        if (returnValue === 'undefined') return 'undefined';
        
        return 'any';
      }
    }
    
    return undefined;
  }

  // 关键字检查

  private isJSKeyword(word: string): boolean {
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'function', 'return', 'var', 'let', 'const', 'class', 'extends', 'import',
      'export', 'default', 'try', 'catch', 'finally', 'throw', 'new', 'this',
      'super', 'static', 'async', 'await', 'yield', 'typeof', 'instanceof',
      'console', 'log', 'error', 'warn', 'info', 'debug'
    ];
    return keywords.includes(word);
  }

  private isPythonKeyword(word: string): boolean {
    const keywords = [
      'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'def', 'class',
      'return', 'yield', 'import', 'from', 'as', 'try', 'except', 'finally',
      'raise', 'with', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None',
      'True', 'False', 'self', 'cls', 'print', 'len', 'range', 'enumerate'
    ];
    return keywords.includes(word);
  }

  private isJavaKeyword(word: string): boolean {
    const keywords = [
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'class', 'interface', 'extends', 'implements', 'import', 'package',
      'public', 'private', 'protected', 'static', 'final', 'abstract',
      'return', 'throw', 'throws', 'try', 'catch', 'finally', 'new', 'this',
      'super', 'void', 'int', 'String', 'boolean', 'System', 'out', 'println'
    ];
    return keywords.includes(word);
  }
}