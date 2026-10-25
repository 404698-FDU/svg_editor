import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'move <id> <dx> <dy>'.
 * Delegates translation to the SvgDocument receiver and reverses by (-dx, -dy) on undo.
 */
export class MoveCommand implements UndoableCommand {
  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly dx: number,
    private readonly dy: number
  ) {}

  public execute(): CommandResult {
    const message = this.document.moveShape(this.id, this.dx, this.dy, false);
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    const message = this.document.moveShape(this.id, -this.dx, -this.dy, true);
    return CommandResult.single(message);
  }
}
