import { Shape } from './Shape';
import { RectShape } from './RectShape';
import { CircleShape } from './CircleShape';
import { EllipseShape } from './EllipseShape';
import { LineShape } from './LineShape';
import { TextShape } from './TextShape';
import { GroupShape } from './GroupShape';

/**
 * Factory for creating Shape instances by type name.
 * NOTE [Architecture Pending Refactoring]:
 * This is one of the ONLY TWO allowed name-based dispatch points in Phase 1 (Section 2.1).
 * In Phase 2 (Plugin Architecture), this switch will be replaced by a ShapeProvider registry.
 */
export class ShapeFactory {
  public static isKnownType(type: string): boolean {
    return (
      type === 'rect' ||
      type === 'circle' ||
      type === 'ellipse' ||
      type === 'line' ||
      type === 'text' ||
      type === 'g'
    );
  }

  public static create(type: string, id: string, params: string[]): Shape {
    switch (type) {
      case 'rect': {
        if (params.length < 4 || params.length > 5) {
          throw new Error('error: invalid arguments for create rect');
        }
        const x = ShapeFactory.parseNum(params[0], 'x');
        const y = ShapeFactory.parseNum(params[1], 'y');
        const w = ShapeFactory.parseNum(params[2], 'width');
        const h = ShapeFactory.parseNum(params[3], 'height');
        const fill = params[4];
        return new RectShape(id, x, y, w, h, fill);
      }
      case 'circle': {
        if (params.length < 3 || params.length > 4) {
          throw new Error('error: invalid arguments for create circle');
        }
        const cx = ShapeFactory.parseNum(params[0], 'cx');
        const cy = ShapeFactory.parseNum(params[1], 'cy');
        const r = ShapeFactory.parseNum(params[2], 'r');
        const fill = params[3];
        return new CircleShape(id, cx, cy, r, fill);
      }
      case 'ellipse': {
        if (params.length < 4 || params.length > 5) {
          throw new Error('error: invalid arguments for create ellipse');
        }
        const cx = ShapeFactory.parseNum(params[0], 'cx');
        const cy = ShapeFactory.parseNum(params[1], 'cy');
        const rx = ShapeFactory.parseNum(params[2], 'rx');
        const ry = ShapeFactory.parseNum(params[3], 'ry');
        const fill = params[4];
        return new EllipseShape(id, cx, cy, rx, ry, fill);
      }
      case 'line': {
        if (params.length < 4 || params.length > 5) {
          throw new Error('error: invalid arguments for create line');
        }
        const x1 = ShapeFactory.parseNum(params[0], 'x1');
        const y1 = ShapeFactory.parseNum(params[1], 'y1');
        const x2 = ShapeFactory.parseNum(params[2], 'x2');
        const y2 = ShapeFactory.parseNum(params[3], 'y2');
        const stroke = params[4];
        return new LineShape(id, x1, y1, x2, y2, stroke);
      }
      case 'text': {
        if (params.length < 3 || params.length > 4) {
          throw new Error('error: invalid arguments for create text');
        }
        const x = ShapeFactory.parseNum(params[0], 'x');
        const y = ShapeFactory.parseNum(params[1], 'y');
        const content = params[2];
        const fill = params[3];
        return new TextShape(id, x, y, content, fill);
      }
      case 'g': {
        if (params.length !== 0) {
          throw new Error('error: invalid arguments for create g');
        }
        return new GroupShape(id);
      }
      default:
        throw new Error(`error: unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private static parseNum(raw: string, name: string): number {
    const val = Number(raw);
    if (raw === undefined || raw.trim() === '' || Number.isNaN(val)) {
      throw new Error(`error: invalid numeric parameter: ${name}`);
    }
    return val;
  }
}
