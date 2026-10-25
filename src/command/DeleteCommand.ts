import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'delete <id>'.
 * Delegates to SvgDocument and retains the deleted subtree and original parent index for undo.
 */
export class DeleteCommand implements UndoableCommand {
  private deletedShape?: Shape;
  private parentContainer?: GroupShape;
  private index?: number;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { shape, parentContainer, index, message } = this.document.deleteShape(this.id);
    this.deletedShape = shape;
    this.parentContainer = parentContainer;
    this.index = index;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.deletedShape || !this.parentContainer || this.index === undefined) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreDeletedShape(
      this.deletedShape,
      this.parentContainer,
      this.index
    );
    return CommandResult.single(message);
  }
}
