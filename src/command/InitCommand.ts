import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';
import { SvgDocument } from '../model/SvgDocument';

/**
 * ConcreteCommand for 'init [w] [h]'.
 * Initializes a new empty SvgDocument on the DocumentContext.
 */
export class InitCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly width: number = 800,
    private readonly height: number = 600
  ) {}

  public execute(): CommandResult {
    const doc = new SvgDocument(this.width, this.height);
    this.context.setDocument(doc);
    return CommandResult.single(`canvas ${this.width}x${this.height} created`);
  }
}
