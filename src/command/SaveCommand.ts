import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';
import type { FileSystemPort } from '../io/FileSystemPort';
import { SvgSerializer } from '../io/SvgSerializer';

/**
 * ConcreteCommand for 'save [file.svg]'.
 * Serializes the active SvgDocument and writes it via FileSystemPort.
 */
export class SaveCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly fileSystem: FileSystemPort,
    private readonly filePath?: string
  ) {}

  public execute(): CommandResult {
    const doc = this.context.getDocumentOrThrow();
    const targetPath = this.filePath ?? doc.getFilePath();
    if (!targetPath) {
      throw new Error('error: cannot write file: undefined');
    }
    const xml = SvgSerializer.serialize(doc);
    this.fileSystem.writeFile(targetPath, xml);
    doc.setFilePath(targetPath);
    return CommandResult.single(`saved to ${targetPath} (${doc.getElementCount()} elements)`);
  }
}
