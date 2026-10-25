import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, ZOrderRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'back <id>'.
 * Sends the shape to the back (first sibling in SVG painter's order) and restores index on undo.
 */
export class BackCommand implements UndoableCommand {
  private zRecord?: ZOrderRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.sendToBack(this.id);
    this.zRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.zRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreZOrder(this.zRecord);
    return CommandResult.single(message);
  }
}
