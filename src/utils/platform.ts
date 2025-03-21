import * as os from 'os';
import { DownloadOptions } from '../types';

/**
 * Normalizes the version name by replacing nightly versions with a consistent format
 * @param version The version string to normalize
 * @returns The normalized version string
 */
export function normalizeVersionName(version: string): string {
  return version.replace(/^nightly-[0-9a-f]{40}$/, 'nightly');
}

/**
 * Maps architecture names to their corresponding values used in download URLs
 * @param arch The architecture name to map
 * @returns The mapped architecture name
 */
export function mapArch(arch: string): string {
  const mappings: Record<string, string> = {
    x32: '386',
    x64: 'amd64',
  };

  return mappings[arch] || arch;
}

/**
 * Creates a download object with the URL and binary path for the specified version
 * @param version The version of Foundry to download
 * @returns An object containing the download URL and binary path
 */
export function getDownloadObject(version: string): DownloadOptions {
  const platform = os.platform();
  const arch = os.arch();
  const mappedArch = mapArch(arch);
  const normalizedVersion = normalizeVersionName(version);
  
  const filename = `foundry_${normalizedVersion}_${platform}_${mappedArch}`;
  const extension = platform === 'win32' ? 'zip' : 'tar.gz';
  const url = `https://github.com/foundry-rs/foundry/releases/download/${version}/${filename}.${extension}`;

  return {
    url,
    binPath: '.',
    version,
    platform,
    architecture: mappedArch
  };
}
