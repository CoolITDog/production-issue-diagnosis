import { DataParser } from './DataParser';

/**
 * Unit tests for DataParser
 * Tests multi-format data parsing functionality
 */

describe('DataParser Tests', () => {
  let dataParser: DataParser;

  beforeEach(() => {
    dataParser = new DataParser();
  });

  describe('JSON Parsing', () => {
    it('should parse valid JSON objects', async () => {
      const jsonData = '{"name": "test", "value": 123, "active": true}';
      const result = await dataParser.parseData(jsonData);
      
      expect(result).toEqual({
        name: 'test',
        value: 123,
        active: true
      });
    });

    it('should parse valid JSON arrays', async () => {
      const jsonData = '[{"id": 1, "name": "item1"}, {"id": 2, "name": "item2"}]';
      const result = await dataParser.parseData(jsonData);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 1, name: 'item1' });
      expect(result[1]).toEqual({ id: 2, name: 'item2' });
    });

    it('should handle nested JSON structures', async () => {
      const jsonData = '{"user": {"name": "John", "details": {"age": 30, "city": "NYC"}}}';
      const result = await dataParser.parseData(jsonData);
      
      expect(result.user.name).toBe('John');
      expect(result.user.details.age).toBe(30);
      expect(result.user.details.city).toBe('NYC');
    });

    it('should handle invalid JSON as structured text', async () => {
      const invalidJson = '{"name": "test", "value": }';
      const result = await dataParser.parseData(invalidJson);
      
      // Invalid JSON should be parsed as structured text
      expect(result.type).toBe('structured_text');
      expect(result.keyValuePairs).toBeDefined();
    });
  });

  describe('XML Parsing', () => {
    it('should parse simple XML elements', async () => {
      const xmlData = '<root><name>test</name><value>123</value></root>';
      const result = await dataParser.parseData(xmlData);
      
      expect(result.name).toBe('test');
      expect(result.value).toBe('123');
    });

    it('should handle XML attributes', async () => {
      const xmlData = '<root id="1" type="test"><name>value</name></root>';
      const result = await dataParser.parseData(xmlData);
      
      expect(result['@attributes']).toEqual({ id: '1', type: 'test' });
      expect(result.name).toBe('value');
    });

    it('should handle nested XML structures', async () => {
      const xmlData = '<root><user><name>John</name><details><age>30</age></details></user></root>';
      const result = await dataParser.parseData(xmlData);
      
      expect(result.user.name).toBe('John');
      expect(result.user.details.age).toBe('30');
    });

    it('should handle XML arrays (multiple elements with same tag)', async () => {
      const xmlData = '<root><item>first</item><item>second</item><item>third</item></root>';
      const result = await dataParser.parseData(xmlData);
      
      expect(Array.isArray(result.item)).toBe(true);
      expect(result.item).toHaveLength(3);
      expect(result.item[0]).toBe('first');
      expect(result.item[1]).toBe('second');
      expect(result.item[2]).toBe('third');
    });

    it('should throw error for invalid XML', async () => {
      const invalidXml = '<root><name>test</name><unclosed>';
      
      await expect(dataParser.parseData(invalidXml)).rejects.toThrow('Failed to parse xml data');
    });
  });

  describe('Log File Parsing', () => {
    it('should parse log entries with ISO timestamps', async () => {
      const logData = `2023-12-24T10:30:45.123Z [ERROR] Database connection failed
2023-12-24T10:30:46.456Z [INFO] Retrying connection
2023-12-24T10:30:47.789Z [WARN] Connection timeout`;
      
      const result = await dataParser.parseData(logData);
      
      expect(result.totalLines).toBe(3);
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].level).toBe('ERROR');
      expect(result.entries[0].message).toBe('Database connection failed');
      expect(result.entries[1].level).toBe('INFO');
      expect(result.entries[2].level).toBe('WARN');
    });

    it('should parse log entries with standard timestamps', async () => {
      const logData = `2023-12-24 10:30:45 [ERROR] Application crashed
2023-12-24 10:30:46 [INFO] Application restarted`;
      
      const result = await dataParser.parseData(logData);
      
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].timestamp).toBe('2023-12-24 10:30:45');
      expect(result.entries[0].level).toBe('ERROR');
      expect(result.entries[1].level).toBe('INFO');
    });

    it('should parse log entries with level only', async () => {
      const logData = `[ERROR] Something went wrong
[INFO] Process completed
[WARN] Memory usage high`;
      
      const result = await dataParser.parseData(logData);
      
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].level).toBe('ERROR');
      expect(result.entries[1].level).toBe('INFO');
      expect(result.entries[2].level).toBe('WARN');
    });

    it('should generate log summary with level counts', async () => {
      const logData = `[ERROR] Error 1
[ERROR] Error 2
[WARN] Warning 1
[INFO] Info 1
[INFO] Info 2
[INFO] Info 3`;
      
      const result = await dataParser.parseData(logData);
      
      expect(result.summary.totalEntries).toBe(6);
      expect(result.summary.levelCounts.ERROR).toBe(2);
      expect(result.summary.levelCounts.WARN).toBe(1);
      expect(result.summary.levelCounts.INFO).toBe(3);
      expect(result.summary.errorCount).toBe(2);
      expect(result.summary.warningCount).toBe(1);
    });

    it('should handle plain text lines as INFO level', async () => {
      const logData = `This is a plain text line
Another plain text line
[ERROR] This is an error`;
      
      const result = await dataParser.parseData(logData);
      
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].level).toBe('INFO');
      expect(result.entries[0].message).toBe('This is a plain text line');
      expect(result.entries[1].level).toBe('INFO');
      expect(result.entries[2].level).toBe('ERROR');
    });
  });

  describe('Format Detection', () => {
    it('should detect JSON format correctly', async () => {
      const jsonData = '{"test": "value"}';
      const result = await dataParser.parseData(jsonData);
      
      expect(typeof result).toBe('object');
      expect(result.test).toBe('value');
    });

    it('should detect XML format correctly', async () => {
      const xmlData = '<root><test>value</test></root>';
      const result = await dataParser.parseData(xmlData);
      
      expect(result.test).toBe('value');
    });

    it('should default to log format for other text', async () => {
      const textData = 'This is some plain text\nAnother line';
      const result = await dataParser.parseData(textData);
      
      expect(result.totalLines).toBe(2);
      expect(result.entries).toHaveLength(2);
    });
  });

  describe('Data Validation', () => {
    it('should validate correct JSON data', async () => {
      const jsonData = '{"name": "test", "value": 123}';
      const validation = await dataParser.validateData(jsonData, 'json');
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect validation errors for forced JSON parsing', async () => {
      const invalidData = '{"name": "test", "value": }';
      
      // When we explicitly force JSON parsing, it should fail
      try {
        await dataParser.parseData(invalidData, 'json');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should warn about format mismatches', async () => {
      const xmlData = '<root><test>value</test></root>';
      const validation = await dataParser.validateData(xmlData, 'json');
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('Expected json format but detected xml');
    });

    it('should reject empty data', async () => {
      const validation = await dataParser.validateData('');
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Data cannot be empty');
    });
  });

  describe('Structured Text Parsing', () => {
    it('should parse key-value pairs', async () => {
      const textData = `name: John Doe
age: 30
city: New York
status: active`;
      
      const result = await dataParser.parseData(textData);
      
      expect(result.type).toBe('structured_text');
      expect(result.keyValuePairs).toEqual({
        name: 'John Doe',
        age: '30',
        city: 'New York',
        status: 'active'
      });
    });

    it('should handle mixed key-value and plain text', async () => {
      const textData = `name: John Doe
age: 30
city: New York
status: active
This is a plain text line
Another plain text line`;
      
      const result = await dataParser.parseData(textData);
      
      expect(result.keyValuePairs).toEqual({
        name: 'John Doe',
        age: '30',
        city: 'New York',
        status: 'active'
      });
      expect(result.lines).toEqual([
        'This is a plain text line',
        'Another plain text line'
      ]);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty data', async () => {
      await expect(dataParser.parseData('')).rejects.toThrow('Data cannot be empty');
    });

    it('should throw error for null data', async () => {
      await expect(dataParser.parseData(null as any)).rejects.toThrow('Data cannot be empty');
    });

    it('should handle invalid JSON as structured text', async () => {
      const invalidJson = '{"invalid": json}';
      const result = await dataParser.parseData(invalidJson);
      
      // Invalid JSON should be parsed as structured text
      expect(result.type).toBe('structured_text');
      expect(result.keyValuePairs).toBeDefined();
    });
  });

  describe('Supported Formats', () => {
    it('should return list of supported formats', () => {
      const formats = dataParser.getSupportedFormats();
      
      expect(formats).toContain('json');
      expect(formats).toContain('xml');
      expect(formats).toContain('log');
      expect(formats).toContain('text');
    });
  });
});