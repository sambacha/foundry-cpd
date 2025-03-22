import * as path from 'path';
import { CacheType, restoreCache, saveCache } from '../../src/services/cache';
import { CacheOptions, CacheResult } from '../../src/types';
import { State } from '../../src/types/state';
import { setupAllMocks } from '../fakes';

// Mock all dependencies
jest.mock('@actions/core', () => {
  const { mockCore } = require('../fakes/actions-core.fake');
  return mockCore;
});

jest.mock('@actions/cache', () => {
  const { mockCache } = require('../fakes/actions-cache.fake');
  return mockCache;
});

jest.mock('@actions/github', () => {
  const { mockGitHub } = require('../fakes/actions-github.fake');
  return mockGitHub;
});

jest.mock('fs', () => {
  const { mockFs } = require('../fakes/fs.fake');
  return mockFs;
});

describe('Cache Workflow Integration', () => {
  const CACHE_PATH = path.join('/home/user', '.foundry/cache/rpc');
  const CACHE_KEY = 'win32-foundry-chain-fork-1234567890abcdef';
  
  // Setup default mocks before each test
  beforeEach(() => {
    const mocks = setupAllMocks();
    
    // Configure GitHub context
    mocks.github._setupContext({
      sha: '1234567890abcdef',
      ref: 'refs/heads/main'
    });
    
    // Configure file system
    mocks.fs._setupFiles({
      [CACHE_PATH]: null // Create directory
    });
    
    // Configure core inputs
    mocks.core._inputs = {
      'cache': 'true',
      'cache-key': 'test-key',
      'cache-restore-keys': 'test-key-\nmain-'
    };
  });

  describe('restore and save cache flow', () => {
    it('should properly restore cache when cache hit occurs', async () => {
      // Configure cache to return a hit
      const { mockCache } = require('../fakes/actions-cache.fake');
      mockCache._setupCache([
        { key: CACHE_KEY, paths: [CACHE_PATH] }
      ]);
      
      // Configure core to hold state
      const { mockCore } = require('../fakes/actions-core.fake');
      
      // Define cache options
      const cacheOptions: CacheOptions = {
        enabled: true,
        primaryKey: 'test-key',
        restoreKeys: ['test-key-', 'main-'],
        paths: [CACHE_PATH]
      };
      
      // Restore the cache
      const result = await restoreCache(cacheOptions, CacheType.RPC);
      
      // Verify the result
      expect(result.cacheHit).toBe(true);
      expect(result.primaryKey).toContain('test-key');
      expect(result.matchedKey).toBe(CACHE_KEY);
      
      // Verify that state was saved
      expect(mockCore.saveState).toHaveBeenCalledWith(State.CachePrimaryKey, result.primaryKey);
      expect(mockCore.saveState).toHaveBeenCalledWith(State.CacheMatchedKey, result.matchedKey);
      
      // Now save the cache
      const saveResult = await saveCache(cacheOptions, CacheType.RPC);
      
      // Since we had a cache hit with the same key, save should be skipped
      expect(saveResult).toBe(false);
      expect(mockCache.saveCache).not.toHaveBeenCalled();
    });
    
    it('should save cache when restore misses', async () => {
      // Configure cache to return a miss
      const { mockCache } = require('../fakes/actions-cache.fake');
      mockCache._setupCache([]); // Empty cache
      
      // Configure fs with a cache file
      const { mockFs } = require('../fakes/fs.fake');
      mockFs._setupFiles({
        [CACHE_PATH]: null, // Directory
        [path.join(CACHE_PATH, 'cache-data.json')]: '{"test": "data"}' // Some cache file
      });
      
      // Define cache options
      const cacheOptions: CacheOptions = {
        enabled: true,
        primaryKey: 'new-key',
        paths: [CACHE_PATH]
      };
      
      // Restore the cache (will miss)
      const result = await restoreCache(cacheOptions, CacheType.RPC);
      
      // Verify the result
      expect(result.cacheHit).toBe(false);
      expect(result.primaryKey).toContain('new-key');
      expect(result.matchedKey).toBeUndefined();
      
      // Now save the cache
      const saveResult = await saveCache(cacheOptions, CacheType.RPC);
      
      // Since we had a cache miss, save should proceed
      expect(saveResult).toBe(true);
      expect(mockCache.saveCache).toHaveBeenCalledWith(
        [CACHE_PATH], 
        expect.stringContaining('new-key'),
        undefined
      );
    });
    
    it('should skip save when directory does not exist', async () => {
      // Configure fs without the cache directory
      const { mockFs } = require('../fakes/fs.fake');
      mockFs._setupFiles({}); // Empty file system
      
      // Define cache options
      const cacheOptions: CacheOptions = {
        enabled: true,
        primaryKey: 'key',
        paths: ['/nonexistent/path']
      };
      
      // Skip restore, just try to save
      const saveResult = await saveCache(cacheOptions, CacheType.RPC);
      
      // Since directory doesn't exist, save should be skipped
      expect(saveResult).toBe(false);
      expect(mockCache.saveCache).not.toHaveBeenCalled();
    });
    
    it('should skip operations when cache is disabled', async () => {
      const cacheOptions: CacheOptions = {
        enabled: false,
        primaryKey: 'key'
      };
      
      // Try restore
      const restoreResult = await restoreCache(cacheOptions, CacheType.RPC);
      expect(restoreResult.cacheHit).toBe(false);
      
      // Try save
      const saveResult = await saveCache(cacheOptions, CacheType.RPC);
      expect(saveResult).toBe(false);
      
      // Verify neither operation called the cache API
      const { mockCache } = require('../fakes/actions-cache.fake');
      expect(mockCache.restoreCache).not.toHaveBeenCalled();
      expect(mockCache.saveCache).not.toHaveBeenCalled();
    });
  });

  describe('multiple cache types', () => {
    const ARTIFACTS_PATH = path.join('/home/user', '.foundry/cache/artifacts');
    const GAS_SNAPSHOTS_PATH = path.join('/home/user', '.foundry/cache/gas-snapshots');
    
    beforeEach(() => {
      // Setup additional cache directories
      const { mockFs } = require('../fakes/fs.fake');
      mockFs._setupFiles({
        [CACHE_PATH]: null,
        [ARTIFACTS_PATH]: null,
        [GAS_SNAPSHOTS_PATH]: null
      });
    });
    
    it('should use different key prefixes for different cache types', async () => {
      // Define cache options
      const cacheOptions: CacheOptions = {
        enabled: true,
        primaryKey: 'shared-key'
      };
      
      // Restore all cache types
      const rpcResult = await restoreCache(cacheOptions, CacheType.RPC);
      const artifactsResult = await restoreCache(cacheOptions, CacheType.ARTIFACTS);
      const gasResult = await restoreCache(cacheOptions, CacheType.GAS_SNAPSHOT);
      
      // Verify each has a different key prefix
      expect(rpcResult.primaryKey).toContain('chain-fork');
      expect(artifactsResult.primaryKey).toContain('artifacts');
      expect(gasResult.primaryKey).toContain('gas-snapshot');
      
      // Verify they all contain the same base key
      expect(rpcResult.primaryKey).toContain('shared-key');
      expect(artifactsResult.primaryKey).toContain('shared-key');
      expect(gasResult.primaryKey).toContain('shared-key');
    });
    
    it('should use the correct paths for each cache type', async () => {
      // Define cache options without paths (should use defaults)
      const cacheOptions: CacheOptions = {
        enabled: true,
        primaryKey: 'key'
      };
      
      // Get the cache mock to spy on
      const { mockCache } = require('../fakes/actions-cache.fake');
      
      // Restore each cache type
      await restoreCache(cacheOptions, CacheType.RPC);
      await restoreCache(cacheOptions, CacheType.ARTIFACTS);
      await restoreCache(cacheOptions, CacheType.GAS_SNAPSHOT);
      
      // Extract the paths passed to restoreCache
      const callArgs = mockCache.restoreCache.mock.calls;
      
      // Verify correct paths were used for each type
      expect(callArgs[0][0]).toEqual([CACHE_PATH]); // RPC
      expect(callArgs[1][0]).toEqual([ARTIFACTS_PATH]); // Artifacts
      expect(callArgs[2][0]).toEqual([GAS_SNAPSHOTS_PATH]); // Gas snapshots
    });
  });
});
