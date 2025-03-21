import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Gets the current GitHub context information
 * @returns Object containing GitHub context information
 */
export function getGitHubContext(): {
  repo: string;
  owner: string;
  sha: string;
  ref: string;
  workflow: string;
  runId: number;
  runNumber: number;
} {
  const { repo, ref, sha } = github.context;
  const { owner, repo: repoName } = repo;
  
  return {
    repo: repoName,
    owner,
    sha,
    ref,
    workflow: github.context.workflow,
    runId: github.context.runId,
    runNumber: github.context.runNumber
  };
}

/**
 * Creates a unique identifier for the current GitHub workflow run
 * @returns A string identifier for the current workflow run
 */
export function getWorkflowRunIdentifier(): string {
  const { owner, repo, runId } = getGitHubContext();
  return `${owner}/${repo}/${runId}`;
}

/**
 * Gets the GitHub token from the environment
 * @returns The GitHub token or undefined if not available
 */
export function getGitHubToken(): string | undefined {
  return core.getInput('github-token') || process.env.GITHUB_TOKEN;
}

/**
 * Creates an Octokit client for GitHub API operations
 * @param token The GitHub token to use for authentication
 * @returns An authenticated Octokit client or undefined if no token is available
 */
export function createOctokitClient(token?: string): ReturnType<typeof github.getOctokit> | undefined {
  const authToken = token || getGitHubToken();
  
  if (!authToken) {
    core.warning('No GitHub token available, some features may be limited');
    return undefined;
  }
  
  return github.getOctokit(authToken);
}

/**
 * Determines if the current workflow is running on a pull request
 * @returns True if running on a pull request, false otherwise
 */
export function isPullRequest(): boolean {
  return github.context.payload.pull_request !== undefined;
}

/**
 * Gets the pull request number if the current workflow is running on a pull request
 * @returns The pull request number or undefined if not running on a pull request
 */
export function getPullRequestNumber(): number | undefined {
  if (!isPullRequest()) {
    return undefined;
  }
  
  return github.context.payload.pull_request?.number;
}
