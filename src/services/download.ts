import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import * as path from 'path';

import { DownloadResult } from '../types';
import { getDownloadObject } from '../utils/platform';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';

/**
 * Downloads and extracts the Foundry binaries for the specified version
 * @param version The version of Foundry to download
 * @returns A promise that resolves to the path to the downloaded binaries
 */
export async function downloadFoundry(version: string): Promise<DownloadResult> {
  try {
    // Get download information
    const download = getDownloadObject(version);
    core.info(`Downloading Foundry '${version}' from: ${download.url}`);
    
    // Download the archive containing the binaries
    const pathToArchive = await toolCache.downloadTool(download.url);
    core.info(SUCCESS_MESSAGES.DOWNLOAD_SUCCESS);
    
    // Extract the archive onto host runner
    core.debug(`Extracting ${pathToArchive}`);
    const extract = download.url.endsWith('.zip') ? toolCache.extractZip : toolCache.extractTar;
    const pathToCLI = await extract(pathToArchive);
    core.info(SUCCESS_MESSAGES.EXTRACT_SUCCESS);
    
    // Return the path to the binaries
    return {
      binPath: path.join(pathToCLI, download.binPath || '.')
    };
  } catch (error) {
    core.error(`${ERROR_MESSAGES.DOWNLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`${ERROR_MESSAGES.DOWNLOAD_FAILED}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Adds the Foundry binaries to the PATH
 * @param binPath The path to the Foundry binaries
 */
export function addFoundryToPath(binPath: string): void {
  core.addPath(binPath);
  core.info(`Added Foundry to PATH: ${binPath}`);
}
