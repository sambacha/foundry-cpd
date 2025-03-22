/**
 * Fake implementation of @actions/tool-cache for testing
 */

import * as path from 'path';

export const mockToolCache = {
  downloadTool: jest.fn().mockImplementation(async (url: string) => {
    mockToolCache._downloads.push(url);
    // Return a fake path to the downloaded file
    return path.join('/fake-temp', `download-${mockToolCache._downloads.length}`);
  }),

  extractZip: jest.fn().mockImplementation(async (file: string) => {
    return mockToolCache._getExtractPath(file, 'zip');
  }),

  extractTar: jest.fn().mockImplementation(async (file: string) => {
    return mockToolCache._getExtractPath(file, 'tar');
  }),

  extractXar: jest.fn().mockImplementation(async (file: string) => {
    return mockToolCache._getExtractPath(file, 'xar');
  }),

  extract7z: jest.fn().mockImplementation(async (file: string) => {
    return mockToolCache._getExtractPath(file, '7z');
  }),

  cacheDir: jest.fn().mockImplementation(async (sourceDir: string, tool: string, version: string) => {
    const cachePath = path.join('/fake-cache', tool, version);
    mockToolCache._cachedTools.push({ tool, version, path: cachePath });
    return cachePath;
  }),

  cacheFile: jest.fn().mockImplementation(async (sourceFile: string, targetFile: string, tool: string, version: string) => {
    const cachePath = path.join('/fake-cache', tool, version, targetFile);
    mockToolCache._cachedFiles.push({ tool, version, file: targetFile, path: cachePath });
    return cachePath;
  }),

  find: jest.fn().mockImplementation((tool: string, version: string) => {
    const cachedTool = mockToolCache._cachedTools.find(
      t => t.tool === tool && t.version === version
    );
    return cachedTool ? cachedTool.path : '';
  }),

  findAllVersions: jest.fn().mockImplementation((tool: string) => {
    return mockToolCache._cachedTools
      .filter(t => t.tool === tool)
      .map(t => t.version);
  }),

  /**
   * Stores information about downloaded files
   */
  _downloads: [] as string[],

  /**
   * Stores information about cached tools
   */
  _cachedTools: [] as Array<{ tool: string; version: string; path: string }>,

  /**
   * Stores information about cached files
   */
  _cachedFiles: [] as Array<{ tool: string; version: string; file: string; path: string }>,

  /**
   * Helper method to generate extract paths
   */
  _getExtractPath(file: string, format: string): string {
    const baseName = path.basename(file, path.extname(file));
    return path.join('/fake-extract', `${baseName}-${format}`);
  },

  /**
   * Reset all mocks and internal state
   */
  _reset(): void {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && 'mockClear' in this[key]) {
        this[key].mockClear();
      }
    });
    this._downloads = [];
    this._cachedTools = [];
    this._cachedFiles = [];
  }
};

/**
 * Setup function to configure the mockToolCache with default values
 */
export function setupToolCacheMock() {
  mockToolCache._reset();
  return mockToolCache;
}
