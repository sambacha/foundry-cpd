/**
 * Fake implementation of @actions/github for testing
 */

export interface MockPayload {
  repository?: {
    owner: {
      login: string;
    };
    name: string;
  };
  pull_request?: {
    number: number;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
      sha: string;
    };
    title: string;
    body?: string;
  };
  issue?: {
    number: number;
    title: string;
    body?: string;
  };
  ref?: string;
  sha?: string;
  workflow?: string;
  action?: string;
}

export const mockGitHub = {
  /**
   * Context object to mimic GitHub's context
   */
  context: {
    /**
     * Owner and repository name
     */
    repo: {
      owner: 'foundry-rs',
      repo: 'foundry-toolchain',
    },

    /**
     * Action payload
     */
    payload: {
      repository: {
        owner: {
          login: 'foundry-rs'
        },
        name: 'foundry-toolchain'
      },
      sha: '0123456789abcdef0123456789abcdef01234567',
      ref: 'refs/heads/main',
      workflow: 'CI',
      action: 'test'
    } as MockPayload,

    /**
     * Event name
     */
    eventName: 'push',

    /**
     * Workflow run ID
     */
    runId: 12345,

    /**
     * Workflow run number
     */
    runNumber: 1,

    /**
     * SHA of the commit
     */
    sha: '0123456789abcdef0123456789abcdef01234567',

    /**
     * Reference (e.g., branch, tag)
     */
    ref: 'refs/heads/main',

    /**
     * Workflow name
     */
    workflow: 'CI',

    /**
     * Action name
     */
    action: 'test',

    /**
     * GitHub API URL
     */
    apiUrl: 'https://api.github.com',

    /**
     * GitHub server URL
     */
    serverUrl: 'https://github.com',

    /**
     * GitHub GraphQL API URL
     */
    graphqlUrl: 'https://api.github.com/graphql',
  },

  /**
   * Mock Octokit for GitHub API operations
   */
  _octokit: {
    rest: {
      issues: {
        createComment: jest.fn().mockImplementation(async ({ owner, repo, issue_number, body }) => {
          mockGitHub._comments.push({
            owner,
            repo,
            issue_number,
            body
          });
          return {
            data: {
              id: mockGitHub._comments.length,
              body
            }
          };
        }),
      },
      pulls: {
        get: jest.fn().mockImplementation(async ({ owner, repo, pull_number }) => {
          const pr = mockGitHub._pullRequests.find(pr => 
            pr.owner === owner && 
            pr.repo === repo && 
            pr.number === pull_number
          );
          
          if (!pr) {
            throw new Error(`Pull request not found: ${owner}/${repo}#${pull_number}`);
          }
          
          return {
            data: {
              number: pr.number,
              title: pr.title,
              body: pr.body,
              head: {
                ref: pr.headRef,
                sha: pr.headSha
              },
              base: {
                ref: pr.baseRef,
                sha: pr.baseSha
              }
            }
          };
        })
      }
    }
  },

  /**
   * Storage for pull requests
   */
  _pullRequests: [] as Array<{
    owner: string;
    repo: string;
    number: number;
    title: string;
    body?: string;
    headRef: string;
    headSha: string;
    baseRef: string;
    baseSha: string;
  }>,

  /**
   * Storage for comments
   */
  _comments: [] as Array<{
    owner: string;
    repo: string;
    issue_number: number;
    body: string;
  }>,

  /**
   * Function to create an Octokit instance
   */
  getOctokit: jest.fn().mockImplementation(() => mockGitHub._octokit),

  /**
   * Reset all mocks and internal state
   */
  _reset(): void {
    mockGitHub._pullRequests = [];
    mockGitHub._comments = [];
    
    Object.keys(mockGitHub).forEach(key => {
      if (typeof mockGitHub[key] === 'function' && 'mockClear' in mockGitHub[key]) {
        mockGitHub[key].mockClear();
      }
    });

    // Reset Octokit mocks
    Object.keys(mockGitHub._octokit.rest.issues).forEach(key => {
      if (typeof mockGitHub._octokit.rest.issues[key] === 'function' && 'mockClear' in mockGitHub._octokit.rest.issues[key]) {
        mockGitHub._octokit.rest.issues[key].mockClear();
      }
    });
    
    Object.keys(mockGitHub._octokit.rest.pulls).forEach(key => {
      if (typeof mockGitHub._octokit.rest.pulls[key] === 'function' && 'mockClear' in mockGitHub._octokit.rest.pulls[key]) {
        mockGitHub._octokit.rest.pulls[key].mockClear();
      }
    });
  },

  /**
   * Set up initial pull requests
   */
  _setupPullRequests(pullRequests: Array<{
    owner: string;
    repo: string;
    number: number;
    title: string;
    body?: string;
    headRef: string;
    headSha: string;
    baseRef: string;
    baseSha: string;
  }>): void {
    mockGitHub._pullRequests.push(...pullRequests);
  },

  /**
   * Configure the GitHub context for testing
   */
  _setupContext(options: {
    owner?: string;
    repo?: string;
    sha?: string;
    ref?: string;
    eventName?: string;
    runId?: number;
    runNumber?: number;
    workflow?: string;
    action?: string;
    isPullRequest?: boolean;
    pullRequestNumber?: number;
    pullRequestTitle?: string;
    pullRequestBody?: string;
    pullRequestHeadRef?: string;
    pullRequestHeadSha?: string;
    pullRequestBaseRef?: string;
    pullRequestBaseSha?: string;
  } = {}): void {
    // Update repo information
    if (options.owner || options.repo) {
      mockGitHub.context.repo = {
        owner: options.owner || mockGitHub.context.repo.owner,
        repo: options.repo || mockGitHub.context.repo.repo
      };
      
      if (mockGitHub.context.payload.repository) {
        mockGitHub.context.payload.repository.owner.login = mockGitHub.context.repo.owner;
        mockGitHub.context.payload.repository.name = mockGitHub.context.repo.repo;
      }
    }
    
    // Update commit/ref information
    if (options.sha) {
      mockGitHub.context.sha = options.sha;
      mockGitHub.context.payload.sha = options.sha;
    }
    
    if (options.ref) {
      mockGitHub.context.ref = options.ref;
      mockGitHub.context.payload.ref = options.ref;
    }
    
    // Update workflow information
    if (options.eventName) {
      mockGitHub.context.eventName = options.eventName;
    }
    
    if (options.runId) {
      mockGitHub.context.runId = options.runId;
    }
    
    if (options.runNumber) {
      mockGitHub.context.runNumber = options.runNumber;
    }
    
    if (options.workflow) {
      mockGitHub.context.workflow = options.workflow;
      mockGitHub.context.payload.workflow = options.workflow;
    }
    
    if (options.action) {
      mockGitHub.context.action = options.action;
      mockGitHub.context.payload.action = options.action;
    }
    
    // Configure pull request if requested
    if (options.isPullRequest) {
      mockGitHub.context.eventName = 'pull_request';
      
      const prNumber = options.pullRequestNumber || 1;
      const prTitle = options.pullRequestTitle || 'Test PR';
      const prBody = options.pullRequestBody;
      const headRef = options.pullRequestHeadRef || 'feature-branch';
      const headSha = options.pullRequestHeadSha || '0123456789abcdef0123456789abcdef01234567';
      const baseRef = options.pullRequestBaseRef || 'main';
      const baseSha = options.pullRequestBaseSha || 'fedcba9876543210fedcba9876543210fedcba98';
      
      mockGitHub.context.payload.pull_request = {
        number: prNumber,
        title: prTitle,
        body: prBody,
        head: {
          ref: headRef,
          sha: headSha
        },
        base: {
          ref: baseRef,
          sha: baseSha
        }
      };
      
      // Also add to the pull requests list
      mockGitHub._pullRequests.push({
        owner: mockGitHub.context.repo.owner,
        repo: mockGitHub.context.repo.repo,
        number: prNumber,
        title: prTitle,
        body: prBody,
        headRef,
        headSha,
        baseRef,
        baseSha
      });
    } else {
      // Make sure we don't have a pull_request in the payload if not requested
      if (mockGitHub.context.eventName === 'pull_request') {
        mockGitHub.context.eventName = 'push';
      }
      delete mockGitHub.context.payload.pull_request;
    }
  }
};

/**
 * Setup function to configure the GitHub mock with default values
 */
export function setupGitHubMock(options: Parameters<typeof mockGitHub._setupContext>[0] = {}) {
  mockGitHub._reset();
  mockGitHub._setupContext(options);
  return mockGitHub;
}
