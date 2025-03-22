/**
 * State management types for the Foundry Toolchain
 */

/**
 * Enum for the cache primary key and result key.
 */
export enum State {
  CachePrimaryKey = 'CACHE_KEY',
  CacheMatchedKey = 'CACHE_RESULT',
  GasSnapshotKey = 'GAS_SNAPSHOT',
}

/**
 * Interface for the cache state
 */
export interface CacheState {
  primaryKey?: string;
  matchedKey?: string;
  paths: string[];
  enabled: boolean;
}

/**
 * Interface for the gas snapshot state
 */
export interface GasSnapshotState {
  currentSnapshot?: string;
  previousSnapshot?: string;
  snapshotPath?: string;
  enabled: boolean;
}

/**
 * Interface for the application state
 */
export interface AppState {
  cache: CacheState;
  gasSnapshot: GasSnapshotState;
  version: string;
}
