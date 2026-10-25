import { Shape } from './Shape';

/**
 * Concrete Leaf in the Composite Pattern representing an SVG <circle> element.
 */
export class CircleShape extends Shape {
  constructor(
    id: string,
    private cx: number,
    private cy: number,
    private r: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: string
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'circle';
  }

  public override move(dx: number, dy: number): void {
    this.cx += dx;
    this.cy += dy;
  }

  protected override applyScale(factor: number): void {
    this.cx *= factor;
    this.cy *= factor;
    this.r *= factor;
  }

  public override captureGeometry(): number[] {
    return [this.cx, this.cy, this.r];
  }

  public override restoreGeometry(snapshot: number[]): void {
    [this.cx, this.cy, this.r] = snapshot;
  }

  public override formatMoveFeedback(_dx: number, _dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back to' : 'moved to';
    return `circle#${this.getId()} ${action} (${Shape.formatNumber(this.cx)},${Shape.formatNumber(this.cy)})`;
  }

  protected override isSupportedGeometryAttribute(attr: string): boolean {
    return attr === 'cx' || attr === 'cy' || attr === 'r';
  }

  protected override getGeometryAttribute(attr: string): string | undefined {
    switch (attr) {
      case 'cx':
        return Shape.formatNumber(this.cx);
      case 'cy':
        return Shape.formatNumber(this.cy);
      case 'r':
        return Shape.formatNumber(this.r);
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
      case 'r':
        this.r = num;
        break;
    }
  }

  public override getInlineSummary(): string {
    const geom = `cx=${Shape.formatNumber(this.cx)} cy=${Shape.formatNumber(this.cy)} r=${Shape.formatNumber(this.r)}`;
    const style = this.getStyleDetailLine();
    return style ? `${geom} ${style}` : geom;
  }

  public override getGeometryDetailLine(): string {
    return `cx=${Shape.formatNumber(this.cx)} cy=${Shape.formatNumber(this.cy)} r=${Shape.formatNumber(this.r)}`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    return [
      `${indent}<circle id="${this.getId()}" cx="${Shape.formatNumber(this.cx)}" cy="${Shape.formatNumber(this.cy)}" r="${Shape.formatNumber(this.r)}"${style}/>`
    ];
  }
}
