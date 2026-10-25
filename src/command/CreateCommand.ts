import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'create <type> <id> [params...] [in <containerId>]'.
 * Purely delegates to the SvgDocument receiver and stores minimal state for undo.
 */
export class CreateCommand implements UndoableCommand {
  private removedShape?: Shape;
  private removedParent?: GroupShape;
  private removedIndex?: number;

  constructor(
    private readonly document: SvgDocument,
    private readonly type: string,
    private readonly id: string,
    private readonly params: string[],
    private readonly containerId?: string
  ) {}

  public execute(): CommandResult {
    if (this.removedShape && this.removedParent !== undefined && this.removedIndex !== undefined) {
      this.document.restoreRemovedShape(
        this.removedShape,
        this.removedParent,
        this.removedIndex
      );
      const msg =
        this.containerId !== undefined
          ? `${this.removedShape.getTypeName()}#${this.id} created in g#${this.containerId}`
          : `${this.removedShape.getTypeName()}#${this.id} created`;
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
    const { shape, parentContainer, index, message } = this.document.deleteShape(this.id);
    this.removedShape = shape;
    this.removedParent = parentContainer;
    this.removedIndex = index;
    return CommandResult.single(message);
  }
}
