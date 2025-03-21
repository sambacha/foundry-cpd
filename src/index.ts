import * as core from '@actions/core';
import * as path from 'path';

import { CacheOptions } from './types';
import { 
  downloadFoundry, 
  addFoundryToPath,
  restoreRPCCache,
  restoreArtifactsCache,
  restoreGasSnapshotCache,
  captureGasSnapshot,
  createGasSnapshot,
  loadGasSnapshot,
  compareGasSnapshots,
  saveGasSnapshot,
  addGasSnapshotToHistory,
  generateGasReport,
  postGasReportToPR
} from './services';

/**
 * Main function for the Foundry Toolchain action
 */
async function main(): Promise<void> {
  try {
    // Get inputs
    const version = core.getInput('version');
    const cacheEnabled = core.getBooleanInput('cache');
    const cacheKey = core.getInput('cache-key');
    const cacheRestoreKeys = core.getInput('cache-restore-keys');
    const gasSnapshotEnabled = core.getBooleanInput('gas-snapshot');
    const gasSnapshotTestPattern = core.getInput('gas-snapshot-test-pattern');
    const gasSnapshotPrComment = core.getBooleanInput('gas-snapshot-pr-comment');
    
    // Download and install Foundry
    core.startGroup('Downloading Foundry');
    const { binPath } = await downloadFoundry(version);
    addFoundryToPath(binPath);
    core.endGroup();
    
    // Cache options
    const cacheOptions: CacheOptions = {
      enabled: cacheEnabled,
      primaryKey: cacheKey,
      restoreKeys: cacheRestoreKeys ? cacheRestoreKeys.split('\n') : undefined
    };
    
    // Restore caches if enabled
    if (cacheEnabled) {
      core.startGroup('Restoring caches');
      
      // Restore RPC cache
      await restoreRPCCache(cacheOptions);
      
      // Restore artifacts cache
      await restoreArtifactsCache(cacheOptions);
      
      // Restore gas snapshot cache if enabled
      if (gasSnapshotEnabled) {
        await restoreGasSnapshotCache(cacheOptions);
      }
      
      core.endGroup();
    } else {
      core.info('Cache not requested, not restoring caches');
    }
    
    // Handle gas snapshot if enabled
    if (gasSnapshotEnabled) {
      core.startGroup('Processing gas snapshot');
      
      // Capture current gas snapshot
      const testResults = await captureGasSnapshot(gasSnapshotTestPattern);
      const currentSnapshot = createGasSnapshot(testResults);
      
      // Load previous snapshot for comparison
      const previousSnapshot = loadGasSnapshot();
      
      if (previousSnapshot) {
        // Compare snapshots and generate report
        const comparedSnapshot = compareGasSnapshots(currentSnapshot, previousSnapshot);
        
        // Save the snapshot with comparison data
        await saveGasSnapshot(comparedSnapshot);
        
        // Add to history
        await addGasSnapshotToHistory(comparedSnapshot);
        
        // Generate and post report if requested
        if (gasSnapshotPrComment) {
          const report = generateGasReport(comparedSnapshot);
          await postGasReportToPR(report);
        }
        
        core.info('Gas snapshot comparison completed');
      } else {
        // Save the snapshot without comparison data
        await saveGasSnapshot(currentSnapshot);
        await addGasSnapshotToHistory(currentSnapshot);
        core.info('No previous gas snapshot found, saved current snapshot');
      }
      
      core.endGroup();
    }
    
    core.info('Foundry Toolchain setup completed successfully');
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

// Run the action
if (require.main === module) {
  main().catch(error => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}

export default main;
