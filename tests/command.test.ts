import { describe, it, expect } from 'vitest';
import { SvgDocument } from '../src/model/SvgDocument';
import { CommandExecutor } from '../src/command/CommandExecutor';
import { CreateCommand } from '../src/command/CreateCommand';
import { DeleteCommand } from '../src/command/DeleteCommand';
import { MoveCommand } from '../src/command/MoveCommand';
import { ScaleCommand } from '../src/command/ScaleCommand';
import { SetCommand } from '../src/command/SetCommand';
import { CommandResult } from '../src/command/CommandResult';

describe('Command Layer: Basic Editing Commands & Undo/Redo Stack', () => {
  it('executes, undoes, and redoes CreateCommand, MoveCommand, SetCommand, ScaleCommand, DeleteCommand', () => {
    const doc = new SvgDocument(800, 600);
    const executor = new CommandExecutor();

    // Create group and child circle
    expect(executor.executeUndoable(new CreateCommand(doc, 'g', 'markers', [])).lines[0]).toBe(
      'g#markers created'
    );
    expect(
      executor.executeUndoable(
        new CreateCommand(doc, 'circle', 'c1', ['100', '100', '20', 'red'], 'markers')
      ).lines[0]
    ).toBe('circle#c1 created in g#markers');

    // Move circle
    expect(executor.executeUndoable(new MoveCommand(doc, 'c1', 30, 0)).lines[0]).toBe(
      'circle#c1 moved to (130,100)'
    );
    expect(executor.undo().lines[0]).toBe('circle#c1 moved back to (100,100)');
    expect(executor.redo().lines[0]).toBe('circle#c1 moved to (130,100)');

    // Move container g#markers
    expect(executor.executeUndoable(new MoveCommand(doc, 'markers', 0, 50)).lines[0]).toBe(
      'g#markers moved by (0,50)'
    );
    expect(doc.getShapeOrThrow('c1').getAttribute('cy')).toBe('150');
    expect(executor.undo().lines[0]).toBe('g#markers moved back by (0,-50)');
    expect(doc.getShapeOrThrow('c1').getAttribute('cy')).toBe('100');

    // Scale circle
    expect(executor.executeUndoable(new ScaleCommand(doc, 'c1', 1.5)).lines[0]).toBe(
      'circle#c1 scaled by 1.5'
    );
    expect(doc.getShapeOrThrow('c1').getAttribute('r')).toBe('30');
    expect(executor.undo().lines[0]).toBe('circle#c1 scaled back by 1.5');
    expect(doc.getShapeOrThrow('c1').getAttribute('r')).toBe('20');

    // Set text attribute
    executor.executeUndoable(new CreateCommand(doc, 'text', 'title', ['20', '40', 'My Diagram']));
    expect(
      executor.executeUndoable(new SetCommand(doc, 'title', 'text', 'My Diagram v2')).lines[0]
    ).toBe('text#title updated: text="My Diagram v2"');
    expect(executor.undo().lines[0]).toBe('text#title updated: text="My Diagram"');

    // Delete c1 from g#markers and undo
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

    // New edit clears redo stack
    executor.executeUndoable(new SetCommand(doc, 'r1', 'fill', 'blue'));
    expect(executor.getRedoCount()).toBe(0);
    expect(() => executor.redo()).toThrow('error: nothing to redo');

    // IO command locks undo/redo until next edit
    executor.executeDocumentIo({
      execute: () => CommandResult.single('saved to demo.svg (1 elements)')
    });
    expect(() => executor.undo()).toThrow('error: undo not allowed after io command');
    expect(() => executor.redo()).toThrow('error: undo not allowed after io command');

    // Next edit unlocks undo
    executor.executeUndoable(new MoveCommand(doc, 'r1', 5, 5));
    expect(executor.undo().lines[0]).toBe('rect#r1 moved back to (0,0)');
  });
});
