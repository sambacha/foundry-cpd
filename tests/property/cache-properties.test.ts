import * as fc from 'fast-check';
import { getPrimaryKey, getRestoreKeys, CacheType } from '../../src/services/cache';
import { setupGitHubMock } from '../fakes/actions-github.fake';

// Mock GitHub context
jest.mock('@actions/github', () => {
  const { mockGitHub } = require('../fakes/actions-github.fake');
  return mockGitHub;
});

describe('Cache Properties', () => {
  beforeEach(() => {
    setupGitHubMock({
      sha: '0123456789abcdef0123456789abcdef01234567'
    });
  });

  describe('getPrimaryKey', () => {
    it('should be deterministic - same inputs always produce same key', () => {
      fc.assert(
        fc.property(
          fc.string(), 
          fc.constantFrom(...Object.values(CacheType)), 
          (input, type) => {
            const key1 = getPrimaryKey(input, type);
            const key2 = getPrimaryKey(input, type);
            return key1 === key2;
          }
        )
      );
    });

    it('should include the cache type prefix in the key', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string(), { nil: undefined }), 
          fc.constantFrom(...Object.values(CacheType)), 
          (input, type) => {
            const key = getPrimaryKey(input, type);
            
            // Key should contain the appropriate prefix based on type
            switch (type) {
              case CacheType.RPC:
                return key.includes('foundry-chain-fork-');
              case CacheType.ARTIFACTS:
                return key.includes('foundry-artifacts-');
              case CacheType.GAS_SNAPSHOT:
                return key.includes('foundry-gas-snapshot-');
              default:
                return false;
            }
          }
        )
      );
    });

    it('should include custom key input when provided', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length > 0), 
          fc.constantFrom(...Object.values(CacheType)), 
          (input, type) => {
            const key = getPrimaryKey(input, type);
            return key.includes(input.trim());
          }
        )
      );
    });

    it('should include commit SHA when no custom key provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CacheType)), 
          (type) => {
            const key = getPrimaryKey(undefined, type);
            return key.includes('0123456789abcdef0123456789abcdef01234567');
          }
        )
      );
    });
  });

  describe('getRestoreKeys', () => {
    it('should include default key in result even when custom keys provided', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string()),
          fc.constantFrom(...Object.values(CacheType)),
          (inputs, type) => {
            const customInput = inputs.join('\n');
            const restoreKeys = getRestoreKeys(customInput, type);
            
            // Determine expected prefix based on type
            let prefix = '';
            switch (type) {
              case CacheType.RPC:
                prefix = 'win32-foundry-chain-fork-';
                break;
              case CacheType.ARTIFACTS:
                prefix = 'win32-foundry-artifacts-';
                break;
              case CacheType.GAS_SNAPSHOT:
                prefix = 'win32-foundry-gas-snapshot-';
                break;
            }
            
            // The array should include the default prefix key
            return restoreKeys.some(key => key === prefix);
          }
        )
      );
    });

    it('should return at least one key even with empty input', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(CacheType)),
          (type) => {
            const restoreKeys = getRestoreKeys('', type);
            return restoreKeys.length >= 1;
          }
        )
      );
    });

    it('should filter out empty lines from input', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string().filter(s => s.trim().length > 0), { minLength: 1, maxLength: 10 }),
          fc.constantFrom(...Object.values(CacheType)),
          (nonEmptyInputs, type) => {
            // Insert some empty lines
            const inputsWithEmptyLines: string[] = [];
            for (const input of nonEmptyInputs) {
              inputsWithEmptyLines.push(input);
              inputsWithEmptyLines.push('   '); // Empty line with whitespace
              inputsWithEmptyLines.push(''); // Empty line
            }
            
            const customInput = inputsWithEmptyLines.join('\n');
            const restoreKeys = getRestoreKeys(customInput, type);
            
            // We should have at least nonEmptyInputs.length + 1 keys
            // (the +1 is for the default key)
            return restoreKeys.length === nonEmptyInputs.length + 1;
          }
        )
      );
    });

    it('should trim whitespace from input lines', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.trim().length > 0),
          fc.constantFrom(...Object.values(CacheType)),
          (input, type) => {
            const paddedInput = `   ${input}   `; // Add whitespace
            const customInput = paddedInput;
            const restoreKeys = getRestoreKeys(customInput, type);
            
            // The key should contain the trimmed input, not the padded one
            const keyWithPadding = restoreKeys.find(key => key.includes(paddedInput));
            const keyWithTrimmed = restoreKeys.find(key => 
              key.includes(input) && !key.includes(paddedInput)
            );
            
            return keyWithPadding === undefined && keyWithTrimmed !== undefined;
          }
        )
      );
    });
  });
});
