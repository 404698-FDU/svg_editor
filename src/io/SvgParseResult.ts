import type { SvgDocument } from '../model/SvgDocument';

/**
 * Value object holding the parsed SvgDocument and any auto-assigned ID warnings.
 */
export class SvgParseResult {
  constructor(
    public readonly document: SvgDocument,
    public readonly warnings: string[]
  ) {}
}
