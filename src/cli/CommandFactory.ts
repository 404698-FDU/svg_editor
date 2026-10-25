import type { DocumentContext } from '../command/DocumentContext';
import type { CommandExecutor } from '../command/CommandExecutor';
import type { CommandResult } from '../command/CommandResult';
import type { FileSystemPort } from '../io/FileSystemPort';
import { InitCommand } from '../command/InitCommand';
import { ReadCommand } from '../command/ReadCommand';
import { SaveCommand } from '../command/SaveCommand';
import { CanvasCommand } from '../command/CanvasCommand';
import { CreateCommand } from '../command/CreateCommand';
import { DeleteCommand } from '../command/DeleteCommand';
import { MoveCommand } from '../command/MoveCommand';
import { ScaleCommand } from '../command/ScaleCommand';
import { SetCommand } from '../command/SetCommand';
import { GroupCommand } from '../command/GroupCommand';
import { UngroupCommand } from '../command/UngroupCommand';
import { AddToCommand } from '../command/AddToCommand';
import { FrontCommand } from '../command/FrontCommand';
import { BackCommand } from '../command/BackCommand';
import { TreeCommand } from '../command/TreeCommand';
import { ShowCommand } from '../command/ShowCommand';
import { HelpCommand } from '../command/HelpCommand';

/**
 * Client in the Command Pattern.
 * Assembles ConcreteCommand instances from parsed tokens and delegates execution to CommandExecutor.
 *
 * NOTE [Architecture Pending Refactoring]:
 * This is the second of the ONLY TWO allowed name-based dispatch points in Phase 1 (Section 2.1).
 * Can be refactored into a pluggable CommandProvider registry when external command plugins are introduced.
 */
export class CommandFactory {
  constructor(
    private readonly context: DocumentContext,
    private readonly executor: CommandExecutor,
    private readonly fileSystem: FileSystemPort
  ) {}

  public dispatchAndExecute(tokens: string[]): CommandResult {
    const cmdName = tokens[0];
    const args = tokens.slice(1);

    switch (cmdName) {
      case 'help': {
        return this.executor.executeDisplay(new HelpCommand());
      }
      case 'init': {
        if (args.length !== 0 && args.length !== 2) {
          throw new Error('error: usage: init [w] [h]');
        }
        const w = args.length === 2 ? CommandFactory.parseNumber(args[0], 'width') : 800;
        const h = args.length === 2 ? CommandFactory.parseNumber(args[1], 'height') : 600;
        return this.executor.executeDocumentIo(new InitCommand(this.context, w, h));
      }
      case 'read': {
        if (args.length !== 1) {
          throw new Error('error: usage: read <file.svg>');
        }
        return this.executor.executeDocumentIo(
          new ReadCommand(this.context, this.fileSystem, args[0])
        );
      }
      case 'save': {
        this.context.getDocumentOrThrow();
        if (args.length > 1) {
          throw new Error('error: usage: save [file.svg]');
        }
        return this.executor.executeDocumentIo(
          new SaveCommand(this.context, this.fileSystem, args[0])
        );
      }
      case 'canvas': {
        this.context.getDocumentOrThrow();
        if (args.length === 0) {
          return this.executor.executeDisplay(new CanvasCommand(this.context));
        }
        if (args.length === 2) {
          const w = CommandFactory.parseNumber(args[0], 'width');
          const h = CommandFactory.parseNumber(args[1], 'height');
          return this.executor.executeDocumentIo(new CanvasCommand(this.context, w, h));
        }
        throw new Error('error: usage: canvas [w] [h]');
      }
      case 'create': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length < 2) {
          throw new Error('error: usage: create <type> <id> [params...] [in <containerId>]');
        }
        const type = args[0];
        const id = args[1];
        let rest = args.slice(2);
        let containerId: string | undefined;
        if (rest.length >= 2 && rest[rest.length - 2] === 'in') {
          containerId = rest[rest.length - 1];
          rest = rest.slice(0, rest.length - 2);
        }
        return this.executor.executeUndoable(new CreateCommand(doc, type, id, rest, containerId));
      }
      case 'delete': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 1) {
          throw new Error('error: usage: delete <id>');
        }
        return this.executor.executeUndoable(new DeleteCommand(doc, args[0]));
      }
      case 'move': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 3) {
          throw new Error('error: usage: move <id> <dx> <dy>');
        }
        const dx = CommandFactory.parseNumber(args[1], 'dx');
        const dy = CommandFactory.parseNumber(args[2], 'dy');
        return this.executor.executeUndoable(new MoveCommand(doc, args[0], dx, dy));
      }
      case 'scale': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 2) {
          throw new Error('error: usage: scale <id> <factor>');
        }
        const factor = CommandFactory.parseNumber(args[1], 'factor');
        return this.executor.executeUndoable(new ScaleCommand(doc, args[0], factor));
      }
      case 'set': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 3) {
          throw new Error('error: usage: set <id> <attr> <value>');
        }
        return this.executor.executeUndoable(new SetCommand(doc, args[0], args[1], args[2]));
      }
      case 'group': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length < 2) {
          throw new Error('error: usage: group <newGid> <id1> <id2>...');
        }
        return this.executor.executeUndoable(new GroupCommand(doc, args[0], args.slice(1)));
      }
      case 'ungroup': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 1) {
          throw new Error('error: usage: ungroup <gid>');
        }
        return this.executor.executeUndoable(new UngroupCommand(doc, args[0]));
      }
      case 'addto': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 2) {
          throw new Error('error: usage: addto <gid> <id>');
        }
        return this.executor.executeUndoable(new AddToCommand(doc, args[0], args[1]));
      }
      case 'front': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 1) {
          throw new Error('error: usage: front <id>');
        }
        return this.executor.executeUndoable(new FrontCommand(doc, args[0]));
      }
      case 'back': {
        const doc = this.context.getDocumentOrThrow();
        if (args.length !== 1) {
          throw new Error('error: usage: back <id>');
        }
        return this.executor.executeUndoable(new BackCommand(doc, args[0]));
      }
      case 'tree': {
        this.context.getDocumentOrThrow();
        if (args.length > 1) {
          throw new Error('error: usage: tree [id]');
        }
        return this.executor.executeDisplay(new TreeCommand(this.context, args[0]));
      }
      case 'show': {
        this.context.getDocumentOrThrow();
        if (args.length !== 1) {
          throw new Error('error: usage: show <id>');
        }
        return this.executor.executeDisplay(new ShowCommand(this.context, args[0]));
      }
      case 'undo': {
        this.context.getDocumentOrThrow();
        if (args.length !== 0) {
          throw new Error('error: usage: undo');
        }
        return this.executor.undo();
      }
      case 'redo': {
        this.context.getDocumentOrThrow();
        if (args.length !== 0) {
          throw new Error('error: usage: redo');
        }
        return this.executor.redo();
      }
      default:
        throw new Error(`error: unknown command: ${cmdName}`);
    }
  }

  private static parseNumber(raw: string, name: string): number {
    const num = Number(raw);
    if (raw === undefined || raw.trim() === '' || Number.isNaN(num)) {
      throw new Error(`error: invalid numeric argument for ${name}: ${raw}`);
    }
    return num;
  }
}
