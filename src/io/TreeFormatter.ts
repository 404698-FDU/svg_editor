import type { SvgDocument } from '../model/SvgDocument';
import type { Shape } from '../model/Shape';

/**
 * Formats SvgDocument structure for 'tree [id]' and 'show <id>' commands.
 */
export class TreeFormatter {
  public static formatTree(doc: SvgDocument, targetId?: string): string[] {
    let header: string;
    let rootChildren: readonly Shape[];

    if (targetId === undefined) {
      header = `svg (${doc.getWidth()}x${doc.getHeight()})`;
      rootChildren = doc.getRoot().getChildren();
    } else {
      const target = doc.getShapeOrThrow(targetId);
      const summary = target.getInlineSummary();
      header =
        !target.isContainer() && summary
          ? `${target.getTypeName()}#${target.getId()}  ${summary}`
          : `${target.getTypeName()}#${target.getId()}`;
      rootChildren = target.getChildren();
    }

    const rows: Array<{ left: string; right: string; depth: number }> = [];
    TreeFormatter.collectRows(rootChildren, '', 1, rows);

    let maxDepth = 0;
    for (const row of rows) {
      if (row.depth > maxDepth) {
        maxDepth = row.depth;
      }
    }
    const padCol = maxDepth >= 3 ? 29 : 19;

    const lines: string[] = [header];
    for (const row of rows) {
      if (row.right === '') {
        lines.push(row.left);
      } else if (row.left.length < padCol) {
        lines.push(`${row.left.padEnd(padCol, ' ')}${row.right}`);
      } else {
        lines.push(`${row.left} ${row.right}`);
      }
    }
    return lines;
  }

  private static collectRows(
    children: readonly Shape[],
    prefix: string,
    depth: number,
    out: Array<{ left: string; right: string; depth: number }>
  ): void {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const left = `${prefix}${branch}${child.getTypeName()}#${child.getId()}`;
      const right = child.isContainer() ? '' : child.getInlineSummary();
      out.push({ left, right, depth });

      if (child.isContainer() && child.getChildren().length > 0) {
        const nextPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
        TreeFormatter.collectRows(child.getChildren(), nextPrefix, depth + 1, out);
      }
    }
  }

  public static formatShow(doc: SvgDocument, id: string): string[] {
    const shape = doc.getShapeOrThrow(id);
    const parent = shape.getParent();
    const parentDesc =
      parent === null || parent === doc.getRoot() ? 'svg' : `g#${parent.getId()}`;

    const lines: string[] = [
      `${shape.getTypeName()}#${shape.getId()}  parent=${parentDesc}`,
      `  ${shape.getGeometryDetailLine()}`
    ];
    const styleLine = shape.getStyleDetailLine();
    if (styleLine !== undefined) {
      lines.push(`  ${styleLine}`);
    }
    return lines;
  }
}
