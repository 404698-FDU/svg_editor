import { Shape } from './Shape';

/**
 * Concrete Leaf in the Composite Pattern representing an SVG <ellipse> element.
 */
export class EllipseShape extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private rx: number,
    private ry: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: string
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'ellipse';
  }

  public override move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  protected override applyScale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.rx *= factor;
    this.ry *= factor;
  }

  public override captureGeometry(): number[] {
    return [this.cx, this.cy, this.rx, this.ry];
  }

  public override restoreGeometry(snapshot: number[]): void {
    [this.cx, this.cy, this.rx, this.ry] = snapshot;
  }

  public override formatMoveFeedback(_dx: number, _dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back to' : 'moved to';
    return `ellipse#${this.getId()} ${action} (${Shape.formatNumber(this.cx)},${Shape.formatNumber(this.cy)})`;
  }

  protected override isSupportedGeometryAttribute(attr: string): boolean {
    return attr === 'cx' || attr === 'cy' || attr === 'rx' || attr === 'ry';
  }

  protected override getGeometryAttribute(attr: string): string | undefined {
    switch (attr) {
      case 'cx':
        return Shape.formatNumber(this.cx);
      case 'cy':
        return Shape.formatNumber(this.cy);
      case 'rx':
        return Shape.formatNumber(this.rx);
      case 'ry':
        return Shape.formatNumber(this.ry);
      default:
        return undefined;
    }
  }

  protected override setGeometryAttribute(attr: string, value: string | undefined): void {
    const num = Shape.parseRequiredNumber(value, attr);
    switch (attr) {
      case 'cx':
        this.cx = num;
        break;
      case 'cy':
        this.cy = num;
        break;
      case 'rx':
        this.rx = num;
        break;
      case 'ry':
        this.ry = num;
        break;
    }
  }

  public override getInlineSummary(): string {
    const geom = `cx=${Shape.formatNumber(this.cx)} cy=${Shape.formatNumber(this.cy)} rx=${Shape.formatNumber(this.rx)} ry=${Shape.formatNumber(this.ry)}`;
    const style = this.getStyleDetailLine();
    return style ? `${geom} ${style}` : geom;
  }

  public override getGeometryDetailLine(): string {
    return `cx=${Shape.formatNumber(this.cx)} cy=${Shape.formatNumber(this.cy)} rx=${Shape.formatNumber(this.rx)} ry=${Shape.formatNumber(this.ry)}`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    return [
      `${indent}<ellipse id="${this.getId()}" cx="${Shape.formatNumber(this.cx)}" cy="${Shape.formatNumber(this.cy)}" rx="${Shape.formatNumber(this.rx)}" ry="${Shape.formatNumber(this.ry)}"${style}/>`
    ];
  }
}
