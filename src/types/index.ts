/**
 * Core type definitions for the Foundry Toolchain
 */

/**
 * Download options for Foundry binaries
 */
export interface DownloadOptions {
  version: string;
  platform: string;
  architecture: string;
  binPath?: string;
  url: string;
}

/**
 * Cache options for RPC responses and other artifacts
 */
export interface CacheOptions {
  enabled: boolean;
  primaryKey?: string;
  restoreKeys?: string[];
  paths?: string[];
  compressionLevel?: number;
}

/**
 * Gas snapshot data structure
 */
export interface GasSnapshot {
  timestamp: string;
  commitSha: string;
  testResults: {
    [testName: string]: {
      gasUsed: number;
      comparison?: {
        previous?: number;
        change?: number;
        changePercentage?: number;
      }
    }
  }
}

/**
 * Download result containing the path to the downloaded binaries
 */
export interface DownloadResult {
  binPath: string;
}

/**
 * Cache result containing information about the cache operation
 */
export interface CacheResult {
  primaryKey: string;
  matchedKey?: string;
  cacheHit: boolean;
}
