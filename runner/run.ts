// forge-reporter-runner.ts
import * as path from 'path';
import * as fs from 'fs';
import { ForgeGithubActionsReporter } from '../../../reporter/forge-reporter';

// Configuration
const FORGE_RESULTS_PATH = path.join(process.cwd(), 'forge-output.json');
const PROJECT_ROOT = process.cwd();
const TEXT_OUTPUT_PATH = path.join(process.cwd(), 'forge-test-results.txt');

// Determine if running in CI environment
const isCI = process.env.CI !== 'false' && (
  process.env.CI === 'true' || 
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.GITLAB_CI === 'true' ||
  process.env.CIRCLECI === 'true'
);

// Create custom output handler based on environment
export const outputHandler = isCI 
  ? undefined // Use default GitHub Actions output
  : {
      log: (message: string) => {
        fs.appendFileSync(TEXT_OUTPUT_PATH, message + '\n');
      },
      startGroup: (title: string) => {
        fs.appendFileSync(TEXT_OUTPUT_PATH, '\n----- ' + title + ' -----\n');
      },
      endGroup: () => {
        fs.appendFileSync(TEXT_OUTPUT_PATH, '\n');
      }
    };

// Initialize output file if not in CI mode
if (!isCI && fs.existsSync(TEXT_OUTPUT_PATH)) {
  fs.unlinkSync(TEXT_OUTPUT_PATH);
}

// Create and run the reporter with the appropriate output handler
const reporter = new ForgeGithubActionsReporter(
  FORGE_RESULTS_PATH, 
  PROJECT_ROOT,
  outputHandler
);
try {
  console.log(`Running Forge reporter in ${isCI ? 'CI' : 'local'} mode...`);
  reporter.report();
  
  if (!isCI) {
    console.log(`Test results written to: ${TEXT_OUTPUT_PATH}`);
  }
} catch (error: unknown) {  console.error('Error running reporter:', error);
  process.exit(1);
}
