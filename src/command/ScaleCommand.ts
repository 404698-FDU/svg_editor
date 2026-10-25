import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, ScaledShapeRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'scale <id> <factor>'.
 * Delegates proportional scaling to SvgDocument and restores exact pre-scale geometry on undo.
 */
export class ScaleCommand implements UndoableCommand {
  private scaledRecord?: ScaledShapeRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly factor: number
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.scaleShape(this.id, this.factor);
    this.scaledRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.scaledRecord) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreScaledShape(this.scaledRecord);
    return CommandResult.single(message);
  }
}
