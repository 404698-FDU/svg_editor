import { SvgDocument } from '../model/SvgDocument';
import { ShapeFactory } from '../model/ShapeFactory';
import { SvgParseResult } from './SvgParseResult';

/**
 * Parses an SVG XML text into an SvgDocument instance.
 * Delegates shape instantiation to ShapeFactory so SvgParser has zero dependency on concrete Shape subclasses.
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
        const attrs = SvgParser.parseAttributes(match[1]);
        const content = match[2];
        const id = allocateId('text', attrs.get('id'));
        const shape = ShapeFactory.createFromSvgElement('text', id, attrs, content);
        doc.addShape(shape, currentContainerId);
        continue;
      }

      const tag = match[3].toLowerCase();
      const attrs = SvgParser.parseAttributes(match[4]);
      const isSelfClosing = match[5] === '/';
      const id = allocateId(tag, attrs.get('id'));
      const shape = ShapeFactory.createFromSvgElement(tag, id, attrs);
      doc.addShape(shape, currentContainerId);

      if (tag === 'g' && !isSelfClosing) {
        containerStack.push(id);
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
