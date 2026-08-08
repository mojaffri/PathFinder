import { describe, expect, it } from "vitest";
import { MAX_RESUME_FILE_SIZE, validateResumeFile } from "@/lib/resume/file-validation";

const PDF_BYTES = Buffer.from("%PDF-1.7 rest of a fake pdf");
const DOCX_BYTES = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("fake docx bytes")]);
const TEXT_BYTES = Buffer.from("just some plain text, not a real document");

describe("validateResumeFile", () => {
  it("accepts a well-formed PDF (matching name, mime, and magic bytes)", () => {
    const result = validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: PDF_BYTES.length }, PDF_BYTES);
    expect(result.ok).toBe(true);
  });

  it("accepts a well-formed DOCX (matching name, mime, and magic bytes)", () => {
    const result = validateResumeFile(
      { name: "resume.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: DOCX_BYTES.length },
      DOCX_BYTES,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a file over the size cap before checking content", () => {
    const result = validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: MAX_RESUME_FILE_SIZE + 1 }, PDF_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(413);
  });

  it("rejects an unsupported file type", () => {
    const result = validateResumeFile({ name: "resume.txt", type: "text/plain", size: TEXT_BYTES.length }, TEXT_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rejects a mismatched extension/mime pair", () => {
    const result = validateResumeFile({ name: "resume.docx", type: "application/pdf", size: PDF_BYTES.length }, PDF_BYTES);
    expect(result.ok).toBe(false);
  });

  it("rejects a file whose magic bytes don't match its declared type (mislabeled/corrupted upload)", () => {
    const result = validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: TEXT_BYTES.length }, TEXT_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });

  it("rejects a renamed DOCX pretending to be a PDF, even with a matching extension/mime lie", () => {
    // A file that's actually a DOCX (zip magic bytes) but claims .pdf/application/pdf —
    // exactly the "client-declared Content-Type is not proof of content" case.
    const result = validateResumeFile({ name: "resume.pdf", type: "application/pdf", size: DOCX_BYTES.length }, DOCX_BYTES);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(422);
  });
});
