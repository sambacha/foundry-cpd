import * as core from '@actions/core';
import * as path from 'path';
import { execSync } from 'child_process';

import { GasSnapshot } from '../types';
import {
  CACHE_PATHS,
  GAS_SNAPSHOT_FILENAME,
  GAS_SNAPSHOT_HISTORY_FILENAME,
  GAS_SNAPSHOT_COMPARISON_THRESHOLD,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../constants';
import { State } from '../types/state';
import { getGitHubContext, isPullRequest } from '../utils/github';
import { readJsonFile, writeJsonFile, ensureDirectoryExists } from '../utils/fs';

/**
 * Parses a gas snapshot from the output of the forge snapshot command
 * @param snapshotOutput The output of the forge snapshot command
 * @returns A gas snapshot object
 */
export function parseGasSnapshot(snapshotOutput: string): Record<string, number> {
  try {
    const lines = snapshotOutput.split('\n');
    const result: Record<string, number> = {};

    for (const line of lines) {
      // Match lines like "test_name() (gas: 12345)"
      const match = line.match(/^(.*?)\s+\(gas:\s+(\d+)\)/);
      if (match) {
        const [, testName, gasUsed] = match;
        result[testName.trim()] = parseInt(gasUsed, 10);
      }
    }

    return result;
  } catch (error) {
    core.warning(
      `${ERROR_MESSAGES.GAS_SNAPSHOT_PARSE_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {};
  }
}

/**
 * Captures a gas snapshot by running the forge snapshot command
 * @param testPattern Optional test pattern to filter tests
 * @returns A promise that resolves to a gas snapshot object
 */
export async function captureGasSnapshot(testPattern?: string): Promise<Record<string, number>> {
  try {
    const command = `forge snapshot ${testPattern ? `--match-test "${testPattern}"` : ''}`;
    core.info(`Capturing gas snapshot with command: ${command}`);

    const output = execSync(command, { encoding: 'utf8' });
    const snapshot = parseGasSnapshot(output);

    core.info(`Captured gas snapshot with ${Object.keys(snapshot).length} test results`);
    return snapshot;
  } catch (error) {
    core.warning(`Failed to capture gas snapshot: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

/**
 * Creates a gas snapshot object with metadata
 * @param testResults The test results from the gas snapshot
 * @returns A gas snapshot object with metadata
 */
export function createGasSnapshot(testResults: Record<string, number>): GasSnapshot {
  const { sha } = getGitHubContext();

  return {
    timestamp: new Date().toISOString(),
    commitSha: sha,
    testResults: Object.entries(testResults).reduce(
      (acc, [testName, gasUsed]) => {
        acc[testName] = { gasUsed };
        return acc;
      },
      {} as GasSnapshot['testResults'],
    ),
  };
}

/**
 * Compares two gas snapshots and adds comparison data to the current snapshot
 * @param currentSnapshot The current gas snapshot
 * @param previousSnapshot The previous gas snapshot to compare against
 * @returns The current snapshot with comparison data added
 */
export function compareGasSnapshots(currentSnapshot: GasSnapshot, previousSnapshot: GasSnapshot): GasSnapshot {
  // Create a new snapshot object to avoid modifying the original
  const result: GasSnapshot = {
    ...currentSnapshot,
    testResults: { ...currentSnapshot.testResults },
  };

  // Add comparison data for each test
  for (const [testName, current] of Object.entries(result.testResults)) {
    const previous = previousSnapshot.testResults[testName];

    if (previous) {
      const change = current.gasUsed - previous.gasUsed;
      const changePercentage = (change / previous.gasUsed) * 100;

      result.testResults[testName] = {
        ...current,
        comparison: {
          previous: previous.gasUsed,
          change,
          changePercentage,
        },
      };
    }
  }

  return result;
}

/**
 * Saves a gas snapshot to the specified file
 * @param snapshot The gas snapshot to save
 * @param filePath The path to save the snapshot to
 * @returns A promise that resolves to a boolean indicating whether the snapshot was saved
 */
export async function saveGasSnapshot(
  snapshot: GasSnapshot,
  filePath: string = path.join(CACHE_PATHS.GAS_SNAPSHOTS, GAS_SNAPSHOT_FILENAME),
): Promise<boolean> {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    const result = writeJsonFile(filePath, snapshot);

    if (result) {
      core.info(`${SUCCESS_MESSAGES.GAS_SNAPSHOT_SAVE_SUCCESS}: ${filePath}`);
      core.saveState(State.GasSnapshotKey, filePath);
    }

    return result;
  } catch (error) {
    core.warning(
      `${ERROR_MESSAGES.GAS_SNAPSHOT_SAVE_FAILED}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

/**
 * Loads a gas snapshot from the specified file
 * @param filePath The path to load the snapshot from
 * @returns The loaded gas snapshot or undefined if the file does not exist or is invalid
 */
export function loadGasSnapshot(
  filePath: string = path.join(CACHE_PATHS.GAS_SNAPSHOTS, GAS_SNAPSHOT_FILENAME),
): GasSnapshot | undefined {
  return readJsonFile<GasSnapshot>(filePath);
}

/**
 * Adds a gas snapshot to the history file
 * @param snapshot The gas snapshot to add to the history
 * @param historyFilePath The path to the history file
 * @returns A promise that resolves to a boolean indicating whether the snapshot was added to the history
 */
export async function addGasSnapshotToHistory(
  snapshot: GasSnapshot,
  historyFilePath: string = path.join(CACHE_PATHS.GAS_SNAPSHOTS, GAS_SNAPSHOT_HISTORY_FILENAME),
): Promise<boolean> {
  try {
    ensureDirectoryExists(path.dirname(historyFilePath));

    // Load existing history or create a new one
    const history = readJsonFile<GasSnapshot[]>(historyFilePath) || [];

    // Add the new snapshot to the history
    history.push(snapshot);

    // Limit history size to 100 entries
    const limitedHistory = history.slice(-100);

    // Save the updated history
    const result = writeJsonFile(historyFilePath, limitedHistory);

    if (result) {
      core.info(`Added gas snapshot to history: ${historyFilePath}`);
    }

    return result;
  } catch (error) {
    core.warning(`Failed to add gas snapshot to history: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Generates a markdown report of gas changes
 * @param snapshot The gas snapshot with comparison data
 * @returns A markdown string containing the gas changes report
 */
export function generateGasReport(snapshot: GasSnapshot): string {
  const { testResults } = snapshot;
  const testNames = Object.keys(testResults);

  if (testNames.length === 0) {
    return 'No gas snapshot data available.';
  }

  // Filter tests with comparison data
  const testsWithComparison = testNames.filter((testName) => testResults[testName].comparison !== undefined);

  if (testsWithComparison.length === 0) {
    return 'No comparison data available for gas snapshot.';
  }

  // Sort tests by gas change percentage (largest increase first)
  const sortedTests = [...testsWithComparison].sort((a, b) => {
    const aChange = testResults[a].comparison?.changePercentage || 0;
    const bChange = testResults[b].comparison?.changePercentage || 0;
    return bChange - aChange;
  });

  // Generate the report
  let report = '## Gas Snapshot Comparison\n\n';
  report += '| Test | Current Gas | Previous Gas | Change | % Change |\n';
  report += '|------|-------------|--------------|--------|----------|\n';

  for (const testName of sortedTests) {
    const { gasUsed, comparison } = testResults[testName];

    if (!comparison) continue;

    const { previous, change = 0, changePercentage = 0 } = comparison;
    const changeFormatted = change > 0 ? `+${change}` : `${change}`;
    const percentFormatted = changePercentage.toFixed(2);
    const isSignificant = Math.abs(changePercentage) >= GAS_SNAPSHOT_COMPARISON_THRESHOLD;

    // Add emoji indicators for significant changes
    let indicator = '';
    if (isSignificant) {
      indicator = change > 0 ? ' 🔴' : ' 🟢';
    }

    report += `| ${testName} | ${gasUsed} | ${previous} | ${changeFormatted} | ${percentFormatted}%${indicator} |\n`;
  }

  // Add a summary
  const increases = sortedTests.filter((testName) => (testResults[testName].comparison?.change || 0) > 0).length;

  const decreases = sortedTests.filter((testName) => (testResults[testName].comparison?.change || 0) < 0).length;

  const unchanged = sortedTests.filter((testName) => (testResults[testName].comparison?.change || 0) === 0).length;

  report += '\n### Summary\n\n';
  report += `- 🔴 Gas increases: ${increases}\n`;
  report += `- 🟢 Gas decreases: ${decreases}\n`;
  report += `- ⚪ Unchanged: ${unchanged}\n`;
  report += `- Total tests compared: ${sortedTests.length}\n`;

  return report;
}

/**
 * Posts a gas report as a comment on a pull request
 * @param report The markdown report to post
 * @returns A promise that resolves to a boolean indicating whether the report was posted
 */
export async function postGasReportToPR(report: string): Promise<boolean> {
  // This would use the GitHub API to post a comment on a PR
  // For now, we'll just log the report
  if (!isPullRequest()) {
    core.info('Not running on a pull request, skipping PR comment');
    return false;
  }

  core.info('Would post the following gas report to PR:');
  core.info(report);

  return true;
}
