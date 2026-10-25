import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'set <id> <attr> <value>'.
 * Delegates attribute mutation to SvgDocument and stores the previous attribute value for undo.
 */
export class SetCommand implements UndoableCommand {
  private hasExecuted = false;
  private oldValue?: string;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string
  ) {}

  public execute(): CommandResult {
    const { oldValue, message } = this.document.setShapeAttribute(this.id, this.attr, this.value);
    this.oldValue = oldValue;
    this.hasExecuted = true;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.hasExecuted) {
      throw new Error('error: nothing to undo');
    }
    const { message } = this.document.setShapeAttribute(this.id, this.attr, this.oldValue);
    return CommandResult.single(message);
  }
}
