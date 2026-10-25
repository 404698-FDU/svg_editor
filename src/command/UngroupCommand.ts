import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'ungroup <gid>'.
 * Delegates ungrouping to SvgDocument and restores the container and its children on undo.
 */
export class UngroupCommand implements UndoableCommand {
  private groupShape?: GroupShape;
  private parent?: GroupShape;
  private groupIndex?: number;
  private children?: Shape[];

  constructor(
    private readonly document: SvgDocument,
    private readonly gid: string
  ) {}

  public execute(): CommandResult {
    const { groupShape, parent, groupIndex, children, message } = this.document.ungroupShape(
      this.gid
    );
    this.groupShape = groupShape;
    this.parent = parent;
    this.groupIndex = groupIndex;
    this.children = children;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.groupShape || !this.parent || this.groupIndex === undefined || !this.children) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreUngroupedShape(
      this.groupShape,
      this.parent,
      this.groupIndex,
      this.children
    );
    return CommandResult.single(message);
  }
}
