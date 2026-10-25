import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, DeletedShapeRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'delete <id>'.
 * Delegates to SvgDocument and retains the deleted subtree and original parent index for undo.
 */
export class DeleteCommand implements UndoableCommand {
  private deletedRecord?: DeletedShapeRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.deleteShape(this.id);
    this.deletedRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.deletedRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreDeletedShape(this.deletedRecord);
    return CommandResult.single(message);
  }
}
