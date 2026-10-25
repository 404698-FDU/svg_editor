import type { Command } from './Command';
import type { CommandResult } from './CommandResult';

/**
 * Extension of Command for shape-editing operations that support undo/redo.
 */
export interface UndoableCommand extends Command {
  undo(): CommandResult;
}
