import { 
  parseGasSnapshot, 
  createGasSnapshot, 
  compareGasSnapshots, 
  generateGasReport 
} from '../../../src/services/gas';
import { GasSnapshot } from '../../../src/types';
import { setupGitHubMock } from '../../fakes/actions-github.fake';

// Mock GitHub context
jest.mock('@actions/github', () => {
  const { mockGitHub } = require('../../fakes/actions-github.fake');
  return mockGitHub;
});

// Mock child_process module to prevent real execution
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

describe('Gas Snapshot Service', () => {
  beforeEach(() => {
    // Setup GitHub mock
    setupGitHubMock({
      sha: '1234567890abcdef'
    });
  });

  describe('parseGasSnapshot', () => {
    it('should correctly parse forge snapshot output', () => {
      const snapshotOutput = `
test_simple_transfer() (gas: 21584)
test_multiple_transfers() (gas: 45291)
test_transfer_with_permit() (gas: 62145)
test_single_mint() (gas: 34872)
      `;

      const result = parseGasSnapshot(snapshotOutput);

      expect(result).toEqual({
        'test_simple_transfer()': 21584,
        'test_multiple_transfers()': 45291,
        'test_transfer_with_permit()': 62145,
        'test_single_mint()': 34872
      });
    });

    it('should handle empty input', () => {
      const result = parseGasSnapshot('');
      expect(result).toEqual({});
    });

    it('should ignore lines that do not match the pattern', () => {
      const snapshotOutput = `
test_simple_transfer() (gas: 21584)
This line should be ignored
test_multiple_transfers() (gas: 45291)
Another line to ignore
      `;

      const result = parseGasSnapshot(snapshotOutput);

      expect(result).toEqual({
        'test_simple_transfer()': 21584,
        'test_multiple_transfers()': 45291
      });
    });
  });

  describe('createGasSnapshot', () => {
    it('should create a valid snapshot object with metadata', () => {
      const testResults = {
        'test_simple_transfer()': 21584,
        'test_multiple_transfers()': 45291
      };

      const snapshot = createGasSnapshot(testResults);

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('commitSha', '1234567890abcdef');
      expect(snapshot).toHaveProperty('testResults');
      
      expect(snapshot.testResults['test_simple_transfer()']).toEqual({ gasUsed: 21584 });
      expect(snapshot.testResults['test_multiple_transfers()']).toEqual({ gasUsed: 45291 });
    });

    it('should create an empty snapshot for empty test results', () => {
      const snapshot = createGasSnapshot({});

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('commitSha', '1234567890abcdef');
      expect(snapshot.testResults).toEqual({});
    });
  });

  describe('compareGasSnapshots', () => {
    let currentSnapshot: GasSnapshot;
    let previousSnapshot: GasSnapshot;

    beforeEach(() => {
      // Setup test snapshots
      currentSnapshot = {
        timestamp: '2025-03-21T12:00:00.000Z',
        commitSha: '1234567890abcdef',
        testResults: {
          'test_simple_transfer()': { gasUsed: 20000 },
          'test_multiple_transfers()': { gasUsed: 45000 },
          'test_new_test()': { gasUsed: 30000 }
        }
      };

      previousSnapshot = {
        timestamp: '2025-03-20T12:00:00.000Z',
        commitSha: 'abcdef1234567890',
        testResults: {
          'test_simple_transfer()': { gasUsed: 22000 },
          'test_multiple_transfers()': { gasUsed: 45000 },
          'test_removed_test()': { gasUsed: 35000 }
        }
      };
    });

    it('should add comparison data for common tests', () => {
      const comparedSnapshot = compareGasSnapshots(currentSnapshot, previousSnapshot);
      
      // Check the common tests have comparison data
      expect(comparedSnapshot.testResults['test_simple_transfer()']).toHaveProperty('comparison');
      expect(comparedSnapshot.testResults['test_multiple_transfers()']).toHaveProperty('comparison');
      
      // Check specific comparison values
      const transferComparison = comparedSnapshot.testResults['test_simple_transfer()'].comparison!;
      expect(transferComparison.previous).toBe(22000);
      expect(transferComparison.change).toBe(-2000); // 20000 - 22000
      expect(transferComparison.changePercentage).toBeCloseTo(-9.09, 2); // (-2000 / 22000) * 100
      
      const multipleTransfersComparison = comparedSnapshot.testResults['test_multiple_transfers()'].comparison!;
      expect(multipleTransfersComparison.previous).toBe(45000);
      expect(multipleTransfersComparison.change).toBe(0);
      expect(multipleTransfersComparison.changePercentage).toBe(0);
    });

    it('should not add comparison data for new tests', () => {
      const comparedSnapshot = compareGasSnapshots(currentSnapshot, previousSnapshot);
      
      // New test should not have comparison data
      expect(comparedSnapshot.testResults['test_new_test()']).not.toHaveProperty('comparison');
    });

    it('should preserve original snapshot data', () => {
      const comparedSnapshot = compareGasSnapshots(currentSnapshot, previousSnapshot);
      
      // Check that the original data is preserved
      expect(comparedSnapshot.timestamp).toBe(currentSnapshot.timestamp);
      expect(comparedSnapshot.commitSha).toBe(currentSnapshot.commitSha);
      expect(comparedSnapshot.testResults['test_new_test()']).toEqual({ gasUsed: 30000 });
    });
  });

  describe('generateGasReport', () => {
    let snapshotWithComparison: GasSnapshot;

    beforeEach(() => {
      // Create a snapshot with comparison data
      snapshotWithComparison = {
        timestamp: '2025-03-21T12:00:00.000Z',
        commitSha: '1234567890abcdef',
        testResults: {
          'test_gas_increase()': { 
            gasUsed: 25000, 
            comparison: { 
              previous: 20000, 
              change: 5000, 
              changePercentage: 25 
            } 
          },
          'test_gas_decrease()': { 
            gasUsed: 18000, 
            comparison: { 
              previous: 22000, 
              change: -4000, 
              changePercentage: -18.18 
            } 
          },
          'test_gas_unchanged()': { 
            gasUsed: 30000, 
            comparison: { 
              previous: 30000, 
              change: 0, 
              changePercentage: 0 
            } 
          },
          'test_new_test()': { 
            gasUsed: 35000 
          }
        }
      };
    });

    it('should generate a markdown table with test comparisons', () => {
      const report = generateGasReport(snapshotWithComparison);
      
      // Check that the report contains the test names
      expect(report).toContain('test_gas_increase()');
      expect(report).toContain('test_gas_decrease()');
      expect(report).toContain('test_gas_unchanged()');
      
      // Check that the report doesn't include tests without comparison data
      expect(report).not.toContain('test_new_test()');
      
      // Check that the report contains the gas values
      expect(report).toContain('25000');
      expect(report).toContain('18000');
      expect(report).toContain('30000');
      
      // Check that the report contains the changes
      expect(report).toContain('+5000');
      expect(report).toContain('-4000');
      
      // Check that the report contains the change percentages
      expect(report).toContain('25.00%');
      expect(report).toContain('-18.18%');
      
      // Check that the report contains indicators for significant changes
      expect(report).toContain('🔴'); // For increase
      expect(report).toContain('🟢'); // For decrease
    });

    it('should include a summary of changes', () => {
      const report = generateGasReport(snapshotWithComparison);
      
      // Check that the report includes a summary section
      expect(report).toContain('### Summary');
      
      // Check that the summary counts are correct
      expect(report).toContain('Gas increases: 1');
      expect(report).toContain('Gas decreases: 1');
      expect(report).toContain('Unchanged: 1');
      expect(report).toContain('Total tests compared: 3');
    });

    it('should handle empty snapshots', () => {
      const emptySnapshot: GasSnapshot = {
        timestamp: '2025-03-21T12:00:00.000Z',
        commitSha: '1234567890abcdef',
        testResults: {}
      };
      
      const report = generateGasReport(emptySnapshot);
      expect(report).toContain('No gas snapshot data available');
    });

    it('should handle snapshots without comparison data', () => {
      const snapshotWithoutComparison: GasSnapshot = {
        timestamp: '2025-03-21T12:00:00.000Z',
        commitSha: '1234567890abcdef',
        testResults: {
          'test_1()': { gasUsed: 10000 },
          'test_2()': { gasUsed: 20000 }
        }
      };
      
      const report = generateGasReport(snapshotWithoutComparison);
      expect(report).toContain('No comparison data available');
    });
  });
});
