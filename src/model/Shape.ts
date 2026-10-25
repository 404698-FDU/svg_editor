import type { GroupShape } from './GroupShape';

/**
 * Abstract Component in the Composite Pattern.
 * Represents any addressable graphical element (leaf shape or <g> container) in an SVG document.
 */
export abstract class Shape {
  private parent: GroupShape | null = null;
  private fill?: string;
  private stroke?: string;
  private strokeWidth?: string;

  constructor(
    private readonly id: string,
    fill?: string,
    stroke?: string,
    strokeWidth?: string
  ) {
    if (fill !== undefined && fill !== '') {
      this.fill = fill;
    }
    if (stroke !== undefined && stroke !== '') {
      this.stroke = stroke;
    }
    if (strokeWidth !== undefined && strokeWidth !== '') {
      this.strokeWidth = strokeWidth;
    }
  }

  public getId(): string {
    return this.id;
  }

  public abstract getTypeName(): string;

  public getParent(): GroupShape | null {
    return this.parent;
  }

  public setParent(parent: GroupShape | null): void {
    this.parent = parent;
  }

  public isContainer(): boolean {
    return false;
  }

  /**
   * Reserved extension hook for Phase 2 composite shapes (e.g. plugin 'box').
   */
  public isCompositeShape(): boolean {
    return false;
  }

  public getFill(): string | undefined {
    return this.fill;
  }

  public getStroke(): string | undefined {
    return this.stroke;
  }

  public getStrokeWidth(): string | undefined {
    return this.strokeWidth;
  }

  public getChildren(): readonly Shape[] {
    return [];
  }

  public addChild(_child: Shape): void {
    throw new Error(`error: not a container: ${this.id}`);
  }

  public insertChildAt(_child: Shape, _index: number): void {
    throw new Error(`error: not a container: ${this.id}`);
  }

  public removeChild(_child: Shape): number {
    throw new Error(`error: not a container: ${this.id}`);
  }

  public getChildIndex(_child: Shape): number {
    throw new Error(`error: not a container: ${this.id}`);
  }

  public containsDescendant(_target: Shape): boolean {
    return false;
  }

  public collectAllShapes(): Shape[] {
    return [this];
  }

  public abstract move(dx: number, dy: number): void;

  public scale(factor: number): void {
    if (typeof factor !== 'number' || Number.isNaN(factor) || factor <= 0) {
      throw new Error('error: scale factor must be positive');
    }
    this.applyScale(factor);
  }

  protected abstract applyScale(factor: number): void;

  public abstract captureGeometry(): number[];

  public abstract restoreGeometry(snapshot: number[]): void;

  public abstract formatMoveFeedback(dx: number, dy: number, isUndo: boolean): string;

  public getAttribute(attr: string): string | undefined {
    if (attr === 'fill') return this.fill;
    if (attr === 'stroke') return this.stroke;
    if (attr === 'stroke-width') return this.strokeWidth;
    if (!this.isSupportedGeometryAttribute(attr)) {
      throw new Error(`error: unknown attribute: ${attr}`);
    }
    return this.getGeometryAttribute(attr);
  }

  public setAttribute(attr: string, value: string | undefined): void {
    if (attr === 'fill') {
      this.fill = value;
      return;
    }
    if (attr === 'stroke') {
      this.stroke = value;
      return;
    }
    if (attr === 'stroke-width') {
      this.strokeWidth = value;
      return;
    }
    if (!this.isSupportedGeometryAttribute(attr)) {
      throw new Error(`error: unknown attribute: ${attr}`);
    }
    this.setGeometryAttribute(attr, value);
  }

  protected abstract isSupportedGeometryAttribute(attr: string): boolean;

  protected abstract getGeometryAttribute(attr: string): string | undefined;

  protected abstract setGeometryAttribute(attr: string, value: string | undefined): void;

  public abstract getInlineSummary(): string;

  public abstract getGeometryDetailLine(): string;

  public getStyleDetailLine(): string | undefined {
    const parts: string[] = [];
    if (this.fill !== undefined) parts.push(`fill=${this.fill}`);
    if (this.stroke !== undefined) parts.push(`stroke=${this.stroke}`);
    if (this.strokeWidth !== undefined) parts.push(`stroke-width=${this.strokeWidth}`);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  public abstract toSvgLines(indentLevel: number): string[];

  protected formatStyleAttributesForSvg(): string {
    let attrs = '';
    if (this.fill !== undefined) attrs += ` fill="${this.fill}"`;
    if (this.stroke !== undefined) attrs += ` stroke="${this.stroke}"`;
    if (this.strokeWidth !== undefined) attrs += ` stroke-width="${this.strokeWidth}"`;
    return attrs;
  }

  public static formatNumber(num: number): string {
    const normalized = Object.is(num, -0) ? 0 : Number(num.toFixed(6));
    return String(normalized);
  }

  protected static parseRequiredNumber(value: string | undefined, attr: string): number {
    if (value === undefined || value.trim() === '') {
      throw new Error(`error: invalid numeric value for attribute: ${attr}`);
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error(`error: invalid numeric value for attribute: ${attr}`);
    }
    return parsed;
  }
}
