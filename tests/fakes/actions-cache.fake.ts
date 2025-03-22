/**
 * Fake implementation of @actions/cache for testing
 */

export const mockCache = {
  /**
   * Storage for cache entries
   */
  _caches: new Map<string, { key: string; paths: string[]; size: number; content: any }>(),

  /**
   * Saved state
   */
  _savedState: new Map<string, string>(),

  /**
   * Restore a cache entry
   */
  restoreCache: jest.fn().mockImplementation(async (paths: string[], primaryKey: string, restoreKeys?: string[]): Promise<string | undefined> => {
    // First try to restore with primary key
    if (mockCache._caches.has(primaryKey)) {
      return primaryKey;
    }

    // If restore keys are provided, try them in order
    if (restoreKeys && restoreKeys.length > 0) {
      for (const restoreKey of restoreKeys) {
        // Find a cache that starts with the restore key
        for (const [key, cache] of mockCache._caches.entries()) {
          if (key.startsWith(restoreKey)) {
            return key;
          }
        }
      }
    }

    // No cache was found
    return undefined;
  }),

  /**
   * Save a cache entry
   */
  saveCache: jest.fn().mockImplementation(async (paths: string[], key: string, options?: { uploadChunkSize?: number }): Promise<number> => {
    if (mockCache._caches.has(key)) {
      return -1; // Cache already exists, will not overwrite
    }

    // Create a simple cache entry
    mockCache._caches.set(key, {
      key,
      paths,
      size: paths.length * 1024, // Fake size calculation
      content: `Cache content for ${key}`
    });

    // Return a fake cache ID
    return mockCache._caches.size;
  }),

  /**
   * Reset all mocks and internal state
   */
  _reset(): void {
    mockCache._caches.clear();
    mockCache._savedState.clear();
    Object.keys(mockCache).forEach(key => {
      if (typeof mockCache[key] === 'function' && 'mockClear' in mockCache[key]) {
        mockCache[key].mockClear();
      }
    });
  },

  /**
   * Set up initial cache entries
   */
  _setupCache(entries: Array<{ key: string; paths: string[] }>): void {
    mockCache._reset();
    
    for (const entry of entries) {
      mockCache._caches.set(entry.key, {
        key: entry.key,
        paths: entry.paths,
        size: entry.paths.length * 1024, // Fake size calculation
        content: `Cache content for ${entry.key}`
      });
    }
  }
};

/**
 * Setup function to configure the mockCache with default values
 */
export function setupCacheMock(entries: Array<{ key: string; paths: string[] }> = []) {
  mockCache._reset();
  mockCache._setupCache(entries);
  return mockCache;
}
