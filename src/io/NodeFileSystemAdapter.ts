import * as fs from 'node:fs';
import type { FileSystemPort } from './FileSystemPort';

/**
 * Concrete Adapter wrapping Node.js built-in 'fs' module to conform to FileSystemPort.
 */
export class NodeFileSystemAdapter implements FileSystemPort {
  public readFile(filePath: string): string {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      throw new Error(`error: cannot read file: ${filePath}`);
    }
  }

  public writeFile(filePath: string, content: string): void {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
    } catch {
      throw new Error(`error: cannot write file: ${filePath}`);
    }
  }
}
