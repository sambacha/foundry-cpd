# Changelog

All notable changes to the `foundry-toolchain` action will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-03-21

### Added

- Complete TypeScript rewrite for improved type safety and maintainability
- Enhanced caching system with support for multiple cache types:
  - RPC responses (existing)
  - Compiled artifacts (new)
  - Gas snapshots (new)
- Gas snapshot tracking functionality:
  - Automatic capture of gas usage from Forge tests
  - Historical tracking of gas usage over time
  - Comparison between snapshots with detailed reports
  - Automatic PR comments with gas usage changes
- New action inputs:
  - `gas-snapshot`: Enable gas snapshot tracking
  - `gas-snapshot-test-pattern`: Filter tests for gas snapshots
  - `gas-snapshot-pr-comment`: Toggle PR comments for gas reports
  - `github-token`: GitHub token for API operations

### Changed

- Improved error handling and logging
- Enhanced cache key generation strategy
- Updated dependencies to latest versions
- Improved documentation with examples for new features

### Fixed

- Issue with slow post-action step by implementing early exit
- Improved handling of cache paths that don't exist

## [1.3.0] - Previous release

(Previous release notes would go here)
