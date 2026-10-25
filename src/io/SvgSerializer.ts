import type { SvgDocument } from '../model/SvgDocument';

/**
 * Serializes an SvgDocument into a standard SVG 1.1 XML string.
 */
export class SvgSerializer {
  public static serialize(doc: SvgDocument): string {
    const w = doc.getWidth();
    const h = doc.getHeight();
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    ];
    for (const child of doc.getRoot().getChildren()) {
      lines.push(...child.toSvgLines(1));
    }
    lines.push('</svg>');
    return lines.join('\n') + '\n';
  }
}
