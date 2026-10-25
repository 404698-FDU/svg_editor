import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';
import type { FileSystemPort } from '../io/FileSystemPort';
import { SvgParser } from '../io/SvgParser';

/**
 * ConcreteCommand for 'read <file.svg>'.
 * Reads and parses an SVG file via FileSystemPort and sets it as the active SvgDocument.
 */
export class ReadCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly fileSystem: FileSystemPort,
    private readonly filePath: string
  ) {}

  public execute(): CommandResult {
    const xml = this.fileSystem.readFile(this.filePath);
    const { document, warnings } = SvgParser.parse(xml, this.filePath);
    this.context.setDocument(document);
    return CommandResult.single(
      `read ${this.filePath} (${document.getElementCount()} elements)`,
      warnings
    );
  }
}
