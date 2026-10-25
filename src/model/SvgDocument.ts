import { Shape } from './Shape';
import { GroupShape } from './GroupShape';

/**
 * Receiver in the Command Pattern.
 * Represents an SVG document holding the canvas dimensions, the root Composite container,
 * and the global ID-to-Shape lookup index.
 */
export class SvgDocument {
  private readonly root: GroupShape;
  private readonly shapeIndex: Map<string, Shape> = new Map();
  private filePath?: string;

  constructor(
    private width: number = 800,
    private height: number = 600,
    filePath?: string
  ) {
    this.root = new GroupShape('__svg_root__');
    this.filePath = filePath;
  }

  public getWidth(): number {
    return this.width;
  }

  public getHeight(): number {
    return this.height;
  }

  public setDimensions(width: number, height: number): void {
    if (width <= 0 || height <= 0 || Number.isNaN(width) || Number.isNaN(height)) {
      throw new Error('error: canvas dimensions must be positive');
    }
    this.width = width;
    this.height = height;
  }

  public getFilePath(): string | undefined {
    return this.filePath;
  }

  public setFilePath(filePath: string): void {
    this.filePath = filePath;
  }

  public getRoot(): GroupShape {
    return this.root;
  }

  public hasId(id: string): boolean {
    return this.shapeIndex.has(id);
  }

  public getShapeOrThrow(id: string): Shape {
    const shape = this.shapeIndex.get(id);
    if (!shape) {
      throw new Error(`error: no such shape: ${id}`);
    }
    return shape;
  }

  public getContainerOrThrow(containerId?: string): GroupShape {
    if (containerId === undefined) {
      return this.root;
    }
    const target = this.shapeIndex.get(containerId);
    if (!target) {
      throw new Error(`error: no such container: ${containerId}`);
    }
    if (!target.isContainer()) {
      throw new Error(`error: not a container: ${containerId}`);
    }
    return target as GroupShape;
  }

  public getElementCount(): number {
    return this.shapeIndex.size;
  }

  public isTopLevelContainer(shape: Shape): boolean {
    return shape.isContainer() && shape.getParent() === this.root;
  }

  public addShape(shape: Shape, containerId?: string, index?: number): void {
    const allShapes = shape.collectAllShapes();
    for (const s of allShapes) {
      if (this.shapeIndex.has(s.getId())) {
        throw new Error(`error: id already exists: ${s.getId()}`);
      }
    }
    const container = this.getContainerOrThrow(containerId);
    if (index !== undefined) {
      container.insertChildAt(shape, index);
    } else {
      container.addChild(shape);
    }
    for (const s of allShapes) {
      this.shapeIndex.set(s.getId(), s);
    }
  }

  public removeShape(id: string): {
    shape: Shape;
    parentContainer: GroupShape;
    index: number;
  } {
    const shape = this.getShapeOrThrow(id);
    const parent = shape.getParent();
    if (!parent) {
      throw new Error(`error: no such shape: ${id}`);
    }
    const index = parent.removeChild(shape);
    for (const s of shape.collectAllShapes()) {
      this.shapeIndex.delete(s.getId());
    }
    return { shape, parentContainer: parent, index };
  }

  public restoreRemovedShape(shape: Shape, parentContainer: GroupShape, index: number): void {
    parentContainer.insertChildAt(shape, index);
    for (const s of shape.collectAllShapes()) {
      this.shapeIndex.set(s.getId(), s);
    }
  }

  public validateGroupTargets(newGid: string, memberIds: string[]): Shape[] {
    if (this.shapeIndex.has(newGid)) {
      throw new Error(`error: id already exists: ${newGid}`);
    }
    if (memberIds.length === 0) {
      throw new Error('error: group requires at least one shape id');
    }
    const members: Shape[] = [];
    const seen = new Set<string>();
    for (const id of memberIds) {
      const shape = this.getShapeOrThrow(id);
      if (!seen.has(id)) {
        seen.add(id);
        members.push(shape);
      }
    }
    // Check if any member is an ancestor of another member
    for (const candidate of members) {
      if (candidate.isContainer()) {
        for (const other of members) {
          if (candidate !== other && candidate.containsDescendant(other)) {
            throw new Error(
              `error: cannot group a container into its own descendant: ${candidate.getId()}`
            );
          }
        }
      }
    }
    return members;
  }

  public generateUniqueAutoId(tagName: string): string {
    let seq = 1;
    while (this.shapeIndex.has(`${tagName}${seq}`)) {
      seq++;
    }
    return `${tagName}${seq}`;
  }
}
