// FR-4.8: lays out the inside message so it always fits the page. Pure, no React imports.
// The font size is estimated from an average character width, which is close enough for the
// app's system font; the page also clips as a last resort.

/** Inner padding of the inside page, as a fraction of the page width (each side). */
export const INSIDE_PAGE_PADDING = 0.1;
export const INSIDE_LINE_HEIGHT = 1.35;
/** Average glyph width as a fraction of the font size (system sans-serif, mixed text). */
const AVERAGE_CHAR_WIDTH = 0.52;
/** Wrapping at word boundaries leaves lines part-empty; assume this much of each line is used. */
const LINE_FILL = 0.85;

/** Largest font size (in points, 0.5 pt steps) at which the message fits a 5:7 page. */
export function getInsideMessageFontSize(message: string, pageWidth: number): number {
  const maxSize = pageWidth * 0.085;
  const minSize = Math.max(6, pageWidth * 0.03);
  const innerWidth = pageWidth * (1 - 2 * INSIDE_PAGE_PADDING);
  const innerHeight = (pageWidth * 7) / 5 - pageWidth * 2 * INSIDE_PAGE_PADDING;
  const paragraphs = message.trim().split('\n');

  for (let size = Math.floor(maxSize * 2) / 2; size > minSize; size -= 0.5) {
    const charsPerLine = Math.max(
      1,
      Math.floor((innerWidth / (size * AVERAGE_CHAR_WIDTH)) * LINE_FILL),
    );
    const lines = paragraphs.reduce(
      (total, paragraph) => total + Math.max(1, Math.ceil(paragraph.length / charsPerLine)),
      0,
    );
    if (lines * size * INSIDE_LINE_HEIGHT <= innerHeight) return size;
  }
  return minSize;
}
