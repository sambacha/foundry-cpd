import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

/**
 * Ensures that a directory exists, creating it if necessary
 * @param dirPath The path to the directory to ensure exists
 * @returns True if the directory exists or was created, false otherwise
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (fs.existsSync(dirPath)) {
      return true;
    }

    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (error) {
    core.warning(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Reads a JSON file and parses its contents
 * @param filePath The path to the JSON file to read
 * @returns The parsed JSON object or undefined if the file does not exist or is invalid
 */
export function readJsonFile<T>(filePath: string): T | undefined {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent) as T;
  } catch (error) {
    core.warning(`Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Writes a JSON object to a file
 * @param filePath The path to the file to write
 * @param data The data to write to the file
 * @returns True if the file was written successfully, false otherwise
 */
export function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    core.warning(`Failed to write JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Reads a text file and returns its contents
 * @param filePath The path to the text file to read
 * @returns The contents of the file or undefined if the file does not exist or cannot be read
 */
export function readTextFile(filePath: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    core.warning(`Failed to read text file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Writes text to a file
 * @param filePath The path to the file to write
 * @param content The text content to write to the file
 * @returns True if the file was written successfully, false otherwise
 */
export function writeTextFile(filePath: string, content: string): boolean {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    core.warning(`Failed to write text file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Checks if a file exists
 * @param filePath The path to the file to check
 * @returns True if the file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
