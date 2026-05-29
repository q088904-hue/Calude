/**
 * PPTX archive wrapper over JSZip.
 *
 * A .pptx is a ZIP of (mostly) XML parts. This module loads the archive, exposes
 * read/write of individual entries by path, and re-serializes to a Node Buffer.
 *
 * IMPORTANT: text (XML) parts are read and written as UTF-8 strings so the
 * fix layer can do byte-faithful, scoped value replacement. Binary parts
 * (images under ppt/media/) are never decoded as text.
 */

import JSZip from "jszip";

export class PptxArchive {
  private constructor(private readonly zip: JSZip) {}

  static async load(data: Buffer | ArrayBuffer | Uint8Array): Promise<PptxArchive> {
    const zip = await JSZip.loadAsync(data);
    return new PptxArchive(zip);
  }

  /** All entry paths (files only, not directories). */
  paths(): string[] {
    return Object.keys(this.zip.files).filter((p) => !this.zip.files[p].dir);
  }

  /** Paths matching a RegExp, e.g. /^ppt\/slides\/slide\d+\.xml$/. */
  match(re: RegExp): string[] {
    return this.paths().filter((p) => re.test(p));
  }

  has(path: string): boolean {
    return !!this.zip.files[path] && !this.zip.files[path].dir;
  }

  /** Read an XML/text part as a UTF-8 string. */
  async readText(path: string): Promise<string> {
    const f = this.zip.file(path);
    if (!f) throw new Error(`PPTX entry not found: ${path}`);
    return f.async("string");
  }

  /** Read a binary part (e.g. an image). */
  async readBinary(path: string): Promise<Uint8Array> {
    const f = this.zip.file(path);
    if (!f) throw new Error(`PPTX entry not found: ${path}`);
    return f.async("uint8array");
  }

  /** Overwrite (or create) a text part. */
  writeText(path: string, content: string): void {
    this.zip.file(path, content);
  }

  /** Add (or overwrite) a binary part. */
  writeBinary(path: string, data: Uint8Array | Buffer): void {
    this.zip.file(path, data);
  }

  /** Serialize back to a .pptx Buffer. */
  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  }

  // --- Convenience accessors for common part groups ---

  slidePaths(): string[] {
    return this.match(/^ppt\/slides\/slide\d+\.xml$/).sort();
  }
  slideLayoutPaths(): string[] {
    return this.match(/^ppt\/slideLayouts\/slideLayout\d+\.xml$/).sort();
  }
  slideMasterPaths(): string[] {
    return this.match(/^ppt\/slideMasters\/slideMaster\d+\.xml$/).sort();
  }
  themePaths(): string[] {
    return this.match(/^ppt\/theme\/theme\d+\.xml$/).sort();
  }

  /** Every part where brand fonts/colors may be hard-coded (slides + layouts + masters + themes). */
  styleBearingPaths(): string[] {
    return [
      ...this.slidePaths(),
      ...this.slideLayoutPaths(),
      ...this.slideMasterPaths(),
      ...this.themePaths(),
    ];
  }
}
