import { Shape } from './Shape';
import { GroupShape } from './GroupShape';
import { ShapeFactory } from './ShapeFactory';

export interface DeletedShapeRecord {
  shape: Shape;
  parentContainer: GroupShape;
  index: number;
}

export interface ScaledShapeRecord {
  id: string;
  factor: number;
  snapshot: number[];
}

export interface SetAttributeRecord {
  id: string;
  attr: string;
  oldValue: string | undefined;
}

export interface GroupMemberPosition {
  shape: Shape;
  oldParent: GroupShape;
  oldIndex: number;
}

export interface GroupedShapesRecord {
  newGroup: GroupShape;
  groupParent: GroupShape;
  memberPositions: GroupMemberPosition[];
}

export interface UngroupedShapeRecord {
  groupShape: GroupShape;
  parent: GroupShape;
  groupIndex: number;
  children: Shape[];
}

export interface AddToContainerRecord {
  shape: Shape;
  targetContainer: GroupShape;
  oldParent: GroupShape;
  oldIndex: number;
}

export interface ZOrderRecord {
  shape: Shape;
  parent: GroupShape;
  oldIndex: number;
}

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
    // Validate target container before creating shape
    this.getContainerOrThrow(containerId);
    const shape = ShapeFactory.create(type, id, params);
    this.addShape(shape, containerId);
    const message =
      containerId !== undefined
        ? `${shape.getTypeName()}#${id} created in g#${containerId}`
        : `${shape.getTypeName()}#${id} created`;
    return { shape, message };
  }

  public removeShape(id: string): DeletedShapeRecord {
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

  public deleteShape(id: string): { record: DeletedShapeRecord; message: string } {
    const record = this.removeShape(id);
    return {
      record,
      message: `${record.shape.getTypeName()}#${id} deleted`
    };
  }

  public restoreRemovedShape(shape: Shape, parentContainer: GroupShape, index: number): void {
    parentContainer.insertChildAt(shape, index);
    for (const s of shape.collectAllShapes()) {
      this.shapeIndex.set(s.getId(), s);
    }
  }

  public restoreDeletedShape(record: DeletedShapeRecord): string {
    this.restoreRemovedShape(record.shape, record.parentContainer, record.index);
    const prefix = `${record.shape.getTypeName()}#${record.shape.getId()}`;
    if (record.parentContainer === this.root) {
      return `${prefix} restored`;
    }
    return `${prefix} restored into g#${record.parentContainer.getId()}`;
  }

  public moveShape(id: string, dx: number, dy: number, isUndo: boolean): string {
    const shape = this.getShapeOrThrow(id);
    shape.move(dx, dy);
    return shape.formatMoveFeedback(dx, dy, isUndo);
  }

  public scaleShape(id: string, factor: number): { record: ScaledShapeRecord; message: string } {
    const shape = this.getShapeOrThrow(id);
    if (typeof factor !== 'number' || Number.isNaN(factor) || factor <= 0) {
      throw new Error('error: scale factor must be positive');
    }
    const snapshot = shape.captureGeometry();
    shape.scale(factor);
    return {
      record: { id, factor, snapshot },
      message: `${shape.getTypeName()}#${id} scaled by ${Shape.formatNumber(factor)}`
    };
  }

  public restoreScaledShape(record: ScaledShapeRecord): string {
    const shape = this.getShapeOrThrow(record.id);
    shape.restoreGeometry(record.snapshot);
    return `${shape.getTypeName()}#${record.id} scaled back by ${Shape.formatNumber(record.factor)}`;
  }

  public setShapeAttribute(
    id: string,
    attr: string,
    value: string | undefined
  ): { record: SetAttributeRecord; message: string } {
    const shape = this.getShapeOrThrow(id);
    const oldValue = shape.getAttribute(attr);
    shape.setAttribute(attr, value);
    const formattedVal = attr === 'text' ? `"${value ?? ''}"` : `${value ?? 'none'}`;
    return {
      record: { id, attr, oldValue },
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
  ): { record: GroupedShapesRecord; message: string } {
    const members = this.validateGroupTargets(newGid, memberIds);
    const firstParent = members[0].getParent() ?? this.root;
    const firstInitialIndex = firstParent.getChildIndex(members[0]);

    // Check that placing newGroup inside firstParent won't place any member container into its own descendant
    for (const member of members) {
      if (member.isContainer() && (member === firstParent || member.containsDescendant(firstParent))) {
        throw new Error(
          `error: cannot group a container into its own descendant: ${member.getId()}`
        );
      }
    }

    let removedBeforeFirst = 0;
    const memberPositions: GroupMemberPosition[] = [];
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
      record: { newGroup, groupParent: firstParent, memberPositions },
      message: `g#${newGid} created with ${members.length} children`
    };
  }

  public restoreGroupedShapes(record: GroupedShapesRecord): string {
    const gid = record.newGroup.getId();
    record.groupParent.removeChild(record.newGroup);
    this.shapeIndex.delete(gid);

    const sortedPositions = [...record.memberPositions].sort((a, b) => a.oldIndex - b.oldIndex);
    for (const pos of sortedPositions) {
      pos.oldParent.insertChildAt(pos.shape, pos.oldIndex);
    }
    return `g#${gid} ungrouped`;
  }

  public ungroupShape(gid: string): { record: UngroupedShapeRecord; message: string } {
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
      record: { groupShape, parent, groupIndex, children },
      message: `g#${gid} ungrouped`
    };
  }

  public restoreUngroupedShape(record: UngroupedShapeRecord): string {
    for (const child of record.children) {
      record.groupShape.addChild(child);
    }
    record.parent.insertChildAt(record.groupShape, record.groupIndex);
    this.shapeIndex.set(record.groupShape.getId(), record.groupShape);
    return `g#${record.groupShape.getId()} restored with ${record.children.length} children`;
  }

  public addShapeToContainer(
    gid: string,
    id: string
  ): { record: AddToContainerRecord; message: string } {
    const targetContainer = this.getContainerOrThrow(gid);
    const shape = this.getShapeOrThrow(id);
    if (shape === targetContainer || shape.containsDescendant(targetContainer)) {
      throw new Error(`error: cannot group a container into its own descendant: ${shape.getId()}`);
    }
    const oldParent = shape.getParent()!;
    const oldIndex = oldParent.getChildIndex(shape);
    targetContainer.addChild(shape);
    return {
      record: { shape, targetContainer, oldParent, oldIndex },
      message: `${shape.getTypeName()}#${id} added to g#${gid}`
    };
  }

  public restoreAddedShapeToContainer(record: AddToContainerRecord): string {
    record.oldParent.insertChildAt(record.shape, record.oldIndex);
    const parentDesc =
      record.oldParent === this.root ? 'svg' : `g#${record.oldParent.getId()}`;
    return `${record.shape.getTypeName()}#${record.shape.getId()} restored to ${parentDesc}`;
  }

  public bringToFront(id: string): { record: ZOrderRecord; message: string } {
    const shape = this.getShapeOrThrow(id);
    const parent = shape.getParent()!;
    const oldIndex = parent.getChildIndex(shape);
    parent.addChild(shape);
    return {
      record: { shape, parent, oldIndex },
      message: `${shape.getTypeName()}#${id} brought to front`
    };
  }

  public sendToBack(id: string): { record: ZOrderRecord; message: string } {
    const shape = this.getShapeOrThrow(id);
    const parent = shape.getParent()!;
    const oldIndex = parent.getChildIndex(shape);
    parent.insertChildAt(shape, 0);
    return {
      record: { shape, parent, oldIndex },
      message: `${shape.getTypeName()}#${id} sent to back`
    };
  }

  public restoreZOrder(record: ZOrderRecord): string {
    record.parent.insertChildAt(record.shape, record.oldIndex);
    return `${record.shape.getTypeName()}#${record.shape.getId()} z-order restored`;
  }

  public generateUniqueAutoId(tagName: string): string {
    let seq = 1;
    while (this.shapeIndex.has(`${tagName}${seq}`)) {
      seq++;
    }
    return `${tagName}${seq}`;
  }
}
