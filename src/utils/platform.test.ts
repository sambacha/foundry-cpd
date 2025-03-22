import * as os from 'os';
import { normalizeVersionName, mapArch, getDownloadObject } from './platform';

// Mock os module
jest.mock('os', () => ({
  platform: jest.fn(),
  arch: jest.fn(),
  homedir: jest.fn(),
}));

describe('platform utilities', () => {
  describe('normalizeVersionName', () => {
    it('should normalize nightly version names', () => {
      expect(normalizeVersionName('nightly-1234567890abcdef1234567890abcdef12345678')).toBe('nightly');
    });

    it('should not modify non-nightly version names', () => {
      expect(normalizeVersionName('stable')).toBe('stable');
      expect(normalizeVersionName('v0.3.0')).toBe('v0.3.0');
      expect(normalizeVersionName('rc')).toBe('rc');
    });
  });

  describe('mapArch', () => {
    it('should map x32 to 386', () => {
      expect(mapArch('x32')).toBe('386');
    });

    it('should map x64 to amd64', () => {
      expect(mapArch('x64')).toBe('amd64');
    });

    it('should return the input for unmapped architectures', () => {
      expect(mapArch('arm64')).toBe('arm64');
      expect(mapArch('unknown')).toBe('unknown');
    });
  });

  describe('getDownloadObject', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    it('should generate the correct download object for Linux', () => {
      // Mock os.platform and os.arch
      (os.platform as jest.Mock).mockReturnValue('linux');
      (os.arch as jest.Mock).mockReturnValue('x64');

      const result = getDownloadObject('stable');

      expect(result).toEqual({
        url: 'https://github.com/foundry-rs/foundry/releases/download/stable/foundry_stable_linux_amd64.tar.gz',
        binPath: '.',
        version: 'stable',
        platform: 'linux',
        architecture: 'amd64',
      });
    });

    it('should generate the correct download object for Windows', () => {
      // Mock os.platform and os.arch
      (os.platform as jest.Mock).mockReturnValue('win32');
      (os.arch as jest.Mock).mockReturnValue('x64');

      const result = getDownloadObject('v0.3.0');

      expect(result).toEqual({
        url: 'https://github.com/foundry-rs/foundry/releases/download/v0.3.0/foundry_v0.3.0_win32_amd64.zip',
        binPath: '.',
        version: 'v0.3.0',
        platform: 'win32',
        architecture: 'amd64',
      });
    });

    it('should normalize nightly versions in the download URL', () => {
      // Mock os.platform and os.arch
      (os.platform as jest.Mock).mockReturnValue('darwin');
      (os.arch as jest.Mock).mockReturnValue('arm64');

      const result = getDownloadObject('nightly-1234567890abcdef1234567890abcdef12345678');

      expect(result).toEqual({
        url: 'https://github.com/foundry-rs/foundry/releases/download/nightly-1234567890abcdef1234567890abcdef12345678/foundry_nightly_darwin_arm64.tar.gz',
        binPath: '.',
        version: 'nightly-1234567890abcdef1234567890abcdef12345678',
        platform: 'darwin',
        architecture: 'arm64',
      });
    });
  });
});
