import { describe, it, expect } from 'vitest';
import { CliSession } from '../src/cli/CliSession';
import type { FileSystemPort } from '../src/io/FileSystemPort';

class InMemoryFileSystem implements FileSystemPort {
  public readonly files = new Map<string, string>();

  public readFile(filePath: string): string {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`error: cannot read file: ${filePath}`);
    }
    return content;
  }

  public writeFile(filePath: string, content: string): void {
    if (filePath === 'readonly.svg') {
      throw new Error(`error: cannot write file: ${filePath}`);
    }
    this.files.set(filePath, content);
  }
}

describe('CLI End-to-End Transcript & Error Specification Tests', () => {
  it('reproduces Section 6.0 typical session transcript line-for-line', () => {
    const fs = new InMemoryFileSystem();
    fs.files.set(
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

    const session = new CliSession(fs);
    const script = `
init 800 600
create rect bg 0 0 800 600 #ffffff
create text title 20 40 "My Diagram"
create circle c1 100 100 20 red
create rect box 200 80 60 60 #3366ff

group markers c1 box
tree

move c1 30 0
undo
redo

set title text "My Diagram v2"
undo

group bad c1 markers
delete box
undo

save demo.svg
undo

read other.svg
tree
`;

    const outputs = session.executeScript(script);
    expect(outputs).toEqual([
      'canvas 800x600 created',
      'rect#bg created',
      'text#title created',
      'circle#c1 created',
      'rect#box created',
      'g#markers created with 2 children',
      'svg (800x600)',
      '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
      '├── text#title     (20,40) "My Diagram"',
      '└── g#markers',
      '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
      '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
      'circle#c1 moved to (130,100)',
      'circle#c1 moved back to (100,100)',
      'circle#c1 moved to (130,100)',
      'text#title updated: text="My Diagram v2"',
      'text#title updated: text="My Diagram"',
      'error: cannot group a container into its own descendant: markers',
      'rect#box deleted',
      'rect#box restored into g#markers',
      'saved to demo.svg (5 elements)',
      'error: undo not allowed after io command',
      'warning: assigned id rect1 to unnamed <rect>',
      'read other.svg (7 elements)',
      'svg (400x300)',
      '├── rect#rect1     x=0 y=0 w=400 h=300 fill=#ffffff',
      '├── text#t1        (10,290) "imported"',
      '├── circle#c1      cx=50 cy=50 r=10',
      '├── g#g1',
      '│   ├── rect#r2    x=0 y=0 w=10 h=10',
      '│   └── circle#c2  cx=5 cy=5 r=2',
      '└── ellipse#e1     cx=1 cy=2 rx=3 ry=4'
    ]);
  });

  it('reproduces Section 6.1 two-node flowchart session transcript line-for-line', () => {
    const fs = new InMemoryFileSystem();
    const session = new CliSession(fs);
    const script = `
init 800 600

# 先建容器骨架，再往里放图形：每一步都显式表达归属
create g flowchart
create g node1 in flowchart
create rect start 120 100 160 60 #4a90d9 in node1
create text start-label 155 135 "开始" in node1

create g node2 in flowchart
create rect process 520 100 160 60 #f5a623 in node2
create text process-label 545 135 "处理数据" in node2

# 连接线挂在流程图容器下
create line arrow1 280 130 520 130 black in flowchart

tree

# 容器移动：整个节点 2 下移 100，文字随行（容器的价值所在）
move node2 0 100
undo

# 改节点内容：只动组内 text
set process-label text "处理数据 v2"

save flowchart.svg
`;

    const outputs = session.executeScript(script);
    expect(outputs).toEqual([
      'canvas 800x600 created',
      'g#flowchart created',
      'g#node1 created in g#flowchart',
      'rect#start created in g#node1',
      'text#start-label created in g#node1',
      'g#node2 created in g#flowchart',
      'rect#process created in g#node2',
      'text#process-label created in g#node2',
      'line#arrow1 created in g#flowchart',
      'svg (800x600)',
      '└── g#flowchart',
      '    ├── g#node1',
      '    │   ├── rect#start       x=120 y=100 w=160 h=60 fill=#4a90d9',
      '    │   └── text#start-label (155,135) "开始"',
      '    ├── g#node2',
      '    │   ├── rect#process     x=520 y=100 w=160 h=60 fill=#f5a623',
      '    │   └── text#process-label (545,135) "处理数据"',
      '    └── line#arrow1          (280,130) -> (520,130)',
      'g#node2 moved by (0,100)',
      'g#node2 moved back by (0,-100)',
      'text#process-label updated: text="处理数据 v2"',
      'saved to flowchart.svg (8 elements)'
    ]);
  });

  it('verifies all error messages in Section 4.2 without corrupting state', () => {
    const fs = new InMemoryFileSystem();
    const session = new CliSession(fs);

    // 1. Before init/read
    expect(session.executeLine('tree')).toEqual([
      "error: no document. use 'init' or 'read' first"
    ]);
    expect(session.executeLine('create rect r1 0 0 10 10')).toEqual([
      "error: no document. use 'init' or 'read' first"
    ]);

    session.executeLine('init 400 200');
    session.executeLine('create rect start 30 70 120 60 #4a90d9');
    session.executeLine('create g scene');
    session.executeLine('create circle c1 10 10 5 in scene');

    // 2. id already exists
    expect(session.executeLine('create rect start 0 0 10 10')).toEqual([
      'error: id already exists: start'
    ]);

    // 3. id does not exist
    expect(session.executeLine('move r9 10 10')).toEqual(['error: no such shape: r9']);

    // 4. 'in' target does not exist
    expect(session.executeLine('create rect r2 0 0 10 10 in node9')).toEqual([
      'error: no such container: node9'
    ]);

    // 5. 'in' target is not a container
    expect(session.executeLine('create rect r2 0 0 10 10 in start')).toEqual([
      'error: not a container: start'
    ]);

    // 6. unregistered shape type
    expect(session.executeLine('create hexagon h1 10 10')).toEqual([
      'error: unknown shape type: hexagon (is the plugin loaded?)'
    ]);
    expect(session.executeLine('create box n1 120 100 160 60 "开始"')).toEqual([
      'error: unknown shape type: box (is the plugin loaded?)'
    ]);

    // 7. group target contains container and its own descendant
    expect(session.executeLine('group g2 c1 scene')).toEqual([
      'error: cannot group a container into its own descendant: scene'
    ]);

    // 8. ungroup top-level container
    expect(session.executeLine('ungroup scene')).toEqual([
      'error: cannot ungroup top-level container: scene'
    ]);

    // 9. non-positive scale factor
    expect(session.executeLine('scale start 0')).toEqual([
      'error: scale factor must be positive'
    ]);
    expect(session.executeLine('scale start -2')).toEqual([
      'error: scale factor must be positive'
    ]);

    // 10. unknown attribute
    expect(session.executeLine('set start badAttr 123')).toEqual([
      'error: unknown attribute: badAttr'
    ]);

    // 11. file read/write errors
    expect(session.executeLine('read a.svg')).toEqual(['error: cannot read file: a.svg']);
    expect(session.executeLine('save readonly.svg')).toEqual([
      'error: cannot write file: readonly.svg'
    ]);
  });
});
