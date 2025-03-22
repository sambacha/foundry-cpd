/**
 * Fake implementation of node:fs for testing
 */

import * as path from 'path';

export type FakeFile = {
  content: string;
  isDirectory: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const mockFs = {
  /**
   * In-memory file system storage
   */
  _files: new Map<string, FakeFile>(),

  /**
   * Check if a file or directory exists
   */
  existsSync: jest.fn().mockImplementation((filePath: string): boolean => {
    return mockFs._files.has(filePath) || mockFs._hasDirectory(filePath);
  }),

  /**
   * Read file contents
   */
  readFileSync: jest.fn().mockImplementation((filePath: string, options?: { encoding?: string }): string | Buffer => {
    const file = mockFs._files.get(filePath);
    
    if (!file) {
      const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }

    if (file.isDirectory) {
      const error = new Error(`EISDIR: illegal operation on a directory, read '${filePath}'`);
      (error as any).code = 'EISDIR';
      throw error;
    }

    if (options?.encoding === 'utf8' || typeof options === 'string') {
      return file.content;
    }

    // Return a Buffer if no encoding specified
    return Buffer.from(file.content);
  }),

  /**
   * Write content to a file
   */
  writeFileSync: jest.fn().mockImplementation((filePath: string, content: string | Buffer | Uint8Array, options?: { encoding?: string }): void => {
    // Convert any non-string content to string
    const contentStr = typeof content === 'string' 
      ? content 
      : Buffer.from(content).toString();
    
    const now = new Date();
    
    // Ensure parent directory exists
    const dirPath = path.dirname(filePath);
    if (dirPath !== '.' && dirPath !== '/' && !mockFs.existsSync(dirPath)) {
      mockFs.mkdirSync(dirPath, { recursive: true });
    }

    if (mockFs._files.has(filePath)) {
      const file = mockFs._files.get(filePath)!;
      if (file.isDirectory) {
        const error = new Error(`EISDIR: illegal operation on a directory, write '${filePath}'`);
        (error as any).code = 'EISDIR';
        throw error;
      }
      
      file.content = contentStr;
      file.updatedAt = now;
      mockFs._files.set(filePath, file);
    } else {
      mockFs._files.set(filePath, {
        content: contentStr,
        isDirectory: false,
        createdAt: now,
        updatedAt: now
      });
    }
  }),

  /**
   * Create a directory
   */
  mkdirSync: jest.fn().mockImplementation((dirPath: string, options?: { recursive?: boolean }): void => {
    const recursive = options?.recursive ?? false;
    const now = new Date();
    
    if (mockFs._files.has(dirPath)) {
      const file = mockFs._files.get(dirPath)!;
      if (!file.isDirectory) {
        const error = new Error(`EEXIST: file already exists, mkdir '${dirPath}'`);
        (error as any).code = 'EEXIST';
        throw error;
      }
      return; // Directory already exists
    }
    
    // Make sure parent directories exist if recursive
    if (recursive) {
      const parentDir = path.dirname(dirPath);
      if (parentDir !== '.' && parentDir !== '/' && !mockFs.existsSync(parentDir)) {
        mockFs.mkdirSync(parentDir, { recursive: true });
      }
    } else {
      const parentDir = path.dirname(dirPath);
      if (parentDir !== '.' && parentDir !== '/' && !mockFs.existsSync(parentDir)) {
        const error = new Error(`ENOENT: no such file or directory, mkdir '${dirPath}'`);
        (error as any).code = 'ENOENT';
        throw error;
      }
    }
    
    mockFs._files.set(dirPath, {
      content: '',
      isDirectory: true,
      createdAt: now,
      updatedAt: now
    });
  }),

  /**
   * Helper method to check if a directory exists at the given path or above
   */
  _hasDirectory(dirPath: string): boolean {
    for (const [filePath, file] of mockFs._files.entries()) {
      if (file.isDirectory && (
        dirPath === filePath || 
        dirPath.startsWith(`${filePath}/`) || 
        filePath.startsWith(`${dirPath}/`)
      )) {
        return true;
      }
    }
    return false;
  },

  /**
   * List files in a directory
   */
  readdirSync: jest.fn().mockImplementation((dirPath: string): string[] => {
    if (!mockFs.existsSync(dirPath)) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
      (error as any).code = 'ENOENT';
      throw error;
    }
    
    const dirFile = mockFs._files.get(dirPath);
    if (dirFile && !dirFile.isDirectory) {
      const error = new Error(`ENOTDIR: not a directory, scandir '${dirPath}'`);
      (error as any).code = 'ENOTDIR';
      throw error;
    }
    
    const files: string[] = [];
    for (const [filePath, _] of mockFs._files.entries()) {
      if (filePath !== dirPath && path.dirname(filePath) === dirPath) {
        files.push(path.basename(filePath));
      }
    }
    
    return files;
  }),

  /**
   * Reset the mock filesystem
   */
  _reset(): void {
    mockFs._files.clear();
    Object.keys(mockFs).forEach(key => {
      if (typeof mockFs[key] === 'function' && 'mockClear' in mockFs[key]) {
        mockFs[key].mockClear();
      }
    });
  },

  /**
   * Set up an initial file structure
   */
  _setupFiles(fileStructure: Record<string, string | null>): void {
    mockFs._reset();
    
    for (const [filePath, content] of Object.entries(fileStructure)) {
      if (content === null) {
        // Create directory
        mockFs.mkdirSync(filePath, { recursive: true });
      } else {
        // Create file
        const dirPath = path.dirname(filePath);
        if (dirPath !== '.' && !mockFs.existsSync(dirPath)) {
          mockFs.mkdirSync(dirPath, { recursive: true });
        }
        mockFs.writeFileSync(filePath, content);
      }
    }
  }
};

/**
 * Setup function to configure the mockFs with default values
 */
export function setupFsMock(fileStructure: Record<string, string | null> = {}) {
  mockFs._reset();
  mockFs._setupFiles(fileStructure);
  return mockFs;
}
