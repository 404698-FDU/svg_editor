import { Shape } from './Shape';

/**
 * Concrete Leaf in the Composite Pattern representing an SVG <line> element.
 */
export class LineShape extends Shape {
  constructor(
    id: string,
    private x1: number,
    private y1: number,
    private x2: number,
    private y2: number,
    stroke?: string,
    fill?: string,
    strokeWidth?: string
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'line';
  }

  public override move(dx: number, dy: number): void {
    this.x1 += dx;
    this.y1 += dy;
    this.x2 += dx;
    this.y2 += dy;
  }

  protected override applyScale(factor: number): void {
    this.x1 *= factor;
    this.y1 *= factor;
    this.x2 *= factor;
    this.y2 *= factor;
  }

  public override captureGeometry(): number[] {
    return [this.x1, this.y1, this.x2, this.y2];
  }

  public override restoreGeometry(snapshot: number[]): void {
    [this.x1, this.y1, this.x2, this.y2] = snapshot;
  }

  public override formatMoveFeedback(_dx: number, _dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back to' : 'moved to';
    return `line#${this.getId()} ${action} (${Shape.formatNumber(this.x1)},${Shape.formatNumber(this.y1)})`;
  }

  protected override isSupportedGeometryAttribute(attr: string): boolean {
    return attr === 'x1' || attr === 'y1' || attr === 'x2' || attr === 'y2';
  }

  protected override getGeometryAttribute(attr: string): string | undefined {
    switch (attr) {
      case 'x1':
        return Shape.formatNumber(this.x1);
      case 'y1':
        return Shape.formatNumber(this.y1);
      case 'x2':
        return Shape.formatNumber(this.x2);
      case 'y2':
        return Shape.formatNumber(this.y2);
      default:
        return undefined;
    }
  }

  protected override setGeometryAttribute(attr: string, value: string | undefined): void {
    const num = Shape.parseRequiredNumber(value, attr);
    switch (attr) {
      case 'x1':
        this.x1 = num;
        break;
      case 'y1':
        this.y1 = num;
        break;
      case 'x2':
        this.x2 = num;
        break;
      case 'y2':
        this.y2 = num;
        break;
    }
  }

  public override getInlineSummary(): string {
    return `(${Shape.formatNumber(this.x1)},${Shape.formatNumber(this.y1)}) -> (${Shape.formatNumber(this.x2)},${Shape.formatNumber(this.y2)})`;
  }

  public override getGeometryDetailLine(): string {
    return `x1=${Shape.formatNumber(this.x1)} y1=${Shape.formatNumber(this.y1)} x2=${Shape.formatNumber(this.x2)} y2=${Shape.formatNumber(this.y2)}`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    return [
      `${indent}<line id="${this.getId()}" x1="${Shape.formatNumber(this.x1)}" y1="${Shape.formatNumber(this.y1)}" x2="${Shape.formatNumber(this.x2)}" y2="${Shape.formatNumber(this.y2)}"${style}/>`
    ];
  }
}
