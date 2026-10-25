import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'scale <id> <factor>'.
 * Delegates proportional scaling to SvgDocument and restores exact pre-scale geometry on undo.
 */
export class ScaleCommand implements UndoableCommand {
  private snapshot?: number[];

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly factor: number
  ) {}

  public execute(): CommandResult {
    const { snapshot, message } = this.document.scaleShape(this.id, this.factor);
    this.snapshot = snapshot;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.snapshot) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreScaledShape(this.id, this.factor, this.snapshot);
    return CommandResult.single(message);
  }
}
