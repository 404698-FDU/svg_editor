import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, ZOrderRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'front <id>'.
 * Brings the shape to the front (last sibling in SVG painter's order) and restores index on undo.
 */
export class FrontCommand implements UndoableCommand {
  private zRecord?: ZOrderRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.bringToFront(this.id);
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
