import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Types to represent Forge test output structure
type ForgeTestResult = {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  gasUsed: number;
  error?: string;
};

type ForgeContractTest = {
  contractName: string;
  tests: ForgeTestResult[];
  duration: number;
};

type ForgeAggregatedResult = {
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalTests: number;
  passedContracts: number;
  failedContracts: number;
  totalContracts: number;
  totalDuration: number;
};

// Icons for test status display
const ICONS = {
  success: '✓',
  failure: '✕',
  skipped: '○'
};

// Tree structure for organizing test results
type ResultTreeLeaf = {
  name: string;
  status: 'success' | 'failure' | 'skipped';
  duration: number;
  gasUsed: number;
  children: Array<never>;
};

type ResultTreeNode = {
  name: string;
  passed: boolean;
  children: Array<ResultTreeNode | ResultTreeLeaf>;
};

type ResultTree = {
  children: Array<ResultTreeLeaf | ResultTreeNode>;
  name: string;
  passed: boolean;
  duration: number;
};

export default class ForgeGithubActionsReporter {
  private resultFilePath: string;
  private rootDir: string;

  constructor(resultFilePath: string, rootDir: string) {
    this.resultFilePath = resultFilePath;
    this.rootDir = rootDir;
  }

  // Main entry point
  public report(): void {
    try {
      const testResults = this.parseForgeOutput(this.resultFilePath);
      const aggregatedResults = this.aggregateResults(testResults);
      
      this.reportResults(testResults, aggregatedResults);
    } catch (error) {
      if (error instanceof Error) {
        core.error(`Failed to parse Forge test results: ${error.message}`);
      } else {
        core.error('Failed to parse Forge test results due to an unknown error');
      }
      core.setFailed('Forge test reporting failed');
    }
  }

  // Parse the Forge JSON output file
  private parseForgeOutput(filePath: string): ForgeContractTest[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const rawResults = JSON.parse(content);
    
    // Transform raw JSON into our internal format
    // This would need to be adapted to match actual Forge output format
    const contractTests: ForgeContractTest[] = [];
    
    // Example transformation based on assumed Forge output format
    // Actual implementation would depend on the real format
    for (const contractName in rawResults) {
      if (Object.prototype.hasOwnProperty.call(rawResults, contractName)) {
        const contractData = rawResults[contractName];
        const tests: ForgeTestResult[] = [];
        let contractDuration = 0;
        
        for (const testName in contractData.tests) {
          if (Object.prototype.hasOwnProperty.call(contractData.tests, testName)) {
            const testData = contractData.tests[testName];
            const testResult: ForgeTestResult = {
              name: testName,
              status: testData.success ? 'success' : 'failure',
              duration: testData.duration || 0,
              gasUsed: testData.gasUsed || 0,
              error: testData.error
            };
            
            tests.push(testResult);
            contractDuration += testResult.duration;
          }
        }
        
        contractTests.push({
          contractName,
          tests,
          duration: contractDuration
        });
      }
    }
    
    return contractTests;
  }

  // Aggregate test results for summary
  private aggregateResults(contractTests: ForgeContractTest[]): ForgeAggregatedResult {
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;
    let passedContracts = 0;
    let failedContracts = 0;
    
    for (const contract of contractTests) {
      let contractFailed = false;
      totalDuration += contract.duration;
      
      for (const test of contract.tests) {
        if (test.status === 'success') {
          passedTests++;
        } else if (test.status === 'failure') {
          failedTests++;
          contractFailed = true;
        } else if (test.status === 'skipped') {
          skippedTests++;
        }
      }
      
      if (contractFailed) {
        failedContracts++;
      } else {
        passedContracts++;
      }
    }
    
    return {
      passedTests,
      failedTests,
      skippedTests,
      totalTests: passedTests + failedTests + skippedTests,
      passedContracts,
      failedContracts,
      totalContracts: contractTests.length,
      totalDuration
    };
  }

  // Report test results to GitHub Actions
  private reportResults(
    contractTests: ForgeContractTest[],
    aggregated: ForgeAggregatedResult
  ): void {
    for (const contract of contractTests) {
      const resultTree = this.buildResultTree(contract);
      this.printResultTree(resultTree);
    }
    
    this.printFailedTestErrors(contractTests);
    this.printSummary(aggregated);
  }

  // Build a result tree for a contract's tests
  private buildResultTree(contract: ForgeContractTest): ResultTree {
    const contractPath = contract.contractName.replace(this.rootDir, '');
    const root: ResultTree = {
      children: [],
      name: contractPath,
      passed: !contract.tests.some(test => test.status === 'failure'),
      duration: contract.duration
    };
    
    for (const test of contract.tests) {
      const leaf: ResultTreeLeaf = {
        children: [],
        name: test.name,
        status: test.status,
        duration: test.duration,
        gasUsed: test.gasUsed
      };
      
      root.children.push(leaf);
    }
    
    return root;
  }

  // Print a result tree to GitHub Actions logs
  private printResultTree(resultTree: ResultTree): void {
    const durationMs = ` (${resultTree.duration} ms)`;
    
    if (resultTree.passed) {
      this.startGroup(
        `${chalk.bold.green.inverse('PASS')} ${resultTree.name}${durationMs}`
      );
      for (const child of resultTree.children) {
        this.recursivePrintResultTree(child, true, 1);
      }
      this.endGroup();
    } else {
      this.log(
        `  ${chalk.bold.red.inverse('FAIL')} ${resultTree.name}${durationMs}`
      );
      for (const child of resultTree.children) {
        this.recursivePrintResultTree(child, false, 1);
      }
    }
  }

  // Recursively print a result tree node
  private recursivePrintResultTree(
    resultTree: ResultTreeNode | ResultTreeLeaf,
    alreadyGrouped: boolean,
    depth: number
  ): void {
    if (resultTree.children.length === 0) {
      if (!('status' in resultTree)) {
        throw new Error('Expected a leaf. Got a node.');
      }
      
      let numberSpaces = depth;
      if (!alreadyGrouped) {
        numberSpaces++;
      }
      const spaces = '  '.repeat(numberSpaces);
      let resultSymbol;
      
      switch (resultTree.status) {
        case 'success':
          resultSymbol = chalk.green(ICONS.success);
          break;
        case 'failure':
          resultSymbol = chalk.red(ICONS.failure);
          break;
        case 'skipped':
          resultSymbol = chalk.yellow(ICONS.skipped);
          break;
      }
      
      // Include gas usage in the output which is specific to Solidity tests
      this.log(
        `${spaces}${resultSymbol} ${resultTree.name} (${resultTree.duration} ms, ${resultTree.gasUsed} gas)`
      );
    } else {
      if (!('passed' in resultTree)) {
        throw new Error('Expected a node. Got a leaf');
      }
      
      if (resultTree.passed) {
        if (alreadyGrouped) {
          this.log('  '.repeat(depth) + resultTree.name);
          for (const child of resultTree.children) {
            this.recursivePrintResultTree(child, true, depth + 1);
          }
        } else {
          this.startGroup('  '.repeat(depth) + resultTree.name);
          for (const child of resultTree.children) {
            this.recursivePrintResultTree(child, true, depth + 1);
          }
          this.endGroup();
        }
      } else {
        this.log('  '.repeat(depth + 1) + resultTree.name);
        for (const child of resultTree.children) {
          this.recursivePrintResultTree(child, false, depth + 1);
        }
      }
    }
  }

  // Print error messages for failed tests
  private printFailedTestErrors(contractTests: ForgeContractTest[]): void {
    let hasFailures = false;
    
    for (const contract of contractTests) {
      const failedTests = contract.tests.filter(test => test.status === 'failure' && test.error);
      
      if (failedTests.length > 0) {
        if (!hasFailures) {
          this.log('');
          hasFailures = true;
        }
        
        this.startGroup(`Errors in ${contract.contractName}`);
        for (const test of failedTests) {
          this.log(`Test: ${test.name}`);
          this.log(test.error || 'Unknown error');
          this.log('');
        }
        this.endGroup();
      }
    }
  }

  // Print summary of test results
  private printSummary(results: ForgeAggregatedResult): void {
    this.log('');
    
    const passed = chalk.bold.green(`${results.passedTests} passed`);
    const failed = results.failedTests > 0 
      ? chalk.bold.red(`, ${results.failedTests} failed`) 
      : '';
    const skipped = results.skippedTests > 0 
      ? chalk.bold.yellow(`, ${results.skippedTests} skipped`) 
      : '';
    const total = chalk.bold(`${results.totalTests} total`);
    
    this.log(`Test Suites: ${results.passedContracts} passed, ${results.failedContracts} failed, ${results.totalContracts} total`);
    this.log(`Tests:       ${passed}${failed}${skipped}, ${total}`);
    this.log(`Time:        ${results.totalDuration} ms`);
    this.log('Ran all Forge test suites.');
  }

  // Log a message to GitHub Actions
  private log(message: string): void {
    core.info(message);
  }

  // Start a collapsible group in GitHub Actions
  private startGroup(title: string): void {
    core.startGroup(title);
  }

  // End a collapsible group in GitHub Actions
  private endGroup(): void {
    core.endGroup();
  }
}

// Example usage
// const reporter = new ForgeGithubActionsReporter('forge-test-output.json', process.cwd());
// reporter.report();
