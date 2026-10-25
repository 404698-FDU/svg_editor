import { describe, it, expect } from 'vitest';
import { SvgDocument } from '../src/model/SvgDocument';
import { ShapeFactory } from '../src/model/ShapeFactory';
import { RectShape } from '../src/model/RectShape';
import { CircleShape } from '../src/model/CircleShape';
import { EllipseShape } from '../src/model/EllipseShape';
import { LineShape } from '../src/model/LineShape';
import { TextShape } from '../src/model/TextShape';
import { GroupShape } from '../src/model/GroupShape';

describe('Model Layer: Composite Pattern & Shape Polymorphism', () => {
  it('creates leaf shapes and group containers via ShapeFactory', () => {
    const rect = ShapeFactory.create('rect', 'r1', ['10', '20', '100', '50', '#eee']);
    expect(rect.getId()).toBe('r1');
    expect(rect.getTypeName()).toBe('rect');
    expect(rect.getAttribute('x')).toBe('10');
    expect(rect.getAttribute('width')).toBe('100');
    expect(rect.getAttribute('fill')).toBe('#eee');

    const group = ShapeFactory.create('g', 'g1', []);
    expect(group.isContainer()).toBe(true);
    expect(rect.isContainer()).toBe(false);
  });

  it('rejects unknown shape types in ShapeFactory', () => {
    expect(() => ShapeFactory.create('hexagon', 'h1', [])).toThrow(
      'error: unknown shape type: hexagon (is the plugin loaded?)'
    );
    expect(() => ShapeFactory.create('box', 'b1', [])).toThrow(
      'error: unknown shape type: box (is the plugin loaded?)'
    );
  });

  it('supports polymorphic move and scale across leaf shapes and nested groups', () => {
    const r1 = new RectShape('r1', 10, 20, 100, 50, '#4a90d9');
    const c1 = new CircleShape('c1', 100, 100, 20, 'red');
    const innerGroup = new GroupShape('inner');
    innerGroup.addChild(c1);

    const outerGroup = new GroupShape('outer');
    outerGroup.addChild(r1);
    outerGroup.addChild(innerGroup);

    // Move outer group: both r1 and nested c1 should move
    outerGroup.move(30, -10);
    expect(r1.getAttribute('x')).toBe('40');
    expect(r1.getAttribute('y')).toBe('10');
    expect(c1.getAttribute('cx')).toBe('130');
    expect(c1.getAttribute('cy')).toBe('90');

    // Scale outer group: both r1 and nested c1 should scale all geometry
    outerGroup.scale(2);
    expect(r1.getAttribute('x')).toBe('80');
    expect(r1.getAttribute('y')).toBe('20');
    expect(r1.getAttribute('width')).toBe('200');
    expect(r1.getAttribute('height')).toBe('100');
    expect(c1.getAttribute('cx')).toBe('260');
    expect(c1.getAttribute('cy')).toBe('180');
    expect(c1.getAttribute('r')).toBe('40');
  });

  it('enforces attribute whitelist per shape type', () => {
    const text = new TextShape('t1', 20, 40, 'Hello');
    expect(text.getAttribute('text')).toBe('Hello');
    text.setAttribute('text', 'World');
    expect(text.getAttribute('text')).toBe('World');
    text.setAttribute('fill', 'white');
    expect(text.getAttribute('fill')).toBe('white');

    expect(() => text.setAttribute('rx', '10')).toThrow('error: unknown attribute: rx');

    const line = new LineShape('l1', 0, 0, 10, 10, 'black');
    expect(() => line.setAttribute('width', '50')).toThrow('error: unknown attribute: width');
    const ell = new EllipseShape('e1', 1, 2, 3, 4);
    ell.setAttribute('rx', '30');
    expect(ell.getAttribute('rx')).toBe('30');
  });

  it('manages SvgDocument tree invariants, unique IDs, and cycle detection', () => {
    const doc = new SvgDocument(800, 600);
    const g1 = new GroupShape('g1');
    const c1 = new CircleShape('c1', 50, 50, 10);
    doc.addShape(g1);
    doc.addShape(c1, 'g1');

    // Duplicate ID check
    expect(() => doc.addShape(new RectShape('c1', 0, 0, 10, 10))).toThrow(
      'error: id already exists: c1'
    );

    // Non-existent container check
    expect(() => doc.addShape(new RectShape('r1', 0, 0, 10, 10), 'no_such')).toThrow(
      'error: no such container: no_such'
    );

    // Non-container target check
    expect(() => doc.addShape(new RectShape('r1', 0, 0, 10, 10), 'c1')).toThrow(
      'error: not a container: c1'
    );

    // Ancestor-descendant cycle check when grouping
    expect(() => doc.validateGroupTargets('bad', ['c1', 'g1'])).toThrow(
      'error: cannot group a container into its own descendant: g1'
    );
  });
});
