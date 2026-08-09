export function exceedsContentLength(request: Request, maxBytes: number): boolean {
  const header = request.headers.get("content-length");
  if (!header) return false;
  const length = Number(header);
  return Number.isFinite(length) && length > maxBytes;
}
