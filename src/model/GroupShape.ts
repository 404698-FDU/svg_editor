import { Shape } from './Shape';

/**
 * Composite in the Composite Pattern representing an SVG <g> container element.
 * Holds 0..* child Shapes (leaves or nested GroupShapes) and delegates operations recursively.
 */
export class GroupShape extends Shape {
  private readonly children: Shape[] = [];

  constructor(
    id: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: string,
    private readonly compositeFlag: boolean = false
  ) {
    super(id, fill, stroke, strokeWidth);
  }

  public override getTypeName(): string {
    return 'g';
  }

  public override isContainer(): boolean {
    return true;
  }

  public override isCompositeShape(): boolean {
    return this.compositeFlag;
  }

  public override getChildren(): readonly Shape[] {
    return this.children;
  }

  public override addChild(child: Shape): void {
    this.insertChildAt(child, this.children.length);
  }

  public override insertChildAt(child: Shape, index: number): void {
    if (child === this || child.containsDescendant(this)) {
      throw new Error(`error: cannot group a container into its own descendant: ${child.getId()}`);
    }
    const existingParent = child.getParent();
    if (existingParent !== null) {
      existingParent.removeChild(child);
    }
    const clampedIndex = Math.max(0, Math.min(index, this.children.length));
    this.children.splice(clampedIndex, 0, child);
    child.setParent(this);
  }

  public override removeChild(child: Shape): number {
    const idx = this.children.indexOf(child);
    if (idx === -1) {
      throw new Error(`error: no such shape: ${child.getId()}`);
    }
    this.children.splice(idx, 1);
    child.setParent(null);
    return idx;
  }

  public override getChildIndex(child: Shape): number {
    return this.children.indexOf(child);
  }

  public override containsDescendant(target: Shape): boolean {
    for (const child of this.children) {
      if (child === target || child.containsDescendant(target)) {
        return true;
      }
    }
    return false;
  }

  public override collectAllShapes(): Shape[] {
    const result: Shape[] = [this];
    for (const child of this.children) {
      result.push(...child.collectAllShapes());
    }
    return result;
  }

  public override move(dx: number, dy: number): void {
    for (const child of this.children) {
      child.move(dx, dy);
    }
  }

  protected override applyScale(factor: number): void {
    for (const child of this.children) {
      child.scale(factor);
    }
  }

  public override captureGeometry(): number[] {
    const snapshots: number[] = [];
    for (const child of this.children) {
      snapshots.push(...child.captureGeometry());
    }
    return snapshots;
  }

  public override restoreGeometry(snapshot: number[]): void {
    let offset = 0;
    for (const child of this.children) {
      const len = child.captureGeometry().length;
      child.restoreGeometry(snapshot.slice(offset, offset + len));
      offset += len;
    }
  }

  public override formatMoveFeedback(dx: number, dy: number, isUndo: boolean): string {
    const action = isUndo ? 'moved back by' : 'moved by';
    return `g#${this.getId()} ${action} (${Shape.formatNumber(dx)},${Shape.formatNumber(dy)})`;
  }

  protected override isSupportedGeometryAttribute(_attr: string): boolean {
    return false;
  }

  protected override getGeometryAttribute(_attr: string): string | undefined {
    return undefined;
  }

  protected override setGeometryAttribute(attr: string, _value: string | undefined): void {
    throw new Error(`error: unknown attribute: ${attr}`);
  }

  public override getInlineSummary(): string {
    return this.getStyleDetailLine() ?? '';
  }

  public override getGeometryDetailLine(): string {
    return `children=${this.children.length}`;
  }

  public override toSvgLines(indentLevel: number): string[] {
    const indent = '  '.repeat(indentLevel);
    const style = this.formatStyleAttributesForSvg();
    if (this.children.length === 0) {
      return [`${indent}<g id="${this.getId()}"${style}/>`];
    }
    const lines: string[] = [`${indent}<g id="${this.getId()}"${style}>`];
    for (const child of this.children) {
      lines.push(...child.toSvgLines(indentLevel + 1));
    }
    lines.push(`${indent}</g>`);
    return lines;
  }
}
