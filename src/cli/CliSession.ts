import { DocumentContext } from '../command/DocumentContext';
import { CommandExecutor } from '../command/CommandExecutor';
import type { FileSystemPort } from '../io/FileSystemPort';
import { NodeFileSystemAdapter } from '../io/NodeFileSystemAdapter';
import { CommandTokenizer } from './CommandTokenizer';
import { CommandFactory } from './CommandFactory';

/**
 * Facade for an interactive or scripted CLI session.
 * Coordinates tokenization, command creation, execution, and unified 'error:' handling.
 */
export class CliSession {
  private readonly context: DocumentContext;
  private readonly executor: CommandExecutor;
  private readonly commandFactory: CommandFactory;

  constructor(fileSystem: FileSystemPort = new NodeFileSystemAdapter()) {
    this.context = new DocumentContext();
    this.executor = new CommandExecutor();
    this.commandFactory = new CommandFactory(this.context, this.executor, fileSystem);
  }

  public executeLine(rawLine: string): string[] {
    try {
      const tokens = CommandTokenizer.tokenize(rawLine);
      if (tokens.length === 0) {
        return [];
      }
      const result = this.commandFactory.dispatchAndExecute(tokens);
      return [...result.warnings, ...result.lines];
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const formatted = rawMessage.startsWith('error:') ? rawMessage : `error: ${rawMessage}`;
      return [formatted];
    }
  }

  public executeScript(scriptText: string): string[] {
    const lines = scriptText.split(/\r?\n/);
    const outputs: string[] = [];
    for (const line of lines) {
      outputs.push(...this.executeLine(line));
    }
    return outputs;
  }
}
