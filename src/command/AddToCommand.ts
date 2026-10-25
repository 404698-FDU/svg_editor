import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'addto <gid> <id>'.
 * Delegates moving an existing shape into a container and restores its original parent and index on undo.
 */
export class AddToCommand implements UndoableCommand {
  private shape?: Shape;
  private oldParent?: GroupShape;
  private oldIndex?: number;

  constructor(
    private readonly document: SvgDocument,
    private readonly gid: string,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { shape, oldParent, oldIndex, message } = this.document.addShapeToContainer(
      this.gid,
      this.id
    );
    this.shape = shape;
    this.oldParent = oldParent;
    this.oldIndex = oldIndex;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.shape || !this.oldParent || this.oldIndex === undefined) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreAddedShapeToContainer(
      this.shape,
      this.oldParent,
      this.oldIndex
    );
    return CommandResult.single(message);
  }
}
