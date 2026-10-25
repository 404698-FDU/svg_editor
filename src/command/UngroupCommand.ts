import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, UngroupedShapeRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'ungroup <gid>'.
 * Delegates ungrouping to SvgDocument and restores the container and its children on undo.
 */
export class UngroupCommand implements UndoableCommand {
  private ungroupedRecord?: UngroupedShapeRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly gid: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.ungroupShape(this.gid);
    this.ungroupedRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.ungroupedRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreUngroupedShape(this.ungroupedRecord);
    return CommandResult.single(message);
  }
}
