import { LanguageAnalyzer } from './LanguageAnalyzer';

describe('LanguageAnalyzer', () => {
  let analyzer: LanguageAnalyzer;

  beforeEach(() => {
    analyzer = new LanguageAnalyzer();
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = analyzer.getSupportedLanguages();

      expect(languages).toContain('javascript');
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('java');
      expect(languages.length).toBeGreaterThan(5);
    });
  });

  describe('analyzeJavaScript', () => {
    it('should analyze JavaScript code comprehensively', async () => {
      const jsCode = `
import { Component } from 'react';
import utils from './utils';

export class MyComponent extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  handleClick = () => {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    return <div onClick={this.handleClick}>{this.state.count}</div>;
  }
}

export const helper = (data) => {
  return data.map(item => item.value);
};

export default MyComponent;
`;

      const result = await analyzer.analyzeJavaScript(jsCode);

      expect(result.functions).toHaveLength(3); // constructor, handleClick, render, helper
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('MyComponent');
      expect(result.imports).toHaveLength(2);
      expect(result.exports).toHaveLength(3); // class, helper, default
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should handle different function patterns', async () => {
      const jsCode = `
// Function declaration
function regularFunc(a, b) {
  return a + b;
}

// Arrow function
const arrowFunc = (x) => x * 2;

// Method in object
const obj = {
  method: function(data) {
    return data.length;
  },
  
  shortMethod(value) {
    return value.toString();
  }
};

// Async function
async function asyncFunc() {
  const data = await fetch('/api');
  return data.json();
}
`;

      const result = await analyzer.analyzeJavaScript(jsCode);

      expect(result.functions.length).toBeGreaterThanOrEqual(4);
      expect(result.functions.some(f => f.name === 'regularFunc')).toBe(true);
      expect(result.functions.some(f => f.name === 'arrowFunc')).toBe(true);
      expect(result.functions.some(f => f.name === 'asyncFunc')).toBe(true);
    });
  });

  describe('analyzePython', () => {
    it('should analyze Python code comprehensively', async () => {
      const pythonCode = `
import os
from typing import List, Dict
from .utils import helper_function

class DataProcessor:
    def __init__(self, config: Dict[str, str]):
        self.config = config
        self._cache = {}
    
    def process_data(self, data: List[str]) -> List[str]:
        """Process the input data."""
        result = []
        for item in data:
            if item in self._cache:
                result.append(self._cache[item])
            else:
                processed = self._transform_item(item)
                self._cache[item] = processed
                result.append(processed)
        return result
    
    def _transform_item(self, item: str) -> str:
        return item.upper().strip()

def standalone_function(value: int = 10) -> bool:
    return value > 5

async def async_function(data: dict) -> dict:
    return {"processed": True, "data": data}
`;

      const result = await analyzer.analyzePython(pythonCode);

      expect(result.functions.length).toBeGreaterThanOrEqual(2); // standalone functions
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('DataProcessor');
      expect(result.imports).toHaveLength(3);
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should handle Python decorators and special methods', async () => {
      const pythonCode = `
from functools import wraps

def decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

class MyClass:
    def __init__(self, value):
        self.value = value
    
    def __str__(self):
        return str(self.value)
    
    @property
    def formatted_value(self):
        return f"Value: {self.value}"
    
    @staticmethod
    def static_method():
        return "static"
    
    @classmethod
    def class_method(cls):
        return cls()
`;

      const result = await analyzer.analyzePython(pythonCode);

      expect(result.classes).toHaveLength(1);
      expect(result.functions.length).toBeGreaterThanOrEqual(1); // decorator and other functions
      expect(result.classes[0].methods.length).toBeGreaterThan(3);
    });
  });

  describe('analyzeJava', () => {
    it('should analyze Java code comprehensively', async () => {
      const javaCode = `
package com.example.app;

import java.util.List;
import java.util.ArrayList;
import java.io.IOException;

public class DataService {
    private List<String> data;
    private static final String DEFAULT_VALUE = "default";
    
    public DataService() {
        this.data = new ArrayList<>();
    }
    
    public void addData(String item) throws IllegalArgumentException {
        if (item == null || item.isEmpty()) {
            throw new IllegalArgumentException("Item cannot be null or empty");
        }
        data.add(item);
    }
    
    public List<String> getData() {
        return new ArrayList<>(data);
    }
    
    private boolean validateData(String item) {
        return item != null && !item.trim().isEmpty();
    }
    
    public static String getDefaultValue() {
        return DEFAULT_VALUE;
    }
}

interface DataProcessor {
    void process(List<String> data) throws IOException;
}
`;

      const result = await analyzer.analyzeJava(javaCode);

      expect(result.classes).toHaveLength(2); // class and interface
      expect(result.classes[0].name).toBe('DataService');
      expect(result.methods.length).toBeGreaterThan(4);
      expect(result.imports).toHaveLength(3);
      expect(result.packageName).toBe('com.example.app');
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should handle Java inheritance and interfaces', async () => {
      const javaCode = `
public abstract class Animal {
    protected String name;
    
    public Animal(String name) {
        this.name = name;
    }
    
    public abstract void makeSound();
    
    public String getName() {
        return name;
    }
}

public class Dog extends Animal implements Comparable<Dog> {
    private String breed;
    
    public Dog(String name, String breed) {
        super(name);
        this.breed = breed;
    }
    
    @Override
    public void makeSound() {
        System.out.println("Woof!");
    }
    
    @Override
    public int compareTo(Dog other) {
        return this.name.compareTo(other.name);
    }
}
`;

      const result = await analyzer.analyzeJava(javaCode);

      expect(result.classes).toHaveLength(2);
      expect(result.classes[0].name).toBe('Animal');
      expect(result.classes[1].name).toBe('Dog');
      expect(result.classes[1].extends).toBe('Animal');
      expect(result.classes[1].implements).toContain('Comparable<Dog>');
    });
  });

  describe('analyzeGeneric', () => {
    it('should analyze unsupported languages with basic patterns', async () => {
      const cCode = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}

int add(int a, int b) {
    return a + b;
}

struct Point {
    int x;
    int y;
};
`;

      const result = await analyzer.analyzeGeneric(cCode, 'c');

      expect(result.language).toBe('c');
      expect(result.functions.length).toBeGreaterThanOrEqual(1);
      expect(result.complexity).toBeGreaterThan(0);
    });

    it('should handle Go code patterns', async () => {
      const goCode = `
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}

func add(a, b int) int {
    return a + b
}

type Person struct {
    Name string
    Age  int
}

func (p Person) Greet() string {
    return fmt.Sprintf("Hello, I'm %s", p.Name)
}
`;

      const result = await analyzer.analyzeGeneric(goCode, 'go');

      expect(result.language).toBe('go');
      expect(result.functions.length).toBeGreaterThanOrEqual(2);
      expect(result.complexity).toBeGreaterThan(0);
    });
  });

  describe('complexity calculation', () => {
    it('should calculate higher complexity for complex JavaScript code', async () => {
      const simpleCode = `
function simple() {
    return 42;
}
`;

      const complexCode = `
async function complex(data) {
    const promises = data.map(async (item) => {
        try {
            const result = await processItem(item);
            if (result && result.isValid) {
                return result.value;
            } else {
                throw new Error('Invalid result');
            }
        } catch (error) {
            console.error('Processing failed:', error);
            return null;
        }
    });
    
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}
`;

      const simpleResult = await analyzer.analyzeJavaScript(simpleCode);
      const complexResult = await analyzer.analyzeJavaScript(complexCode);

      expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
    });
  });

  describe('error handling', () => {
    it('should handle malformed code gracefully', async () => {
      const malformedCode = 'function incomplete( {';

      // Should not throw, but return basic analysis
      const result = await analyzer.analyzeJavaScript(malformedCode);

      expect(result.functions).toBeDefined();
      expect(result.classes).toBeDefined();
      expect(result.imports).toBeDefined();
      expect(result.exports).toBeDefined();
    });

    it('should handle empty code', async () => {
      const result = await analyzer.analyzeJavaScript('');

      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      expect(result.exports).toHaveLength(0);
      expect(result.complexity).toBe(0);
    });
  });
});