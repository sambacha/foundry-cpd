import * as core from '@actions/core';

import { CacheOptions } from './types';
import { 
  saveRPCCache,
  saveArtifactsCache,
  saveGasSnapshotCache
} from './services';

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on('uncaughtException', (e) => {
  const warningPrefix = '[warning]';
  core.info(`${warningPrefix}${e.message}`);
});

/**
 * Post-action function for the Foundry Toolchain action
 * @param earlyExit Whether to exit the process early
 */
async function run(earlyExit = false): Promise<void> {
  try {
    // Get inputs
    const cacheEnabled = core.getBooleanInput('cache');
    const cacheKey = core.getInput('cache-key');
    const gasSnapshotEnabled = core.getBooleanInput('gas-snapshot');
    
    // Cache options
    const cacheOptions: CacheOptions = {
      enabled: cacheEnabled,
      primaryKey: cacheKey
    };
    
    if (cacheEnabled) {
      core.startGroup('Saving caches');
      
      // Save RPC cache
      await saveRPCCache(cacheOptions);
      
      // Save artifacts cache
      await saveArtifactsCache(cacheOptions);
      
      // Save gas snapshot cache if enabled
      if (gasSnapshotEnabled) {
        await saveGasSnapshotCache(cacheOptions);
      }
      
      core.endGroup();
    } else {
      core.info('Cache not requested, not saving caches');
    }
    
    if (earlyExit) {
      process.exit(0);
    }
  } catch (error) {
    let message = 'Unknown error!';
    if (error instanceof Error) {
      message = error.message;
    }
    if (typeof error === 'string') {
      message = error;
    }
    core.warning(message);
    
    if (earlyExit) {
      process.exit(1);
    }
  }
}

// Run the post-action
if (require.main === module) {
  run(true).catch(error => {
    core.warning(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

export default run;
