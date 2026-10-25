import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';
import { TreeFormatter } from '../io/TreeFormatter';

/**
 * ConcreteCommand for 'tree [id]'.
 * Formats the document structure (or a subtree rooted at id) with inline geometry summaries.
 */
export class TreeCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly rootId?: string
  ) {}

  public execute(): CommandResult {
    const doc = this.context.getDocumentOrThrow();
    const lines = TreeFormatter.formatTree(doc, this.rootId);
    return new CommandResult(lines);
  }
}
