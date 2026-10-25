import type { Command } from './Command';
import { CommandResult } from './CommandResult';
import type { DocumentContext } from './DocumentContext';

/**
 * ConcreteCommand for 'canvas [w] [h]'.
 * Displays canvas size when called without arguments, or updates canvas dimensions.
 */
export class CanvasCommand implements Command {
  constructor(
    private readonly context: DocumentContext,
    private readonly width?: number,
    private readonly height?: number
  ) {}

  public isModifying(): boolean {
    return this.width !== undefined && this.height !== undefined;
  }

  public execute(): CommandResult {
    const doc = this.context.getDocumentOrThrow();
    if (this.width !== undefined && this.height !== undefined) {
      doc.setDimensions(this.width, this.height);
      return CommandResult.single(`canvas ${this.width}x${this.height}`);
    }
    return CommandResult.single(`svg (${doc.getWidth()}x${doc.getHeight()})`);
  }
}
