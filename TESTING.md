# Testing Strategy for Foundry Toolchain GitHub Action

This document outlines the testing strategy for the `@foundry-rs/foundry-toolchain` GitHub Action. It describes the different types of tests and how they're organized.

## Test Types

### Unit Tests

Unit tests focus on testing individual functions and modules in isolation. They verify that each component behaves as expected with controlled inputs.

**Location**: `tests/unit/`

**Example commands**:
```bash
# Run all unit tests
npm test -- tests/unit

# Run specific unit tests
npm test -- tests/unit/services/gas.test.ts
```

### Integration Tests

Integration tests verify that different modules work together correctly. They test the interactions between components and ensure they integrate properly.

**Location**: `tests/integration/`

**Example commands**:
```bash
# Run all integration tests
npm test -- tests/integration

# Run specific integration tests
npm test -- tests/integration/cache-workflow.test.ts
```

### Property Tests

Property tests use property-based testing techniques to verify that certain properties or invariants hold across a wide range of inputs. They're particularly useful for testing complex algorithms or functions that need to work with diverse inputs.

**Location**: `tests/property/`

**Example commands**:
```bash
# Run all property tests
npm test -- tests/property

# Run specific property tests
npm test -- tests/property/cache-properties.test.ts
```

### End-to-End Tests

End-to-end tests verify that the entire action works correctly from start to finish. They simulate a complete execution of the action with various configurations.

**Location**: `tests/e2e/`

**Example commands**:
```bash
# Run all e2e tests
npm test -- tests/e2e

# Run specific e2e tests
npm test -- tests/e2e/action-execution.test.ts
```

## Test Fakes

The tests use fake implementations of external dependencies to control the test environment and avoid making real network calls or filesystem operations.

**Location**: `tests/fakes/`

The following fakes are provided:

- `actions-core.fake.ts`: Fake implementation of `@actions/core`
- `actions-cache.fake.ts`: Fake implementation of `@actions/cache`
- `actions-tool-cache.fake.ts`: Fake implementation of `@actions/tool-cache`
- `actions-github.fake.ts`: Fake implementation of `@actions/github`
- `fs.fake.ts`: Fake implementation of Node.js `fs` module

To use these fakes in tests, import them directly or use the `setupAllMocks()` function from `tests/fakes/index.ts`:

```typescript
import { setupAllMocks } from '../fakes';

describe('My Test', () => {
  beforeEach(() => {
    const mocks = setupAllMocks();
    // Configure mocks as needed
    mocks.core._inputs = { /* ... */ };
    mocks.github._setupContext({ /* ... */ });
  });
  
  // Tests...
});
```

## Writing New Tests

When writing new tests, follow these guidelines:

1. **Choose the appropriate test type** based on what you're testing:
   - Unit tests for individual functions or small modules
   - Integration tests for interactions between modules
   - Property tests for functions that need to work with diverse inputs
   - E2E tests for full action execution

2. **Use fakes** to control the test environment and avoid external dependencies.

3. **Organize tests** in the appropriate directory based on the test type.

4. **Follow the existing test patterns** for consistency.

5. **Test both success and failure cases** to ensure robust error handling.

## Running Tests

To run all tests:

```bash
npm test
```

To run a specific test or group of tests:

```bash
npm test -- tests/unit/utils/platform.test.ts
```

## Coverage Reports

Test coverage reports are generated automatically when running tests. You can view them in the `coverage/` directory.

To generate a coverage report:

```bash
npm test -- --coverage
