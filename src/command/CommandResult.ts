/**
 * Value object representing the observable output of executing or undoing a Command.
 */
export class CommandResult {
  constructor(
    public readonly lines: string[],
    public readonly warnings: string[] = []
  ) {}

  public static single(line: string, warnings: string[] = []): CommandResult {
    return new CommandResult([line], warnings);
  }
}
