/**
 * PPTX utilities — extract a thumbnail/preview image from a .pptx file
 * so it can be shown in the preview panel and sent to the AI for analysis.
 *
 * .pptx files are ZIP archives containing:
 *  - docProps/thumbnail.jpeg  (a pre-rendered thumbnail, usually 256×192)
 *  - ppt/media/*              (embedded media)
 *  - ppt/slides/slide1.xml    (first slide markup)
 */

import JSZip from "jszip";

export type PptxExtractResult = {
  /** data URL of the extracted preview image (image/jpeg or image/png) */
  preview: string;
  /** mime type of the extracted preview */
  mediaType: "image/jpeg" | "image/png";
  /** count of slides detected */
  slideCount: number;
};

const MIME_PPTX =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const MIME_PPT = "application/vnd.ms-powerpoint";

export function isPptx(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === MIME_PPTX || name.endsWith(".pptx");
}

export function isLegacyPpt(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    (file.type === MIME_PPT && !name.endsWith(".pptx")) || name.endsWith(".ppt")
  );
}

export function isPresentation(file: File): boolean {
  return isPptx(file) || isLegacyPpt(file);
}

/**
 * Extract a preview image from a .pptx file.
 * Strategy:
 *   1. Try docProps/thumbnail.jpeg (always present in files created by
 *      PowerPoint, Keynote, Google Slides, LibreOffice, etc).
 *   2. Fall back to the first embedded media image.
 *   3. If neither is present, throw so the caller can surface a friendly error.
 */
export async function extractPptxPreview(file: File): Promise<PptxExtractResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Count slides
  const slideFiles = Object.keys(zip.files).filter((p) =>
    /^ppt\/slides\/slide\d+\.xml$/i.test(p)
  );
  const slideCount = slideFiles.length;

  // 1. Prefer the pre-rendered thumbnail
  const thumbCandidates = [
    "docProps/thumbnail.jpeg",
    "docProps/thumbnail.jpg",
    "docProps/thumbnail.png",
  ];
  for (const path of thumbCandidates) {
    const entry = zip.file(path);
    if (entry) {
      const blob = await entry.async("blob");
      const mediaType = path.endsWith(".png") ? "image/png" : "image/jpeg";
      const typed = new Blob([blob], { type: mediaType });
      const dataUrl = await blobToDataUrl(typed);
      return { preview: dataUrl, mediaType, slideCount };
    }
  }

  // 2. Fall back to the first embedded media image
  const mediaPaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/media\/.*\.(jpe?g|png)$/i.test(p))
    .sort();
  if (mediaPaths.length > 0) {
    const entry = zip.file(mediaPaths[0])!;
    const blob = await entry.async("blob");
    const mediaType: "image/jpeg" | "image/png" = /\.png$/i.test(mediaPaths[0])
      ? "image/png"
      : "image/jpeg";
    const typed = new Blob([blob], { type: mediaType });
    const dataUrl = await blobToDataUrl(typed);
    return { preview: dataUrl, mediaType, slideCount };
  }

  throw new Error(
    "No preview image could be extracted from this presentation. Try exporting it as PNG, JPG, or PDF."
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
