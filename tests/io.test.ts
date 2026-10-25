import { describe, it, expect } from 'vitest';
import type { FileSystemPort } from '../src/io/FileSystemPort';
import { DocumentContext } from '../src/command/DocumentContext';
import { CommandExecutor } from '../src/command/CommandExecutor';
import { InitCommand } from '../src/command/InitCommand';
import { ReadCommand } from '../src/command/ReadCommand';
import { SaveCommand } from '../src/command/SaveCommand';
import { TreeCommand } from '../src/command/TreeCommand';
import { ShowCommand } from '../src/command/ShowCommand';
import { CreateCommand } from '../src/command/CreateCommand';
import { GroupCommand } from '../src/command/GroupCommand';

class MockFileSystem implements FileSystemPort {
  public readonly files = new Map<string, string>();

  public readFile(filePath: string): string {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`error: cannot read file: ${filePath}`);
    }
    return content;
  }

  public writeFile(filePath: string, content: string): void {
    if (filePath.startsWith('/readonly/')) {
      throw new Error(`error: cannot write file: ${filePath}`);
    }
    this.files.set(filePath, content);
  }
}

describe('IO & Formatting Layer: TreeFormatter, SvgParser, SvgSerializer & Mock FileSystem', () => {
  it('formats tree and show outputs matching specification sections 5.1 and 5.2', () => {
    const ctx = new DocumentContext();
    const executor = new CommandExecutor();
    executor.executeDocumentIo(new InitCommand(ctx, 800, 600));
    const doc = ctx.getDocumentOrThrow();

    executor.executeUndoable(
      new CreateCommand(doc, 'rect', 'bg', ['0', '0', '800', '600', '#ffffff'])
    );
    executor.executeUndoable(new CreateCommand(doc, 'text', 'title', ['20', '40', 'My Diagram']));
    executor.executeUndoable(new CreateCommand(doc, 'circle', 'c1', ['100', '100', '20', 'red']));
    executor.executeUndoable(
      new CreateCommand(doc, 'rect', 'box', ['200', '80', '60', '60', '#3366ff'])
    );
    executor.executeUndoable(new GroupCommand(doc, 'markers', ['c1', 'box']));

    const treeRes = executor.executeDisplay(new TreeCommand(ctx));
    expect(treeRes.lines.join('\n')).toBe(
      [
        'svg (800x600)',
        '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
        '├── text#title     (20,40) "My Diagram"',
        '└── g#markers',
        '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
        '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff'
      ].join('\n')
    );

    const showRes = executor.executeDisplay(new ShowCommand(ctx, 'c1'));
    expect(showRes.lines.join('\n')).toBe(
      ['circle#c1  parent=g#markers', '  cx=100 cy=100 r=20', '  fill=red'].join('\n')
    );
  });

  it('reads external SVG with missing id auto-assignment warning and serializes back via MockFileSystem', () => {
    const mockFs = new MockFileSystem();
    mockFs.files.set(
      'other.svg',
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>`
    );

    const ctx = new DocumentContext();
    const executor = new CommandExecutor();
    const readRes = executor.executeDocumentIo(new ReadCommand(ctx, mockFs, 'other.svg'));

    expect(readRes.warnings).toEqual(['warning: assigned id rect1 to unnamed <rect>']);
    expect(readRes.lines).toEqual(['read other.svg (7 elements)']);

    const treeRes = executor.executeDisplay(new TreeCommand(ctx));
    expect(treeRes.lines.join('\n')).toBe(
      [
        'svg (400x300)',
        '├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff',
        '├── text#t1        (10,290) "imported"',
        '├── circle#c1      cx=50 cy=50 r=10',
        '├── g#g1',
        '│   ├── rect#r2    x=0 y=0 w=10 h=10',
        '│   └── circle#c2  cx=5 cy=5 r=2',
        '└── ellipse#e1     cx=1 cy=2 rx=3 ry=4'
      ].join('\n')
    );

    // Save without path saves back to other.svg
    const saveRes = executor.executeDocumentIo(new SaveCommand(ctx, mockFs));
    expect(saveRes.lines).toEqual(['saved to other.svg (7 elements)']);
    expect(mockFs.files.get('other.svg')).toContain('<rect id="rect1"');

    // Error handling on non-existent or unwritable files
    expect(() => executor.executeDocumentIo(new ReadCommand(ctx, mockFs, 'missing.svg'))).toThrow(
      'error: cannot read file: missing.svg'
    );
    expect(() =>
      executor.executeDocumentIo(new SaveCommand(ctx, mockFs, '/readonly/out.svg'))
    ).toThrow('error: cannot write file: /readonly/out.svg');
  });
});
