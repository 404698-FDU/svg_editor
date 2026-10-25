import { describe, it, expect } from 'vitest';
import { SvgDocument } from '../src/model/SvgDocument';
import { GroupShape } from '../src/model/GroupShape';
import { CommandExecutor } from '../src/command/CommandExecutor';
import { CreateCommand } from '../src/command/CreateCommand';
import { DeleteCommand } from '../src/command/DeleteCommand';
import { MoveCommand } from '../src/command/MoveCommand';
import { ScaleCommand } from '../src/command/ScaleCommand';
import { SetCommand } from '../src/command/SetCommand';
import { GroupCommand } from '../src/command/GroupCommand';
import { UngroupCommand } from '../src/command/UngroupCommand';
import { AddToCommand } from '../src/command/AddToCommand';
import { FrontCommand } from '../src/command/FrontCommand';
import { BackCommand } from '../src/command/BackCommand';
import { CommandResult } from '../src/command/CommandResult';

describe('Command Layer: Editing, Hierarchy, Z-Order & Undo/Redo Stack', () => {
  it('executes, undoes, and redoes CreateCommand, MoveCommand, SetCommand, ScaleCommand, DeleteCommand', () => {
    const doc = new SvgDocument(800, 600);
    const executor = new CommandExecutor();

    expect(executor.executeUndoable(new CreateCommand(doc, 'g', 'markers', [])).lines[0]).toBe(
      'g#markers created'
    );
    expect(
      executor.executeUndoable(
        new CreateCommand(doc, 'circle', 'c1', ['100', '100', '20', 'red'], 'markers')
      ).lines[0]
    ).toBe('circle#c1 created in g#markers');

    expect(executor.executeUndoable(new MoveCommand(doc, 'c1', 30, 0)).lines[0]).toBe(
      'circle#c1 moved to (130,100)'
    );
    expect(executor.undo().lines[0]).toBe('circle#c1 moved back to (100,100)');
    expect(executor.redo().lines[0]).toBe('circle#c1 moved to (130,100)');

    expect(executor.executeUndoable(new MoveCommand(doc, 'markers', 0, 50)).lines[0]).toBe(
      'g#markers moved by (0,50)'
    );
    expect(doc.getShapeOrThrow('c1').getAttribute('cy')).toBe('150');
    expect(executor.undo().lines[0]).toBe('g#markers moved back by (0,-50)');
    expect(doc.getShapeOrThrow('c1').getAttribute('cy')).toBe('100');

    expect(executor.executeUndoable(new ScaleCommand(doc, 'c1', 1.5)).lines[0]).toBe(
      'circle#c1 scaled by 1.5'
    );
    expect(doc.getShapeOrThrow('c1').getAttribute('r')).toBe('30');
    expect(executor.undo().lines[0]).toBe('circle#c1 scaled back by 1.5');
    expect(doc.getShapeOrThrow('c1').getAttribute('r')).toBe('20');

    executor.executeUndoable(new CreateCommand(doc, 'text', 'title', ['20', '40', 'My Diagram']));
    expect(
      executor.executeUndoable(new SetCommand(doc, 'title', 'text', 'My Diagram v2')).lines[0]
    ).toBe('text#title updated: text="My Diagram v2"');
    expect(executor.undo().lines[0]).toBe('text#title updated: text="My Diagram"');

    expect(executor.executeUndoable(new DeleteCommand(doc, 'c1')).lines[0]).toBe(
      'circle#c1 deleted'
    );
    expect(doc.hasId('c1')).toBe(false);
    expect(executor.undo().lines[0]).toBe('circle#c1 restored into g#markers');
    expect(doc.hasId('c1')).toBe(true);
  });

  it('clears redo stack upon new edit and blocks undo/redo after IO command', () => {
    const doc = new SvgDocument(800, 600);
    const executor = new CommandExecutor();

    executor.executeUndoable(new CreateCommand(doc, 'rect', 'r1', ['0', '0', '10', '10']));
    executor.executeUndoable(new MoveCommand(doc, 'r1', 10, 20));
    executor.undo();
    expect(executor.getRedoCount()).toBe(1);

    executor.executeUndoable(new SetCommand(doc, 'r1', 'fill', 'blue'));
    expect(executor.getRedoCount()).toBe(0);
    expect(() => executor.redo()).toThrow('error: nothing to redo');

    executor.executeDocumentIo({
      execute: () => CommandResult.single('saved to demo.svg (1 elements)')
    });
    expect(() => executor.undo()).toThrow('error: undo not allowed after io command');
    expect(() => executor.redo()).toThrow('error: undo not allowed after io command');

    executor.executeUndoable(new MoveCommand(doc, 'r1', 5, 5));
    expect(executor.undo().lines[0]).toBe('rect#r1 moved back to (0,0)');
  });

  it('supports GroupCommand, UngroupCommand, AddToCommand, FrontCommand, and BackCommand with exact undo/redo', () => {
    const doc = new SvgDocument(800, 600);
    const executor = new CommandExecutor();

    executor.executeUndoable(new CreateCommand(doc, 'rect', 'bg', ['0', '0', '800', '600']));
    executor.executeUndoable(new CreateCommand(doc, 'circle', 'c1', ['100', '100', '20']));
    executor.executeUndoable(new CreateCommand(doc, 'rect', 'box', ['200', '80', '60', '60']));

    // Group c1 and box into markers
    expect(
      executor.executeUndoable(new GroupCommand(doc, 'markers', ['c1', 'box'])).lines[0]
    ).toBe('g#markers created with 2 children');
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['bg', 'markers']);

    // Cannot ungroup top-level container
    expect(() => executor.executeUndoable(new UngroupCommand(doc, 'markers'))).toThrow(
      'error: cannot ungroup top-level container: markers'
    );

    // Undo GroupCommand restores c1 and box to root in original order
    executor.undo();
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['bg', 'c1', 'box']);
    executor.redo();
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['bg', 'markers']);

    // Group c1 and box inside markers into nested group subG, then ungroup subG
    executor.executeUndoable(new GroupCommand(doc, 'subG', ['c1', 'box']));
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual(['subG']);

    expect(executor.executeUndoable(new UngroupCommand(doc, 'subG')).lines[0]).toBe(
      'g#subG ungrouped'
    );
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual([
      'c1',
      'box'
    ]);
    executor.undo();
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual(['subG']);
    executor.undo(); // undo GroupCommand subG

    // AddToCommand: move bg into markers, then undo
    expect(executor.executeUndoable(new AddToCommand(doc, 'markers', 'bg')).lines[0]).toBe(
      'rect#bg added to g#markers'
    );
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual([
      'c1',
      'box',
      'bg'
    ]);
    executor.undo();
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['bg', 'markers']);

    // FrontCommand & BackCommand
    expect(executor.executeUndoable(new FrontCommand(doc, 'bg')).lines[0]).toBe(
      'rect#bg brought to front'
    );
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['markers', 'bg']);
    executor.undo();
    expect(doc.getRoot().getChildren().map((s) => s.getId())).toEqual(['bg', 'markers']);

    expect(executor.executeUndoable(new BackCommand(doc, 'box')).lines[0]).toBe(
      'rect#box sent to back'
    );
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual([
      'box',
      'c1'
    ]);
    executor.undo();
    expect(doc.getShapeOrThrow('markers').getChildren().map((s) => s.getId())).toEqual([
      'c1',
      'box'
    ]);

    // Composite shape cannot be ungrouped
    const compositeBox = new GroupShape('n1', undefined, undefined, undefined, true);
    doc.addShape(compositeBox, 'markers');
    expect(() => executor.executeUndoable(new UngroupCommand(doc, 'n1'))).toThrow(
      'error: cannot ungroup composite shape: n1'
    );
  });
});
