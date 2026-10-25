import type { SvgDocument } from '../model/SvgDocument';

/**
 * Holds the currently active SvgDocument for the session.
 * Enforces the 'no document' invariant before 'init' or 'read' is executed.
 */
export class DocumentContext {
  private currentDocument: SvgDocument | null = null;

  public hasDocument(): boolean {
    return this.currentDocument !== null;
  }

  public getDocumentOrThrow(): SvgDocument {
    if (!this.currentDocument) {
      throw new Error("error: no document. use 'init' or 'read' first");
    }
    return this.currentDocument;
  }

  public setDocument(doc: SvgDocument): void {
    this.currentDocument = doc;
  }
}
