/**
 * Deterministic, best-effort dependency-name extraction from a handful of
 * well-known manifest formats. Deliberately not a real parser for every
 * ecosystem (no TOML/lockfile grammar) — "do not attempt perfect static
 * analysis" per the task spec. Returns lowercased package names; callers
 * match against a known-technology list, so false positives from a loose
 * regex are harmless (they just never match anything meaningful).
 */

export const MANIFEST_FILE_NAMES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "go.mod",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "Cargo.toml",
] as const;

function parsePackageJson(content: string): string[] {
  try {
    const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    return Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) });
  } catch {
    return [];
  }
}

function parseRequirementsTxt(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => line.split(/[=<>~!;\s[]/)[0].trim().toLowerCase())
    .filter(Boolean);
}

function parsePyprojectToml(content: string): string[] {
  // Matches lines like `requests = "^2.31"` or `fastapi = { version = "..." }`
  // inside a dependencies table — loose by design.
  return [...content.matchAll(/^([a-zA-Z][a-zA-Z0-9_.-]*)\s*=\s*[{"^~]/gm)].map((m) => m[1].toLowerCase());
}

function parseGoMod(content: string): string[] {
  return [...content.matchAll(/^\s*([a-zA-Z0-9_.\-/]+)\s+v[\d.]/gm)].map((m) => m[1].toLowerCase());
}

function parseGemfile(content: string): string[] {
  return [...content.matchAll(/gem\s+["']([a-zA-Z0-9_-]+)["']/g)].map((m) => m[1].toLowerCase());
}

function parseCargoToml(content: string): string[] {
  return [...content.matchAll(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*=\s*[{"0-9^~]/gm)].map((m) => m[1].toLowerCase());
}

export function extractManifestDependencies(fileName: string, content: string): string[] {
  const base = fileName.split("/").pop()?.toLowerCase() ?? "";
  switch (base) {
    case "package.json":
      return parsePackageJson(content);
    case "requirements.txt":
      return parseRequirementsTxt(content);
    case "pyproject.toml":
      return parsePyprojectToml(content);
    case "go.mod":
      return parseGoMod(content);
    case "gemfile":
      return parseGemfile(content);
    case "cargo.toml":
      return parseCargoToml(content);
    default:
      return [];
  }
}
