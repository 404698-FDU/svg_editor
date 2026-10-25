import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, GroupedShapesRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'group <newGid> <id1> <id2>...'.
 * Delegates grouping to SvgDocument and restores all children to their original parents and indices on undo.
 */
export class GroupCommand implements UndoableCommand {
  private groupedRecord?: GroupedShapesRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly newGid: string,
    private readonly memberIds: string[]
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.groupShapes(this.newGid, this.memberIds);
    this.groupedRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.groupedRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreGroupedShapes(this.groupedRecord);
    return CommandResult.single(message);
  }
}
