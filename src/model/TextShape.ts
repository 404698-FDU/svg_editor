import { Shape } from './Shape';

/**
 * Concrete Leaf in the Composite Pattern representing an SVG <text> element.
 */
export class TextShape extends Shape {
  constructor(
    id: string,
    private x: number,
    private y: number,
    private textContent: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: string
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'text';
  }

  public getTextContent(): string {
    return this.textContent;
  }

  public override move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  protected override applyScale(factor: number): void {
    this.x *= factor;
    this.y *= factor;
  }

  public override captureGeometry(): number[] {
    return [this.x, this.y];
  }

  public override restoreGeometry(snapshot: number[]): void {
    [this.x, this.y] = snapshot;
  }

  public override formatMoveFeedback(_dx: number, _dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back to' : 'moved to';
    return `text#${this.getId()} ${action} (${Shape.formatNumber(this.x)},${Shape.formatNumber(this.y)})`;
  }

  protected override isSupportedGeometryAttribute(attr: string): boolean {
    return attr === 'x' || attr === 'y' || attr === 'text';
  }

  protected override getGeometryAttribute(attr: string): string | undefined {
    switch (attr) {
      case 'x':
        return Shape.formatNumber(this.x);
      case 'y':
        return Shape.formatNumber(this.y);
      case 'text':
        return this.textContent;
      default:
        return undefined;
    }
  }

  protected override setGeometryAttribute(attr: string, value: string | undefined): void {
    if (attr === 'text') {
      this.textContent = value ?? '';
      return;
    }
    const num = Shape.parseRequiredNumber(value, attr);
    if (attr === 'x') {
      this.x = num;
    } else if (attr === 'y') {
      this.y = num;
    }
  }

  public override getInlineSummary(): string {
    return `(${Shape.formatNumber(this.x)},${Shape.formatNumber(this.y)}) "${this.textContent}"`;
  }

  public override getGeometryDetailLine(): string {
    return `x=${Shape.formatNumber(this.x)} y=${Shape.formatNumber(this.y)} text="${this.textContent}"`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    return [
      `${indent}<text id="${this.getId()}" x="${Shape.formatNumber(this.x)}" y="${Shape.formatNumber(this.y)}"${style}>${this.textContent}</text>`
    ];
  }
}
