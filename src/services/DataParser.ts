import { ValidationResult } from '../types';

/**
 * DataParser handles parsing of various data formats including JSON, XML, and log files
 * Provides structured data processing and error handling for production ticket data
 */
export class DataParser {
  /**
   * Parses data based on detected format
   * @param data The raw data string to parse
   * @param format Optional format hint, will auto-detect if not provided
   * @returns Parsed data object
   */
  async parseData(data: string, format?: 'json' | 'xml' | 'log'): Promise<any> {
    if (!data || data.trim() === '') {
      throw new Error('Data cannot be empty');
    }

    const detectedFormat = format || this.detectFormat(data);
    
    try {
      switch (detectedFormat) {
        case 'json':
          return this.parseJSON(data);
        case 'xml':
          return this.parseXML(data);
        case 'log':
          return this.parseLogFile(data);
        default:
          // Try to parse as plain text with structure detection
          return this.parseAsStructuredText(data);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${detectedFormat} data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates data format and structure
   * @param data The raw data string to validate
   * @param expectedFormat Optional expected format
   * @returns Validation result with errors and warnings
   */
  async validateData(data: string, expectedFormat?: 'json' | 'xml' | 'log'): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || data.trim() === '') {
      errors.push('Data cannot be empty');
      return { isValid: false, errors, warnings };
    }

    const detectedFormat = this.detectFormat(data);
    
    if (expectedFormat && detectedFormat !== expectedFormat) {
      warnings.push(`Expected ${expectedFormat} format but detected ${detectedFormat}`);
    }

    try {
      // Attempt to parse to validate structure
      await this.parseData(data, detectedFormat);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Detects the format of the input data
   * @param data The raw data string
   * @returns Detected format
   */
  private detectFormat(data: string): 'json' | 'xml' | 'log' {
    const trimmedData = data.trim();
    
    // Check for JSON - must be valid JSON to be detected as JSON
    if ((trimmedData.startsWith('{') && trimmedData.endsWith('}')) ||
        (trimmedData.startsWith('[') && trimmedData.endsWith(']'))) {
      try {
        JSON.parse(trimmedData);
        return 'json';
      } catch {
        // Not valid JSON, continue checking
      }
    }

    // Check for XML
    if (trimmedData.startsWith('<') && trimmedData.includes('>')) {
      return 'xml';
    }

    // Default to log format for other text
    return 'log';
  }

  /**
   * Parses JSON data
   * @param data JSON string
   * @returns Parsed JSON object
   */
  private parseJSON(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parses XML data into a structured object
   * @param data XML string
   * @returns Parsed XML as object
   */
  private parseXML(data: string): any {
    try {
      // Simple XML parser - converts XML to object structure
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(`XML parsing error: ${parserError.textContent}`);
      }

      return this.xmlToObject(xmlDoc.documentElement);
    } catch (error) {
      throw new Error(`Invalid XML format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Converts XML element to JavaScript object
   * @param element XML element
   * @returns JavaScript object representation
   */
  private xmlToObject(element: Element): any {
    const result: any = {};

    // Handle attributes
    if (element.attributes.length > 0) {
      result['@attributes'] = {};
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        result['@attributes'][attr.name] = attr.value;
      }
    }

    // Handle child elements
    const children = element.children;
    if (children.length === 0) {
      // Leaf node - return text content
      const textContent = element.textContent?.trim();
      if (textContent) {
        if (result['@attributes']) {
          result['#text'] = textContent;
          return result;
        } else {
          return textContent;
        }
      }
      return result['@attributes'] ? result : null;
    }

    // Group children by tag name
    const childGroups: { [key: string]: Element[] } = {};
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName;
      if (!childGroups[tagName]) {
        childGroups[tagName] = [];
      }
      childGroups[tagName].push(child);
    }

    // Convert child groups to object properties
    for (const [tagName, childElements] of Object.entries(childGroups)) {
      if (childElements.length === 1) {
        result[tagName] = this.xmlToObject(childElements[0]);
      } else {
        result[tagName] = childElements.map(child => this.xmlToObject(child));
      }
    }

    return result;
  }

  /**
   * Parses log file data into structured format
   * @param data Log file content
   * @returns Structured log data
   */
  private parseLogFile(data: string): any {
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    // Check if this looks like structured key-value text (not log entries)
    const keyValueLines = lines.filter(line => line.match(/^[^:=\[\]]+[:=]\s*.+$/));
    const logLikeLines = lines.filter(line => 
      line.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || // ISO timestamp
      line.match(/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/) || // standard timestamp
      line.match(/^\[?(ERROR|WARN|INFO|DEBUG|TRACE)\]?\s/) || // level indicator
      line.match(/\[ERROR\]|\[WARN\]|\[INFO\]|\[DEBUG\]|\[TRACE\]/) // explicit log levels
    );
    
    // If we have clear log patterns, parse as logs
    if (logLikeLines.length > 0 && logLikeLines.length >= lines.length * 0.3) {
      const logEntries: any[] = [];
      
      for (const line of lines) {
        const entry = this.parseLogLine(line);
        if (entry) {
          logEntries.push(entry);
        }
      }

      return {
        totalLines: lines.length,
        entries: logEntries,
        summary: this.generateLogSummary(logEntries)
      };
    }
    
    // If we have key-value pairs and they're more common than log-like lines, treat as structured text
    if (keyValueLines.length > 0 && 
        (keyValueLines.length >= lines.length * 0.4 || 
         (keyValueLines.length > logLikeLines.length && keyValueLines.length >= 2))) {
      return this.parseAsStructuredText(data);
    }
    
    // Otherwise parse as log entries (fallback)
    const logEntries: any[] = [];
    
    for (const line of lines) {
      const entry = this.parseLogLine(line);
      if (entry) {
        logEntries.push(entry);
      }
    }

    return {
      totalLines: lines.length,
      entries: logEntries,
      summary: this.generateLogSummary(logEntries)
    };
  }

  /**
   * Parses a single log line
   * @param line Log line string
   * @returns Parsed log entry or null if unparseable
   */
  private parseLogLine(line: string): any | null {
    const trimmedLine = line.trim();
    if (!trimmedLine) return null;

    // Try common log formats
    
    // ISO timestamp format: 2023-12-24T10:30:45.123Z [LEVEL] message
    const isoMatch = trimmedLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)\s*\[?(\w+)\]?\s*(.+)$/);
    if (isoMatch) {
      return {
        timestamp: isoMatch[1],
        level: isoMatch[2]?.toUpperCase() || 'INFO',
        message: isoMatch[3],
        raw: trimmedLine
      };
    }

    // Standard timestamp format: 2023-12-24 10:30:45 [LEVEL] message
    const standardMatch = trimmedLine.match(/^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*\[?(\w+)\]?\s*(.+)$/);
    if (standardMatch) {
      return {
        timestamp: standardMatch[1],
        level: standardMatch[2]?.toUpperCase() || 'INFO',
        message: standardMatch[3],
        raw: trimmedLine
      };
    }

    // Simple level format: [LEVEL] message
    const levelMatch = trimmedLine.match(/^\[?(\w+)\]?\s*(.+)$/);
    if (levelMatch && ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'].includes(levelMatch[1].toUpperCase())) {
      return {
        level: levelMatch[1].toUpperCase(),
        message: levelMatch[2],
        raw: trimmedLine
      };
    }

    // Fallback: treat as plain message
    return {
      level: 'INFO',
      message: trimmedLine,
      raw: trimmedLine
    };
  }

  /**
   * Generates summary statistics for log entries
   * @param entries Array of log entries
   * @returns Log summary object
   */
  private generateLogSummary(entries: any[]): any {
    const levelCounts: { [key: string]: number } = {};
    const errorMessages: string[] = [];
    
    for (const entry of entries) {
      const level = entry.level || 'INFO';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      
      if (level === 'ERROR') {
        errorMessages.push(entry.message);
      }
    }

    return {
      totalEntries: entries.length,
      levelCounts,
      errorCount: levelCounts['ERROR'] || 0,
      warningCount: levelCounts['WARN'] || 0,
      errorMessages: errorMessages.slice(0, 10) // Limit to first 10 errors
    };
  }

  /**
   * Attempts to parse data as structured text
   * @param data Raw text data
   * @returns Structured representation
   */
  private parseAsStructuredText(data: string): any {
    const lines = data.split('\n').filter(line => line.trim() !== '');
    
    // Try to detect key-value pairs
    const keyValuePairs: { [key: string]: string } = {};
    const otherLines: string[] = [];
    
    for (const line of lines) {
      const kvMatch = line.match(/^([^:=]+)[:=]\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        keyValuePairs[key] = value;
      } else {
        otherLines.push(line.trim());
      }
    }

    return {
      type: 'structured_text',
      keyValuePairs: Object.keys(keyValuePairs).length > 0 ? keyValuePairs : undefined,
      lines: otherLines.length > 0 ? otherLines : undefined,
      totalLines: lines.length
    };
  }

  /**
   * Gets supported data formats
   * @returns Array of supported format strings
   */
  getSupportedFormats(): string[] {
    return ['json', 'xml', 'log', 'text'];
  }
}