/**
 * Lexical tokenizer for CLI input lines.
 * Strips '#' comment lines and splits whitespace-delimited tokens while preserving
 * double-quoted strings containing spaces.
 */
export class CommandTokenizer {
  public static tokenize(rawLine: string): string[] {
    const trimmed = rawLine.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      return [];
    }

    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteStarted = false;

    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];

      if (ch === '"') {
        if (inQuotes) {
          inQuotes = false;
          tokens.push(current);
          current = '';
          quoteStarted = false;
        } else {
          inQuotes = true;
          quoteStarted = true;
        }
        continue;
      }

      if (inQuotes) {
        if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          current += ch;
        }
        continue;
      }

      if (/\s/.test(ch)) {
        if (current.length > 0 || quoteStarted) {
          tokens.push(current);
          current = '';
          quoteStarted = false;
        }
      } else {
        current += ch;
      }
    }

    if (inQuotes) {
      throw new Error('error: unterminated quoted string');
    }

    if (current.length > 0) {
      tokens.push(current);
    }

    return tokens;
  }
}
