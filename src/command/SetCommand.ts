import type { UndoableCommand } from './UndoableCommand';
import { CommandResult } from './CommandResult';
import type { SvgDocument, SetAttributeRecord } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'set <id> <attr> <value>'.
 * Delegates attribute mutation to SvgDocument and stores the previous attribute value for undo.
 */
export class SetCommand implements UndoableCommand {
  private attrRecord?: SetAttributeRecord;

  constructor(
    private readonly document: SvgDocument,
    private readonly id: string,
    private readonly attr: string,
    private readonly value: string
  ) {}

  public execute(): CommandResult {
    const { record, message } = this.document.setShapeAttribute(this.id, this.attr, this.value);
    this.attrRecord = record;
    return CommandResult.single(message);
  }

  public undo(): CommandResult {
    if (!this.attrRecord) {
      throw new Error('error: nothing to undo');
    }
    const { message } = this.document.setShapeAttribute(
      this.id,
      this.attrRecord.attr,
      this.attrRecord.oldValue
    );
    return CommandResult.single(message);
  }
}
