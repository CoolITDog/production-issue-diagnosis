import { FileUploadManager } from './FileUploadManager';
import { ValidationResult } from '../types';

// Mock File constructor for testing
class MockFile implements File {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  webkitRelativePath: string;

  constructor(
    name: string,
    content: string,
    options: { type?: string; lastModified?: number; webkitRelativePath?: string } = {}
  ) {
    this.name = name;
    this.size = content.length;
    this.type = options.type || 'text/plain';
    this.lastModified = options.lastModified || Date.now();
    this.webkitRelativePath = options.webkitRelativePath || '';
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }

  slice(): Blob {
    throw new Error('Not implemented');
  }

  stream(): ReadableStream<Uint8Array> {
    throw new Error('Not implemented');
  }

  text(): Promise<string> {
    throw new Error('Not implemented');
  }
}

describe('FileUploadManager', () => {
  let fileUploadManager: FileUploadManager;

  beforeEach(() => {
    fileUploadManager = new FileUploadManager();
  });

  describe('validateFiles', () => {
    it('should validate empty file list', async () => {
      const result = await fileUploadManager.validateFiles([]);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No files selected');
    });

    it('should validate supported file types', async () => {
      const files = [
        new MockFile('test.js', 'console.log("hello");'),
        new MockFile('test.py', 'print("hello")'),
        new MockFile('test.java', 'public class Test {}'),
      ];

      const result = await fileUploadManager.validateFiles(files);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about unsupported file types', async () => {
      const files = [
        new MockFile('test.js', 'console.log("hello");'),
        new MockFile('image.png', 'binary data'),
        new MockFile('document.pdf', 'pdf content'),
      ];

      const result = await fileUploadManager.validateFiles(files);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('unsupported files will be ignored')
        ])
      );
    });

    it('should reject files that are too large', async () => {
      const largeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB
      const files = [
        new MockFile('large.js', largeContent),
      ];

      const result = await fileUploadManager.validateFiles(files);
      
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Large files detected')
        ])
      );
    });

    it('should reject when total size exceeds limit', async () => {
      const largeContent = 'x'.repeat(200 * 1024 * 1024); // 200MB each
      const files = [
        new MockFile('file1.js', largeContent),
        new MockFile('file2.js', largeContent),
        new MockFile('file3.js', largeContent),
      ];

      const result = await fileUploadManager.validateFiles(files);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Total upload size')
        ])
      );
    });
  });

  describe('filterCodeFiles', () => {
    it('should filter only supported code files', async () => {
      const files = [
        new MockFile('test.js', 'console.log("hello");'),
        new MockFile('test.py', 'print("hello")'),
        new MockFile('image.png', 'binary data'),
        new MockFile('document.pdf', 'pdf content'),
        new MockFile('style.css', 'body { margin: 0; }'),
      ];

      const filteredFiles = await fileUploadManager.filterCodeFiles(files);
      
      expect(filteredFiles).toHaveLength(3);
      expect(filteredFiles.map(f => f.name)).toEqual(['test.js', 'test.py', 'style.css']);
    });

    it('should return empty array when no supported files', async () => {
      const files = [
        new MockFile('image.png', 'binary data'),
        new MockFile('document.pdf', 'pdf content'),
      ];

      const filteredFiles = await fileUploadManager.filterCodeFiles(files);
      
      expect(filteredFiles).toHaveLength(0);
    });
  });

  describe('handleGitClone', () => {
    it('should reject invalid Git URLs', async () => {
      await expect(
        fileUploadManager.handleGitClone('not-a-url')
      ).rejects.toMatchObject({
        message: 'Invalid Git URL format',
        type: 'repo_not_found'
      });
    });

    it('should reject Git cloning in browser environment', async () => {
      await expect(
        fileUploadManager.handleGitClone('https://github.com/user/repo.git')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Git repository cloning is not supported in browser environment'),
        type: 'private_repo'
      });
    });
  });
});