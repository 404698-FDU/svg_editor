import { Shape } from './Shape';

/**
 * Concrete Leaf in the Composite Pattern representing an SVG <rect> element.
 */
export class RectShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    fill?: string,
    stroke?: string,
    strokeWidth?: string
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'rect';
  }

  public override move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  protected override applyScale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
    this.width *= factor;
    this.height *= factor;
  }

  public override captureGeometry(): number[] {
    return [this.x, this.y, this.width, this.height];
  }

  public override restoreGeometry(snapshot: number[]): void {
    [this.x, this.y, this.width, this.height] = snapshot;
  }

  public override formatMoveFeedback(_dx: number, _dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back to' : 'moved to';
    return `rect#${this.getId()} ${action} (${Shape.formatNumber(this.x)},${Shape.formatNumber(this.y)})`;
  }

  protected override isSupportedGeometryAttribute(attr: string): boolean {
    return attr === 'x' || attr === 'y' || attr === 'width' || attr === 'height';
  }

  protected override getGeometryAttribute(attr: string): string | undefined {
    switch (attr) {
      case 'x':
        return Shape.formatNumber(this.x);
      case 'y':
        return Shape.formatNumber(this.y);
      case 'width':
        return Shape.formatNumber(this.width);
      case 'height':
        return Shape.formatNumber(this.height);
      default:
        return undefined;
    }
  }

  protected override setGeometryAttribute(attr: string, value: string | undefined): void {
    const num = Shape.parseRequiredNumber(value, attr);
    switch (attr) {
      case 'x':
        this.x = num;
        break;
      case 'y':
        this.y = num;
        break;
      case 'width':
        this.width = num;
        break;
      case 'height':
        this.height = num;
        break;
    }
  }

  public override getInlineSummary(): string {
    const geom = `x=${Shape.formatNumber(this.x)} y=${Shape.formatNumber(this.y)} w=${Shape.formatNumber(this.width)} h=${Shape.formatNumber(this.height)}`;
    const style = this.getStyleDetailLine();
    return style ? `${geom} ${style}` : geom;
  }

  public override getGeometryDetailLine(): string {
    return `x=${Shape.formatNumber(this.x)} y=${Shape.formatNumber(this.y)} width=${Shape.formatNumber(this.width)} height=${Shape.formatNumber(this.height)}`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    return [
      `${indent}<rect id="${this.getId()}" x="${Shape.formatNumber(this.x)}" y="${Shape.formatNumber(this.y)}" width="${Shape.formatNumber(this.width)}" height="${Shape.formatNumber(this.height)}"${style}/>`
    ];
  }
}
