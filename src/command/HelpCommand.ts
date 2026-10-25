import type { Command } from './Command';
import { CommandResult } from './CommandResult';

/**
 * ConcreteCommand for 'help'.
 * Outputs the command syntax summary.
 */
export class HelpCommand implements Command {
  public execute(): CommandResult {
    return new CommandResult([
      'Available commands:',
      '  init [w] [h]                                   Initialize empty canvas (default 800x600)',
      '  read <file.svg>                                Read SVG file into current document',
      '  save [file.svg]                                Save current document to SVG file',
      '  canvas [w] [h]                                 Show or update canvas dimensions',
      '  create <type> <id> [params...] [in <gid>]      Create shape (rect|circle|ellipse|line|text|g)',
      '  delete <id>                                    Delete shape or group subtree',
      '  move <id> <dx> <dy>                            Translate shape or group by (dx, dy)',
      '  scale <id> <factor>                            Proportionally scale shape or group',
      '  set <id> <attr> <value>                        Set shape attribute',
      '  group <newGid> <id1> <id2>...                  Group existing shapes into new container',
      '  ungroup <gid>                                  Dissolve nested group into parent',
      '  addto <gid> <id>                               Move existing shape into container',
      '  front <id> / back <id>                         Adjust z-order within sibling level',
      '  tree [id]                                      Display document or subtree structure',
      '  show <id>                                      Display shape attribute details',
      '  undo / redo                                    Undo or redo last editing command',
      '  help                                           Show this help message'
    ]);
  }
}
