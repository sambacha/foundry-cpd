import * as core from '@actions/core';
import * as cache from '@actions/cache';
import * as github from '@actions/github';

import { CacheOptions, CacheResult } from '../types';
import { State } from '../types/state';
import { 
  CACHE_PATHS, 
  RPC_CACHE_PREFIX, 
  ARTIFACTS_CACHE_PREFIX,
  GAS_SNAPSHOT_CACHE_PREFIX 
} from '../constants';
import { ensureDirectoryExists, fileExists } from '../utils/fs';

/**
 * Cache types supported by the cache service
 */
export enum CacheType {
  RPC = 'rpc',
  ARTIFACTS = 'artifacts',
  GAS_SNAPSHOT = 'gas-snapshot'
}

/**
 * Gets the cache prefix for the specified cache type
 * @param type The cache type
 * @returns The cache prefix
 */
function getCachePrefix(type: CacheType): string {
  switch (type) {
    case CacheType.RPC:
      return RPC_CACHE_PREFIX;
    case CacheType.ARTIFACTS:
      return ARTIFACTS_CACHE_PREFIX;
    case CacheType.GAS_SNAPSHOT:
      return GAS_SNAPSHOT_CACHE_PREFIX;
    default:
      return RPC_CACHE_PREFIX;
  }
}

/**
 * Gets the cache paths for the specified cache type
 * @param type The cache type
 * @returns An array of cache paths
 */
function getCachePaths(type: CacheType): string[] {
  switch (type) {
    case CacheType.RPC:
      return [CACHE_PATHS.RPC];
    case CacheType.ARTIFACTS:
      return [CACHE_PATHS.ARTIFACTS];
    case CacheType.GAS_SNAPSHOT:
      return [CACHE_PATHS.GAS_SNAPSHOTS];
    default:
      return [CACHE_PATHS.RPC];
  }
}

/**
 * Constructs the primary key for the cache using a custom key input
 * @param customKeyInput The custom part of the key provided by the user
 * @param type The cache type
 * @returns The complete primary key for the cache
 */
export function getPrimaryKey(customKeyInput: string | undefined, type: CacheType): string {
  const prefix = getCachePrefix(type);
  
  if (!customKeyInput) {
    return `${prefix}${github.context.sha}`;
  }
  
  return `${prefix}${customKeyInput.trim()}`;
}

/**
 * Constructs an array of restore keys based on user input and a default prefix
 * @param customRestoreKeysInput Newline-separated string of custom restore keys
 * @param type The cache type
 * @returns An array of restore keys for the cache
 */
export function getRestoreKeys(customRestoreKeysInput: string | undefined, type: CacheType): string[] {
  const prefix = getCachePrefix(type);
  const defaultRestoreKeys = [prefix];
  
  if (!customRestoreKeysInput) {
    return defaultRestoreKeys;
  }
  
  const restoreKeys = customRestoreKeysInput
    .split(/[\r\n]/)
    .map((input) => input.trim())
    .filter((input) => input !== '')
    .map((input) => `${prefix}${input}`);
  
  return [...restoreKeys, ...defaultRestoreKeys];
}

/**
 * Restores the cache for the specified type using the provided options
 * @param options The cache options
 * @param type The cache type
 * @returns A promise that resolves to a cache result
 */
export async function restoreCache(
  options: CacheOptions,
  type: CacheType = CacheType.RPC
): Promise<CacheResult> {
  if (!options.enabled) {
    core.info(`Cache not requested for ${type}, not restoring cache`);
    return {
      primaryKey: '',
      cacheHit: false
    };
  }
  
  const primaryKey = getPrimaryKey(options.primaryKey, type);
  core.saveState(State.CachePrimaryKey, primaryKey);
  
  const restoreKeys = getRestoreKeys(options.restoreKeys?.join('\n'), type);
  const cachePaths = options.paths || getCachePaths(type);
  
  // Ensure cache directories exist
  cachePaths.forEach(cachePath => {
    ensureDirectoryExists(cachePath);
  });
  
  core.info(`Restoring ${type} cache with key: ${primaryKey}`);
  core.debug(`Restore keys: ${restoreKeys.join(', ')}`);
  core.debug(`Cache paths: ${cachePaths.join(', ')}`);
  
  try {
    const matchedKey = await cache.restoreCache(cachePaths, primaryKey, restoreKeys);
    
    if (!matchedKey) {
      core.info(`${type} cache not found`);
      return {
        primaryKey,
        cacheHit: false
      };
    }
    
    core.saveState(State.CacheMatchedKey, matchedKey);
    core.info(`${type} cache restored from key: ${matchedKey}`);
    
    return {
      primaryKey,
      matchedKey,
      cacheHit: true
    };
  } catch (error) {
    core.warning(`Failed to restore ${type} cache: ${error instanceof Error ? error.message : String(error)}`);
    return {
      primaryKey,
      cacheHit: false
    };
  }
}

/**
 * Saves the cache for the specified type using the provided options
 * @param options The cache options
 * @param type The cache type
 * @returns A promise that resolves to a boolean indicating whether the cache was saved
 */
export async function saveCache(
  options: CacheOptions,
  type: CacheType = CacheType.RPC
): Promise<boolean> {
  if (!options.enabled) {
    core.info(`Cache not requested for ${type}, not saving cache`);
    return false;
  }
  
  const primaryKey = core.getState(State.CachePrimaryKey) || getPrimaryKey(options.primaryKey, type);
  const matchedKey = core.getState(State.CacheMatchedKey);
  const cachePaths = options.paths || getCachePaths(type);
  
  // If the cache path does not exist, do not save the cache
  const allPathsExist = cachePaths.every(cachePath => fileExists(cachePath));
  if (!allPathsExist) {
    core.info(`One or more cache paths do not exist, not saving ${type} cache: ${cachePaths.join(', ')}`);
    return false;
  }
  
  // If the primary key is not generated, do not save the cache
  if (!primaryKey) {
    core.info(`Primary key was not generated for ${type} cache. Please check the log messages above for more errors or information`);
    return false;
  }
  
  // If the primary key and the matched key are the same, this means the cache was already saved
  if (primaryKey === matchedKey) {
    core.info(`Cache hit occurred on the primary key ${primaryKey} for ${type} cache, not saving cache.`);
    return false;
  }
  
  core.info(`Saving ${type} cache with key: ${primaryKey}`);
  core.debug(`Cache paths: ${cachePaths.join(', ')}`);
  
  try {
    const cacheId = await cache.saveCache(cachePaths, primaryKey);
    
    // If the cacheId is -1, the saving failed with an error message log. No additional logging is needed.
    if (cacheId === -1) {
      return false;
    }
    
    core.info(`${type} cache saved with the key: ${primaryKey}`);
    return true;
  } catch (error) {
    core.warning(`Failed to save ${type} cache: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Restores the RPC cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a cache result
 */
export async function restoreRPCCache(options: CacheOptions): Promise<CacheResult> {
  return restoreCache(options, CacheType.RPC);
}

/**
 * Saves the RPC cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a boolean indicating whether the cache was saved
 */
export async function saveRPCCache(options: CacheOptions): Promise<boolean> {
  return saveCache(options, CacheType.RPC);
}

/**
 * Restores the artifacts cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a cache result
 */
export async function restoreArtifactsCache(options: CacheOptions): Promise<CacheResult> {
  return restoreCache(options, CacheType.ARTIFACTS);
}

/**
 * Saves the artifacts cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a boolean indicating whether the cache was saved
 */
export async function saveArtifactsCache(options: CacheOptions): Promise<boolean> {
  return saveCache(options, CacheType.ARTIFACTS);
}

/**
 * Restores the gas snapshot cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a cache result
 */
export async function restoreGasSnapshotCache(options: CacheOptions): Promise<CacheResult> {
  return restoreCache(options, CacheType.GAS_SNAPSHOT);
}

/**
 * Saves the gas snapshot cache using the provided options
 * @param options The cache options
 * @returns A promise that resolves to a boolean indicating whether the cache was saved
 */
export async function saveGasSnapshotCache(options: CacheOptions): Promise<boolean> {
  return saveCache(options, CacheType.GAS_SNAPSHOT);
}
