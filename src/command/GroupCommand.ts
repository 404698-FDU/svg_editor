import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';
import type { GroupShape } from '../model/GroupShape';

/**
 * ConcreteCommand for 'group <newGid> <id1> <id2>...'.
 * Delegates grouping to SvgDocument and restores all children to their original parents and indices on undo.
 */
export class GroupCommand implements UndoableCommand {
  private newGroup?: GroupShape;
  private groupParent?: GroupShape;
  private memberPositions?: Array<{ shape: Shape; oldParent: GroupShape; oldIndex: number }>;

  constructor(
    private readonly document: SvgDocument,
    private readonly newGid: string,
    private readonly memberIds: string[]
  ) {}

  public execute(): CommandResult {
    const { newGroup, groupParent, memberPositions, message } = this.document.groupShapes(
      this.newGid,
      this.memberIds
    );
    this.newGroup = newGroup;
    this.groupParent = groupParent;
    this.memberPositions = memberPositions;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.newGroup || !this.groupParent || !this.memberPositions) {
      throw new Error('error: nothing to undo');
    }
    const message = this.document.restoreGroupedShapes(
      this.newGroup,
      this.groupParent,
      this.memberPositions
    );
    return CommandResult.single(message);
  }
}
