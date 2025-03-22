import * as os from 'os';
import * as path from 'path';

// Re-export the State enum from types
export { State } from './types/state';

// Define constants for cache paths and prefix
export const HOME = os.homedir();
export const PLATFORM = os.platform();

// Cache related constants
export const CACHE_PATHS = {
  RPC: path.join(HOME, '.foundry/cache/rpc'),
  ARTIFACTS: path.join(HOME, '.foundry/cache/artifacts'),
  GAS_SNAPSHOTS: path.join(HOME, '.foundry/cache/gas-snapshots'),
};

export const CACHE_PREFIX = `${PLATFORM}-foundry-`;
export const RPC_CACHE_PREFIX = `${CACHE_PREFIX}chain-fork-`;
export const ARTIFACTS_CACHE_PREFIX = `${CACHE_PREFIX}artifacts-`;
export const GAS_SNAPSHOT_CACHE_PREFIX = `${CACHE_PREFIX}gas-snapshot-`;

// Gas snapshot related constants
export const GAS_SNAPSHOT_FILENAME = 'gas-snapshot.json';
export const GAS_SNAPSHOT_HISTORY_FILENAME = 'gas-snapshot-history.json';
export const GAS_SNAPSHOT_COMPARISON_THRESHOLD = 5; // 5% change threshold for highlighting

// Download related constants
export const FOUNDRY_REPO = 'foundry-rs/foundry';
export const FOUNDRY_DOWNLOAD_BASE_URL = `https://github.com/${FOUNDRY_REPO}/releases/download`;

// Error messages
export const ERROR_MESSAGES = {
  DOWNLOAD_FAILED: 'Failed to download Foundry binaries',
  EXTRACT_FAILED: 'Failed to extract Foundry binaries',
  CACHE_RESTORE_FAILED: 'Failed to restore cache',
  CACHE_SAVE_FAILED: 'Failed to save cache',
  GAS_SNAPSHOT_PARSE_FAILED: 'Failed to parse gas snapshot',
  GAS_SNAPSHOT_SAVE_FAILED: 'Failed to save gas snapshot',
};

// Success messages
export const SUCCESS_MESSAGES = {
  DOWNLOAD_SUCCESS: 'Successfully downloaded Foundry binaries',
  EXTRACT_SUCCESS: 'Successfully extracted Foundry binaries',
  CACHE_RESTORE_SUCCESS: 'Successfully restored cache',
  CACHE_SAVE_SUCCESS: 'Successfully saved cache',
  GAS_SNAPSHOT_PARSE_SUCCESS: 'Successfully parsed gas snapshot',
  GAS_SNAPSHOT_SAVE_SUCCESS: 'Successfully saved gas snapshot',
};
