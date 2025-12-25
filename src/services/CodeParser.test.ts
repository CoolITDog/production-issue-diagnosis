import { CodeParser } from './CodeParser';

describe('CodeParser', () => {
  let codeParser: CodeParser;

  beforeEach(() => {
    codeParser = new CodeParser();
  });

  describe('parseFile', () => {
    it('should parse JavaScript function correctly', async () => {
      const jsCode = `
function calculateSum(a, b) {
  if (a > 0 && b > 0) {
    return a + b;
  }
  return 0;
}

const multiply = (x, y) => x * y;
`;

      const result = await codeParser.parseFile(jsCode, 'javascript');

      expect(result.language).toBe('javascript');
      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].name).toBe('calculateSum');
      expect(result.functions[0].parameters).toHaveLength(2);
      expect(result.functions[1].name).toBe('multiply');
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should parse Python function correctly', async () => {
      const pythonCode = `
def calculate_area(length: float, width: float) -> float:
    """Calculate the area of a rectangle."""
    if length > 0 and width > 0:
        return length * width
    return 0.0

class Rectangle:
    def __init__(self, length: float, width: float):
        self.length = length
        self.width = width
    
    def get_area(self) -> float:
        return calculate_area(self.length, self.width)
`;

      const result = await codeParser.parseFile(pythonCode, 'python');

      expect(result.language).toBe('python');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.functions.some(f => f.name === 'calculate_area')).toBe(true);
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('Rectangle');
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should handle unsupported language gracefully', async () => {
      const unknownCode = 'some random text';

      const result = await codeParser.parseFile(unknownCode, 'unknown');

      expect(result.language).toBe('unknown');
      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.complexity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('extractFunctions', () => {
    it('should extract JavaScript functions with different patterns', async () => {
      const jsCode = `
// Regular function
function regularFunction(param1, param2) {
  return param1 + param2;
}

// Arrow function
const arrowFunction = (a, b) => a * b;

// Async function
async function asyncFunction() {
  return await fetch('/api/data');
}

// Export function
export function exportedFunction(data) {
  return data.map(item => item.id);
}
`;

      const functions = await codeParser.extractFunctions(jsCode, 'javascript');

      expect(functions).toHaveLength(4);
      expect(functions[0].name).toBe('regularFunction');
      expect(functions[1].name).toBe('arrowFunction');
      expect(functions[2].name).toBe('asyncFunction');
      expect(functions[3].name).toBe('exportedFunction');
      expect(functions[3].isExported).toBe(true);
    });

    it('should extract Python functions with type hints', async () => {
      const pythonCode = `
def simple_function():
    pass

def typed_function(name: str, age: int = 25) -> str:
    return f"{name} is {age} years old"

async def async_function(data: list) -> dict:
    return {"processed": len(data)}
`;

      const functions = await codeParser.extractFunctions(pythonCode, 'python');

      expect(functions.length).toBeGreaterThanOrEqual(2);
      expect(functions.some(f => f.name === 'simple_function')).toBe(true);
      expect(functions.some(f => f.name === 'typed_function')).toBe(true);
      
      const typedFunc = functions.find(f => f.name === 'typed_function');
      if (typedFunc) {
        expect(typedFunc.parameters.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('extractClasses', () => {
    it('should extract JavaScript/TypeScript classes', async () => {
      const tsCode = `
class BaseClass {
  constructor(name) {
    this.name = name;
  }
}

class ExtendedClass extends BaseClass implements Serializable {
  constructor(name, id) {
    super(name);
    this.id = id;
  }

  serialize() {
    return JSON.stringify(this);
  }
}

export class ExportedClass {
  static staticMethod() {
    return 'static';
  }
}
`;

      const classes = await codeParser.extractClasses(tsCode, 'typescript');

      expect(classes.length).toBeGreaterThanOrEqual(2);
      expect(classes.some(c => c.name === 'BaseClass')).toBe(true);
      expect(classes.some(c => c.name === 'ExtendedClass')).toBe(true);
      
      const extendedClass = classes.find(c => c.name === 'ExtendedClass');
      if (extendedClass) {
        expect(extendedClass.extends).toBe('BaseClass');
        expect(extendedClass.implements).toContain('Serializable');
      }
    });

    it('should extract Python classes with inheritance', async () => {
      const pythonCode = `
class Animal:
    def __init__(self, name: str):
        self.name = name
    
    def speak(self) -> str:
        pass

class Dog(Animal):
    def __init__(self, name: str, breed: str):
        super().__init__(name)
        self.breed = breed
    
    def speak(self) -> str:
        return f"{self.name} barks!"
`;

      const classes = await codeParser.extractClasses(pythonCode, 'python');

      expect(classes).toHaveLength(2);
      expect(classes[0].name).toBe('Animal');
      expect(classes[1].name).toBe('Dog');
      expect(classes[1].extends).toBe('Animal');
    });
  });

  describe('buildDependencyMap', () => {
    it('should build dependency map from parsed files', async () => {
      const parsedFiles = [
        {
          fileName: 'utils.js',
          language: 'javascript',
          functions: [],
          classes: [],
          imports: [
            { module: 'lodash', imports: ['map', 'filter'], isDefault: false, line: 1 }
          ],
          exports: [
            { name: 'processData', type: 'function' as const, line: 5 }
          ],
          complexity: 5
        },
        {
          fileName: 'main.js',
          language: 'javascript',
          functions: [],
          classes: [],
          imports: [
            { module: './utils', imports: ['processData'], isDefault: false, line: 1 }
          ],
          exports: [],
          complexity: 3
        }
      ];

      const dependencyMap = await codeParser.buildDependencyMap(parsedFiles);

      expect(Object.keys(dependencyMap)).toContain('utils.js');
      expect(Object.keys(dependencyMap)).toContain('main.js');
      expect(dependencyMap['utils.js'].imports).toContain('lodash');
      expect(dependencyMap['utils.js'].exports).toContain('processData');
      expect(dependencyMap['main.js'].imports).toContain('./utils');
    });
  });

  describe('error handling', () => {
    it('should handle parsing errors gracefully', async () => {
      const invalidCode = 'function incomplete(';

      // Should not throw, but return basic analysis
      const result = await codeParser.parseFile(invalidCode, 'javascript');
      
      expect(result.functions).toBeDefined();
      expect(result.classes).toBeDefined();
      expect(result.complexity).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty content', async () => {
      const result = await codeParser.parseFile('', 'javascript');

      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.complexity).toBe(0);
    });
  });
});