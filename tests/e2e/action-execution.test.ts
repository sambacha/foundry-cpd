import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import * as cache from '@actions/cache';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

import main from '../../src/index';
import run from '../../src/post';
import { State } from '../../src/types/state';
import { setupAllMocks } from '../fakes';

// Mock all dependencies
jest.mock('@actions/core', () => {
  const { mockCore } = require('../fakes/actions-core.fake');
  return mockCore;
});

jest.mock('@actions/tool-cache', () => {
  const { mockToolCache } = require('../fakes/actions-tool-cache.fake');
  return mockToolCache;
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

jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation((command) => {
    if (command.includes('forge snapshot')) {
      return `
test_simple_transfer() (gas: 21584)
test_multiple_transfers() (gas: 45291)
test_transfer_with_permit() (gas: 62145)
test_single_mint() (gas: 34872)
      `;
    }
    return '';
  })
}));

describe('End-to-End Action Execution', () => {
  // Define constants for the test environment
  const HOME_DIR = '/home/user';
  const FOUNDRY_CACHE_DIR = path.join(HOME_DIR, '.foundry/cache');
  const RPC_CACHE_DIR = path.join(FOUNDRY_CACHE_DIR, 'rpc');
  const ARTIFACTS_CACHE_DIR = path.join(FOUNDRY_CACHE_DIR, 'artifacts');
  const GAS_SNAPSHOTS_DIR = path.join(FOUNDRY_CACHE_DIR, 'gas-snapshots');
  
  beforeEach(() => {
    // Set up all mocks with default configuration
    const mocks = setupAllMocks();
    
    // Configure GitHub context
    mocks.github._setupContext({
      sha: '1234567890abcdef',
      ref: 'refs/heads/main'
    });
    
    // Configure file system with necessary directories
    mocks.fs._setupFiles({
      [HOME_DIR]: null,
      [FOUNDRY_CACHE_DIR]: null,
      [RPC_CACHE_DIR]: null,
      [ARTIFACTS_CACHE_DIR]: null,
      [GAS_SNAPSHOTS_DIR]: null
    });
    
    // Mock HOME directory
    jest.spyOn(os, 'homedir').mockReturnValue(HOME_DIR);
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic action execution', () => {
    it('should download and install Foundry with default settings', async () => {
      // Configure core inputs for default execution
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'true'
      };
      
      // Execute the main action
      await main();
      
      // Verify Foundry was downloaded
      const { mockToolCache } = require('../fakes/actions-tool-cache.fake');
      expect(mockToolCache.downloadTool).toHaveBeenCalledWith(
        expect.stringContaining('foundry-rs/foundry/releases/download/stable')
      );
      
      // Verify the binary was extracted
      expect(mockToolCache.extractTar).toHaveBeenCalled();
      
      // Verify binaries were added to PATH
      expect(mockCore.addPath).toHaveBeenCalled();
      
      // Verify cache was restored
      const { mockCache } = require('../fakes/actions-cache.fake');
      expect(mockCache.restoreCache).toHaveBeenCalled();
      
      // Verify no errors were reported
      expect(mockCore.setFailed).not.toHaveBeenCalled();
    });
    
    it('should handle specified version correctly', async () => {
      // Configure core inputs with specific version
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'v0.3.0',
        'cache': 'true'
      };
      
      // Execute the main action
      await main();
      
      // Verify correct version was downloaded
      const { mockToolCache } = require('../fakes/actions-tool-cache.fake');
      expect(mockToolCache.downloadTool).toHaveBeenCalledWith(
        expect.stringContaining('foundry-rs/foundry/releases/download/v0.3.0')
      );
    });
    
    it('should skip cache when disabled', async () => {
      // Configure core inputs with cache disabled
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'false'
      };
      
      // Execute the main action
      await main();
      
      // Verify Foundry was still downloaded
      const { mockToolCache } = require('../fakes/actions-tool-cache.fake');
      expect(mockToolCache.downloadTool).toHaveBeenCalled();
      
      // Verify cache operations were skipped
      const { mockCache } = require('../fakes/actions-cache.fake');
      expect(mockCache.restoreCache).not.toHaveBeenCalled();
      
      // Execute post-action
      await run(false);
      
      // Verify cache save was skipped
      expect(mockCache.saveCache).not.toHaveBeenCalled();
    });
  });

  describe('Gas snapshot functionality', () => {
    it('should capture and process gas snapshots when enabled', async () => {
      // Configure core inputs with gas snapshot enabled
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'true',
        'gas-snapshot': 'true',
        'gas-snapshot-pr-comment': 'false' // Disable PR comment for this test
      };
      
      // Setup mock for child_process execSync to return gas snapshot data
      const execSyncMock = require('child_process').execSync;
      
      // Execute the main action
      await main();
      
      // Verify gas snapshot was captured
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('forge snapshot'),
        expect.any(Object)
      );
      
      // Verify gas snapshot file was created
      const { mockFs } = require('../fakes/fs.fake');
      const gasSnapshotPath = path.join(GAS_SNAPSHOTS_DIR, 'gas-snapshot.json');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        gasSnapshotPath,
        expect.any(String),
        expect.any(Object)
      );
      
      // Verify gas snapshot history was updated
      const historyPath = path.join(GAS_SNAPSHOTS_DIR, 'gas-snapshot-history.json');
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        historyPath,
        expect.any(String),
        expect.any(Object)
      );
    });
    
    it('should generate PR comment when enabled on a pull request', async () => {
      // Configure core inputs with gas snapshot and PR comment enabled
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'true',
        'gas-snapshot': 'true',
        'gas-snapshot-pr-comment': 'true',
        'github-token': 'fake-token'
      };
      
      // Configure GitHub context for a pull request
      const { mockGitHub } = require('../fakes/actions-github.fake');
      mockGitHub._setupContext({
        isPullRequest: true,
        pullRequestNumber: 123,
        pullRequestTitle: 'Test PR'
      });
      
      // Setup mock file system with previous snapshot
      const { mockFs } = require('../fakes/fs.fake');
      const previousSnapshot = {
        timestamp: '2025-03-20T12:00:00.000Z',
        commitSha: 'previous-sha',
        testResults: {
          'test_simple_transfer()': { gasUsed: 22000 },
          'test_multiple_transfers()': { gasUsed: 45000 }
        }
      };
      
      mockFs._setupFiles({
        [HOME_DIR]: null,
        [FOUNDRY_CACHE_DIR]: null,
        [RPC_CACHE_DIR]: null,
        [ARTIFACTS_CACHE_DIR]: null,
        [GAS_SNAPSHOTS_DIR]: null,
        [path.join(GAS_SNAPSHOTS_DIR, 'gas-snapshot.json')]: JSON.stringify(previousSnapshot)
      });
      
      // Execute the main action
      await main();
      
      // Verify GitHub API was called to post a comment
      expect(mockGitHub.getOctokit).toHaveBeenCalled();
      expect(mockGitHub._octokit.rest.issues.createComment).toHaveBeenCalledWith({
        owner: expect.any(String),
        repo: expect.any(String),
        issue_number: 123,
        body: expect.stringContaining('Gas Snapshot Comparison')
      });
    });
  });

  describe('Post-execution cache saving', () => {
    it('should save cache in post action when enabled', async () => {
      // Configure core inputs
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'true'
      };
      
      // Setup state as if main action ran
      mockCore._state = {
        [State.CachePrimaryKey]: 'test-cache-key'
      };
      
      // Execute post action
      await run(false);
      
      // Verify cache was saved
      const { mockCache } = require('../fakes/actions-cache.fake');
      expect(mockCache.saveCache).toHaveBeenCalled();
    });
    
    it('should handle early exit in post action', async () => {
      // Configure core inputs
      const { mockCore } = require('../fakes/actions-core.fake');
      mockCore._inputs = {
        'version': 'stable',
        'cache': 'true'
      };
      
      // Mock process.exit
      const originalExit = process.exit;
      const mockExit = jest.fn();
      process.exit = mockExit as any;
      
      try {
        // Execute post action with early exit
        await run(true);
        
        // Verify process.exit was called with 0
        expect(mockExit).toHaveBeenCalledWith(0);
      } finally {
        // Restore original process.exit
        process.exit = originalExit;
      }
    });
  });
});
