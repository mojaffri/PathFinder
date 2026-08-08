import mammoth from "mammoth";

/**
 * mammoth reads the DOCX's own paragraph/run structure rather than
 * rasterizing layout the way PDF extraction has to, so unlike
 * `pdf-text.ts` the output rarely needs `reassembleLines`' mid-sentence
 * stitching — it's still run through that pass anyway for one shared
 * normalization path, and it's a safe no-op on already-clean paragraphs.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}
