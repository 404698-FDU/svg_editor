import { SvgDocument } from '../model/SvgDocument';
import { RectShape } from '../model/RectShape';
import { CircleShape } from '../model/CircleShape';
import { EllipseShape } from '../model/EllipseShape';
import { LineShape } from '../model/LineShape';
import { TextShape } from '../model/TextShape';
import { GroupShape } from '../model/GroupShape';
import { SvgParseResult } from './SvgParseResult';

/**
 * Parses an SVG XML text into an SvgDocument instance.
 * Automatically assigns unique '<tag><seq>' IDs to unnamed elements and collects warning messages.
 */
export class SvgParser {
  public static parse(xmlContent: string, filePath?: string): SvgParseResult {
    const cleaned = xmlContent
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();

    const svgOpenMatch = /<svg\b([^>]*)>/i.exec(cleaned);
    if (!svgOpenMatch || !/<\/svg\s*>/i.test(cleaned)) {
      throw new Error(`error: cannot read file: ${filePath ?? 'invalid svg'}`);
    }

    const svgAttrs = SvgParser.parseAttributes(svgOpenMatch[1]);
    const width = svgAttrs.get('width') ? Number(svgAttrs.get('width')) : 800;
    const height = svgAttrs.get('height') ? Number(svgAttrs.get('height')) : 600;
    const doc = new SvgDocument(width, height, filePath);
    const warnings: string[] = [];

    // Pre-collect all explicit IDs in the file to avoid auto-ID collisions
    const reservedIds = new Set<string>();
    const idRegex = /\bid\s*=\s*"([^"]+)"/g;
    let idMatch: RegExpExecArray | null;
    while ((idMatch = idRegex.exec(cleaned)) !== null) {
      reservedIds.add(idMatch[1]);
    }
    const tagCounters = new Map<string, number>();

    const allocateId = (tag: string, explicitId?: string): string => {
      if (explicitId && explicitId.trim() !== '') {
        reservedIds.add(explicitId);
        return explicitId;
      }
      let seq = (tagCounters.get(tag) ?? 0) + 1;
      while (reservedIds.has(`${tag}${seq}`) || doc.hasId(`${tag}${seq}`)) {
        seq++;
      }
      tagCounters.set(tag, seq);
      const assigned = `${tag}${seq}`;
      reservedIds.add(assigned);
      warnings.push(`warning: assigned id ${assigned} to unnamed <${tag}>`);
      return assigned;
    };

    const innerStart = svgOpenMatch.index + svgOpenMatch[0].length;
    const innerEnd = cleaned.lastIndexOf('</svg');
    const body = cleaned.slice(innerStart, innerEnd);

    const containerStack: (string | undefined)[] = [undefined];
    const tokenRegex =
      /<text\b([^>]*)>([\s\S]*?)<\/text\s*>|<\/g\s*>|<(g|rect|circle|ellipse|line)\b([^>]*?)(\/?)>/gi;

    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(body)) !== null) {
      const fullToken = match[0];

      if (/^<\/g/i.test(fullToken)) {
        if (containerStack.length > 1) {
          containerStack.pop();
        }
        continue;
      }

      const currentContainerId = containerStack[containerStack.length - 1];

      if (match[1] !== undefined) {
        // <text ...>content</text>
        const attrs = SvgParser.parseAttributes(match[1]);
        const content = match[2];
        const id = allocateId('text', attrs.get('id'));
        const x = Number(attrs.get('x') ?? 0);
        const y = Number(attrs.get('y') ?? 0);
        const shape = new TextShape(
          id,
          x,
          y,
          content,
          attrs.get('fill'),
          attrs.get('stroke'),
          attrs.get('stroke-width')
        );
        doc.addShape(shape, currentContainerId);
        continue;
      }

      const tag = match[3].toLowerCase();
      const attrs = SvgParser.parseAttributes(match[4]);
      const isSelfClosing = match[5] === '/';
      const id = allocateId(tag, attrs.get('id'));
      const fill = attrs.get('fill');
      const stroke = attrs.get('stroke');
      const strokeWidth = attrs.get('stroke-width');

      if (tag === 'g') {
        const group = new GroupShape(id, fill, stroke, strokeWidth);
        doc.addShape(group, currentContainerId);
        if (!isSelfClosing) {
          containerStack.push(id);
        }
      } else if (tag === 'rect') {
        const rect = new RectShape(
          id,
          Number(attrs.get('x') ?? 0),
          Number(attrs.get('y') ?? 0),
          Number(attrs.get('width') ?? 0),
          Number(attrs.get('height') ?? 0),
          fill,
          stroke,
          strokeWidth
        );
        doc.addShape(rect, currentContainerId);
      } else if (tag === 'circle') {
        const circle = new CircleShape(
          id,
          Number(attrs.get('cx') ?? 0),
          Number(attrs.get('cy') ?? 0),
          Number(attrs.get('r') ?? 0),
          fill,
          stroke,
          strokeWidth
        );
        doc.addShape(circle, currentContainerId);
      } else if (tag === 'ellipse') {
        const ellipse = new EllipseShape(
          id,
          Number(attrs.get('cx') ?? 0),
          Number(attrs.get('cy') ?? 0),
          Number(attrs.get('rx') ?? 0),
          Number(attrs.get('ry') ?? 0),
          fill,
          stroke,
          strokeWidth
        );
        doc.addShape(ellipse, currentContainerId);
      } else if (tag === 'line') {
        const line = new LineShape(
          id,
          Number(attrs.get('x1') ?? 0),
          Number(attrs.get('y1') ?? 0),
          Number(attrs.get('x2') ?? 0),
          Number(attrs.get('y2') ?? 0),
          stroke,
          fill,
          strokeWidth
        );
        doc.addShape(line, currentContainerId);
      }
    }

    return new SvgParseResult(doc, warnings);
  }

  private static parseAttributes(rawAttrs: string): Map<string, string> {
    const map = new Map<string, string>();
    const attrRegex = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = attrRegex.exec(rawAttrs)) !== null) {
      map.set(m[1], m[2]);
    }
    return map;
  }
}
