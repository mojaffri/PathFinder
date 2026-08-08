import type { GpaInfo, GpaScale } from "@/types";

/**
 * Estimates a 4.0-scale equivalent for display/comparison purposes only.
 * These are rough, commonly-used approximations — schools vary in how they
 * convert GPA scales, so this is never presented as an exact conversion.
 */
export function normalizeGpaTo4(raw: number | null, scale: GpaScale): number | null {
  if (raw === null || Number.isNaN(raw)) return null;

  switch (scale) {
    case "4.0":
      return clamp(raw, 0, 4.3);
    case "5.0":
      return clamp((raw / 5) * 4, 0, 4.0);
    case "100":
      return percentTo4Estimate(raw);
    case "other":
      return null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Common (but not universal) US percentage-to-4.0 approximation.
function percentTo4Estimate(percent: number): number | null {
  if (percent < 0 || percent > 100) return null;
  if (percent >= 97) return 4.0;
  if (percent >= 93) return 3.7;
  if (percent >= 90) return 3.3;
  if (percent >= 87) return 3.0;
  if (percent >= 83) return 2.7;
  if (percent >= 80) return 2.3;
  if (percent >= 77) return 2.0;
  if (percent >= 73) return 1.7;
  if (percent >= 70) return 1.3;
  if (percent >= 65) return 1.0;
  return 0.0;
}

export function buildGpaInfo(raw: number | null, scale: GpaScale): GpaInfo {
  return { raw, scale, normalized4: normalizeGpaTo4(raw, scale) };
}

export function formatGpa(gpa: GpaInfo): string {
  if (gpa.raw === null) return "Not provided";
  const scaleLabel = gpa.scale === "100" ? "%" : `/ ${gpa.scale}`;
  const estimate = gpa.scale !== "4.0" && gpa.normalized4 != null ? ` (≈${gpa.normalized4?.toFixed(1) ?? "N/A"}/4.0 est.)` : "";
  return `${gpa.raw} ${scaleLabel}${estimate}`;
}
