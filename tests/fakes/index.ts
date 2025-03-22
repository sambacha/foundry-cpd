/**
 * Entry point for fake implementations used in testing
 */

// Export all fakes
export * from './actions-core.fake';
export * from './actions-tool-cache.fake';
export * from './actions-cache.fake';
export * from './actions-github.fake';
export * from './fs.fake';

// Export a setup function to initialize all fakes with default settings
export function setupAllMocks() {
  const { setupCoreMock } = require('./actions-core.fake');
  const { setupToolCacheMock } = require('./actions-tool-cache.fake');
  const { setupCacheMock } = require('./actions-cache.fake');
  const { setupGitHubMock } = require('./actions-github.fake');
  const { setupFsMock } = require('./fs.fake');

  return {
    core: setupCoreMock(),
    toolCache: setupToolCacheMock(),
    cache: setupCacheMock(),
    github: setupGitHubMock(),
    fs: setupFsMock()
  };
}
