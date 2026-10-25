import type { Command } from './Command';
import type { UndoableCommand } from './UndoableCommand';
import type { CommandResult } from './CommandResult';

/**
 * Invoker in the Command Pattern.
 * Manages execution of commands, the undo/redo CommandStack, and the post-IO lock state.
 */
export class CommandExecutor {
  private readonly undoStack: UndoableCommand[] = [];
  private readonly redoStack: UndoableCommand[] = [];
  private lockedAfterIo: boolean = false;

  public executeUndoable(command: UndoableCommand): CommandResult {
    const result = command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.lockedAfterIo = false;
    return result;
  }

  public executeDocumentIo(command: Command): CommandResult {
    const result = command.execute();
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.lockedAfterIo = true;
    return result;
  }

  public executeDisplay(command: Command): CommandResult {
    return command.execute();
  }

  public undo(): CommandResult {
    if (this.lockedAfterIo) {
      throw new Error('error: undo not allowed after io command');
    }
    const command = this.undoStack.pop();
    if (!command) {
      throw new Error('error: nothing to undo');
    }
    const result = command.undo();
    this.redoStack.push(command);
    return result;
  }

  public redo(): CommandResult {
    if (this.lockedAfterIo) {
      throw new Error('error: undo not allowed after io command');
    }
    const command = this.redoStack.pop();
    if (!command) {
      throw new Error('error: nothing to redo');
    }
    const result = command.execute();
    this.undoStack.push(command);
    return result;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public isLockedAfterIo(): boolean {
    return this.lockedAfterIo;
  }
}
