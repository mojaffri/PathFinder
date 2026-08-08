import { extractText, getDocumentProxy } from "unpdf";

/**
 * unpdf ships its own serverless build of pdf.js with no worker thread and
 * no dynamic requires, so it runs cleanly inside a bundled Next.js route
 * handler — unlike pdf-parse, whose worker-loading (v2) and dynamic
 * `require` (v1) both broke under Turbopack's bundling.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}
