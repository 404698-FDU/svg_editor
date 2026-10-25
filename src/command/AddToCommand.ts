import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, AddToContainerRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'addto <gid> <id>'.
 * Delegates moving an existing shape into a container and restores its original parent and index on undo.
 */
export class AddToCommand implements UndoableCommand {
  private addToRecord?: AddToContainerRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly gid: string,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.addShapeToContainer(this.gid, this.id);
    this.addToRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.addToRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreAddedShapeToContainer(this.addToRecord);
    return CommandResult.single(message);
  }
}
