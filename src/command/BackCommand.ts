import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'back <id>'.
 * Sends the shape to the back (first sibling in SVG painter's order) and restores index on undo.
 */
export class BackCommand implements UndoableCommand {
  private shape?: Shape;
  private parent?: GroupShape;
  private oldIndex?: number;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string
  ) {}

  public execute(): CommandResult {
    const { shape, parent, oldIndex, message } = this.document.sendToBack(this.id);
    this.shape = shape;
    this.parent = parent;
    this.oldIndex = oldIndex;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.shape || !this.parent || this.oldIndex === undefined) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreZOrder(this.shape, this.parent, this.oldIndex);
    return CommandResult.single(message);
  }
}
