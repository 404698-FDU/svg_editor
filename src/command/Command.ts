import type { CommandResult } from './CommandResult';

/**
 * Command Role in the Command Pattern.
 * Declares the unified execution slot for all commands.
 */
export interface Command {
  execute(): CommandResult;
}
