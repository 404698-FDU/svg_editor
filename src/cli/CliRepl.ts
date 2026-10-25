import * as readline from 'node:readline';
import { CliSession } from './CliSession';

/**
 * Interactive REPL loop reading 'svg> ' commands from standard input.
 */
export class CliRepl {
  private readonly session: CliSession;

  constructor(session: CliSession = new CliSession()) {
    this.session = session;
  }

  public start(): void {
    console.log("svg-editor 0.1 — type 'help' for commands");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'svg> '
    });

    rl.prompt();

    rl.on('line', (line: string) => {
      const trimmed = line.trim();
      if (trimmed === 'exit' || trimmed === 'quit') {
        rl.close();
        return;
      }
      const outputs = this.session.executeLine(line);
      for (const out of outputs) {
        console.log(out);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }
}
