import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, DeletedShapeRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'create <type> <id> [params...] [in <containerId>]'.
 * Purely delegates to the SvgDocument receiver and stores minimal state for undo.
 */
export class CreateCommand implements UndoableCommand {
  private removedRecord?: DeletedShapeRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly type: string,
    private readonly id: string,
    private readonly params: string[],
    private readonly containerId?: string
  ) {}

  public execute(): CommandResult {
    if (this.removedRecord) {
      this.document.restoreRemovedShape(
        this.removedRecord.shape,
        this.removedRecord.parentContainer,
        this.removedRecord.index
      );
      const msg =
        this.containerId !== undefined
          ? `${this.removedRecord.shape.getTypeName()}#${this.id} created in g#${this.containerId}`
          : `${this.removedRecord.shape.getTypeName()}#${this.id} created`;
      return CommandResult.single(msg);
    }
    const { message } = this.document.createAndAddShape(
      this.type,
      this.id,
      this.params,
      this.containerId
    );
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    const { record, message } = this.document.deleteShape(this.id);
    this.removedRecord = record;
    return CommandResult.single(message);
  }
}
