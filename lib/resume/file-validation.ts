export const MAX_RESUME_FILE_SIZE = 8 * 1024 * 1024; // 8MB

export type ResumeFileType = "pdf" | "docx";

const PDF_MAGIC = Buffer.from("%PDF-", "ascii");
// DOCX (and every other OOXML/zip-based format) starts with the local-file
// zip signature "PK\x03\x04" — not a full format parse, but enough to catch
// a mislabeled/renamed non-DOCX file without pulling in a whole zip parser.
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const MIME_BY_TYPE: Record<ResumeFileType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function detectFileTypeFromMagicBytes(buffer: Buffer): ResumeFileType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC)) return "pdf";
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(ZIP_MAGIC)) return "docx";
  return null;
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export type FileValidationResult =
  | { ok: true; fileType: ResumeFileType; contentType: string }
  | { ok: false; status: number; error: string };

/**
 * Layered validation: declared MIME + extension must agree on a supported
 * type, the size cap applies before anything else is checked, and finally
 * the file's own magic bytes must actually match the declared type — a
 * client-supplied Content-Type/extension is not proof of file content, so
 * this is the check that actually catches a mislabeled/corrupt upload
 * instead of trusting what the browser sent.
 */
export function validateResumeFile(file: { name: string; type: string; size: number }, buffer: Buffer): FileValidationResult {
  if (file.size > MAX_RESUME_FILE_SIZE) {
    return { ok: false, status: 413, error: "That file is too large. Please upload a PDF or DOCX under 8MB." };
  }

  const ext = extensionOf(file.name);
  const declaredType: ResumeFileType | null =
    file.type === MIME_BY_TYPE.pdf || ext === ".pdf"
      ? "pdf"
      : file.type === MIME_BY_TYPE.docx || ext === ".docx"
        ? "docx"
        : null;

  if (!declaredType) {
    return { ok: false, status: 400, error: "Please upload a PDF or DOCX file." };
  }
  if (ext !== `.${declaredType}`) {
    return { ok: false, status: 400, error: `That file's extension doesn't match a ${declaredType.toUpperCase()} file.` };
  }

  const actualType = detectFileTypeFromMagicBytes(buffer);
  if (actualType === null || actualType !== declaredType) {
    return { ok: false, status: 422, error: "That file doesn't look like a valid PDF or DOCX — it may be corrupted or mislabeled." };
  }

  return { ok: true, fileType: actualType, contentType: MIME_BY_TYPE[actualType] };
}
