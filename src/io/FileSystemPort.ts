/**
 * Target interface in the Adapter Pattern (and Dependency Injection port for TDD).
 * Abstracts file system operations so commands can be tested in-memory without disk side effects.
 */
export interface FileSystemPort {
  readFile(filePath: string): string;
  writeFile(filePath: string, content: string): void;
}
