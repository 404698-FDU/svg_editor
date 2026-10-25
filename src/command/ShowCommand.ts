import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';
import { TreeFormatter } from '../io/TreeFormatter';

/**
 * ConcreteCommand for 'show <id>'.
 * Displays detailed parent, geometry, and style attributes for a single shape.
 */
export class ShowCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const doc = this.context.getDocumentOrThrow();
    const lines = TreeFormatter.formatShow(doc, this.id);
    return new CommandResult(lines);
  }
}
