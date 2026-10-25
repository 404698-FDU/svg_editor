import { Shape } from './Shape';
import { GroupShape } from './GroupShape';
import { ShapeFactory } from './ShapeFactory';

/**
 * Receiver in the Command Pattern.
 * Represents an SVG document holding the canvas dimensions, the root Composite container,
 * and the global ID-to-Shape lookup index. All domain mutations and invariant checks live here.
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

  public createAndAddShape(
    type: string,
    id: string,
    params: string[],
    containerId?: string
  ): { shape: Shape; message: string } {
    if (!ShapeFactory.isKnownType(type)) {
      throw new Error(`error: unknown shape type: ${type} (is the plugin loaded?)`);
    }
    if (this.shapeIndex.has(id)) {
      throw new Error(`error: id already exists: ${id}`);
    }
    this.getContainerOrThrow(containerId);
    const shape = ShapeFactory.create(type, id, params);
    this.addShape(shape, containerId);
    const message =
      containerId !== undefined
        ? `${shape.getTypeName()}#${id} created in g#${containerId}`
        : `${shape.getTypeName()}#${id} created`;
    return { shape, message };
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

  public deleteShape(id: string): {
    shape: Shape;
    parentContainer: GroupShape;
    index: number;
    message: string;
  } {
    const { shape, parentContainer, index } = this.removeShape(id);
    return {
      shape,
      parentContainer,
      index,
      message: `${shape.getTypeName()}#${id} deleted`
    };
  }

  public restoreRemovedShape(shape: Shape, parentContainer: GroupShape, index: number): void {
    parentContainer.insertChildAt(shape, index);
    for (const s of shape.collectAllShapes()) {
      this.shapeIndex.set(s.getId(), s);
    }
  }

  public restoreDeletedShape(shape: Shape, parentContainer: GroupShape, index: number): string {
    this.restoreRemovedShape(shape, parentContainer, index);
    const prefix = `${shape.getTypeName()}#${shape.getId()}`;
    if (parentContainer === this.root) {
      return `${prefix} restored`;
    }
    return `${prefix} restored into g#${parentContainer.getId()}`;
  }

  public moveShape(id: string, dx: number, dy: number, isUndo: boolean): string {
    const shape = this.getShapeOrThrow(id);
    shape.move(dx, dy);
    return shape.formatMoveFeedback(dx, dy, isUndo);
  }

  public scaleShape(id: string, factor: number): { snapshot: number[]; message: string } {
    const shape = this.getShapeOrThrow(id);
    if (typeof factor !== 'number' || Number.isNaN(factor) || factor <= 0) {
      throw new Error('error: scale factor must be positive');
    }
    const snapshot = shape.captureGeometry();
    shape.scale(factor);
    return {
      snapshot,
      message: `${shape.getTypeName()}#${id} scaled by ${Shape.formatNumber(factor)}`
    };
  }

  public restoreScaledShape(id: string, factor: number, snapshot: number[]): string {
    const shape = this.getShapeOrThrow(id);
    shape.restoreGeometry(snapshot);
    return `${shape.getTypeName()}#${id} scaled back by ${Shape.formatNumber(factor)}`;
  }

  public setShapeAttribute(
    id: string,
    attr: string,
    value: string | undefined
  ): { oldValue: string | undefined; message: string } {
    const shape = this.getShapeOrThrow(id);
    const oldValue = shape.getAttribute(attr);
    shape.setAttribute(attr, value);
    const formattedVal = attr === 'text' ? `"${value ?? ''}"` : `${value ?? 'none'}`;
    return {
      oldValue,
      message: `${shape.getTypeName()}#${id} updated: ${attr}=${formattedVal}`
    };
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

  public groupShapes(
    newGid: string,
    memberIds: string[]
  ): {
    newGroup: GroupShape;
    groupParent: GroupShape;
    memberPositions: Array<{ shape: Shape; oldParent: GroupShape; oldIndex: number }>;
    message: string;
  } {
    const members = this.validateGroupTargets(newGid, memberIds);
    const firstParent = members[0].getParent() ?? this.root;
    const firstInitialIndex = firstParent.getChildIndex(members[0]);

    for (const member of members) {
      if (
        member.isContainer() &&
        (member === firstParent || member.containsDescendant(firstParent))
      ) {
        throw new Error(
          `error: cannot group a container into its own descendant: ${member.getId()}`
        );
      }
    }

    let removedBeforeFirst = 0;
    const memberPositions: Array<{ shape: Shape; oldParent: GroupShape; oldIndex: number }> = [];
    for (const member of members) {
      const oldParent = member.getParent()!;
      const oldIndex = oldParent.getChildIndex(member);
      if (oldParent === firstParent && oldIndex < firstInitialIndex) {
        removedBeforeFirst++;
      }
      memberPositions.push({ shape: member, oldParent, oldIndex });
    }

    const newGroup = new GroupShape(newGid);
    for (const member of members) {
      newGroup.addChild(member);
    }

    const targetInsertIndex = Math.max(0, firstInitialIndex - removedBeforeFirst);
    firstParent.insertChildAt(newGroup, targetInsertIndex);
    this.shapeIndex.set(newGid, newGroup);

    return {
      newGroup,
      groupParent: firstParent,
      memberPositions,
      message: `g#${newGid} created with ${members.length} children`
    };
  }

  public restoreGroupedShapes(
    newGroup: GroupShape,
    groupParent: GroupShape,
    memberPositions: Array<{ shape: Shape; oldParent: GroupShape; oldIndex: number }>
  ): string {
    const gid = newGroup.getId();
    groupParent.removeChild(newGroup);
    this.shapeIndex.delete(gid);

    const sortedPositions = [...memberPositions].sort((a, b) => a.oldIndex - b.oldIndex);
    for (const pos of sortedPositions) {
      pos.oldParent.insertChildAt(pos.shape, pos.oldIndex);
    }
    return `g#${gid} ungrouped`;
  }

  public ungroupShape(gid: string): {
    groupShape: GroupShape;
    parent: GroupShape;
    groupIndex: number;
    children: Shape[];
    message: string;
  } {
    const shape = this.getShapeOrThrow(gid);
    if (shape.isCompositeShape()) {
      throw new Error(`error: cannot ungroup composite shape: ${gid}`);
    }
    if (!shape.isContainer()) {
      throw new Error(`error: not a container: ${gid}`);
    }
    if (this.isTopLevelContainer(shape)) {
      throw new Error(`error: cannot ungroup top-level container: ${gid}`);
    }

    const groupShape = shape as GroupShape;
    const parent = groupShape.getParent()!;
    const groupIndex = parent.getChildIndex(groupShape);
    const children = [...groupShape.getChildren()];

    parent.removeChild(groupShape);
    this.shapeIndex.delete(gid);

    for (let i = 0; i < children.length; i++) {
      parent.insertChildAt(children[i], groupIndex + i);
    }

    return {
      groupShape,
      parent,
      groupIndex,
      children,
      message: `g#${gid} ungrouped`
    };
  }

  public restoreUngroupedShape(
    groupShape: GroupShape,
    parent: GroupShape,
    groupIndex: number,
    children: Shape[]
  ): string {
    for (const child of children) {
      groupShape.addChild(child);
    }
    parent.insertChildAt(groupShape, groupIndex);
    this.shapeIndex.set(groupShape.getId(), groupShape);
    return `g#${groupShape.getId()} restored with ${children.length} children`;
  }

  public addShapeToContainer(
    gid: string,
    id: string
  ): {
    shape: Shape;
    oldParent: GroupShape;
    oldIndex: number;
    message: string;
  } {
    const targetContainer = this.getContainerOrThrow(gid);
    const shape = this.getShapeOrThrow(id);
    if (shape === targetContainer || shape.containsDescendant(targetContainer)) {
      throw new Error(`error: cannot group a container into its own descendant: ${shape.getId()}`);
    }
    const oldParent = shape.getParent()!;
    const oldIndex = oldParent.getChildIndex(shape);
    targetContainer.addChild(shape);
    return {
      shape,
      oldParent,
      oldIndex,
      message: `${shape.getTypeName()}#${id} added to g#${gid}`
    };
  }

  public restoreAddedShapeToContainer(
    shape: Shape,
    oldParent: GroupShape,
    oldIndex: number
  ): string {
    oldParent.insertChildAt(shape, oldIndex);
    const parentDesc = oldParent === this.root ? 'svg' : `g#${oldParent.getId()}`;
    return `${shape.getTypeName()}#${shape.getId()} restored to ${parentDesc}`;
  }

  public bringToFront(id: string): {
    shape: Shape;
    parent: GroupShape;
    oldIndex: number;
    message: string;
  } {
    const shape = this.getShapeOrThrow(id);
    const parent = shape.getParent()!;
    const oldIndex = parent.getChildIndex(shape);
    parent.addChild(shape);
    return {
      shape,
      parent,
      oldIndex,
      message: `${shape.getTypeName()}#${id} brought to front`
    };
  }

  public sendToBack(id: string): {
    shape: Shape;
    parent: GroupShape;
    oldIndex: number;
    message: string;
  } {
    const shape = this.getShapeOrThrow(id);
    const parent = shape.getParent()!;
    const oldIndex = parent.getChildIndex(shape);
    parent.insertChildAt(shape, 0);
    return {
      shape,
      parent,
      oldIndex,
      message: `${shape.getTypeName()}#${id} sent to back`
    };
  }

  public restoreZOrder(shape: Shape, parent: GroupShape, oldIndex: number): string {
    parent.insertChildAt(shape, oldIndex);
    return `${shape.getTypeName()}#${shape.getId()} z-order restored`;
  }

  public generateUniqueAutoId(tagName: string): string {
    let seq = 1;
    while (this.shapeIndex.has(`${tagName}${seq}`)) {
      seq++;
    }
    return `${tagName}${seq}`;
  }
}
