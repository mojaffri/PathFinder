import type { DetectedSignal, DetectorKey } from "@/types";

/**
 * Deterministic engineering-signal detectors — every one operates purely on
 * a repo's file-tree paths + parsed manifest dependency names, never on
 * stars/forks/commit count (per the task's explicit instruction that
 * popularity metrics must never stand in for engineering quality). Each
 * detector explains exactly what triggered it in `evidence[]` rather than
 * returning a bare boolean, and "not detected" is a completely valid,
 * expected result — this is intentionally not exhaustive static analysis.
 */

const README_RE = /^readme(\.md|\.rst|\.txt)?$/i;
const TEST_DIR_RE = /(^|\/)(__tests__|tests?|spec)(\/|$)/i;
const TEST_CONFIG_FILES = new Set([
  "jest.config.js", "jest.config.ts", "jest.config.mjs", "jest.config.cjs",
  "vitest.config.ts", "vitest.config.js", "vitest.config.mts",
  "playwright.config.ts", "playwright.config.js",
  "pytest.ini", "tox.ini", "phpunit.xml", "phpunit.xml.dist",
]);
const TEST_DEPS = new Set(["jest", "vitest", "mocha", "pytest", "playwright", "@testing-library/react", "cypress", "jasmine", "chai", "unittest2", "nose"]);

const CI_WORKFLOW_RE = /^\.github\/workflows\/.+\.ya?ml$/i;

const DOCKER_FILES = new Set(["dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]);

const DEPLOY_FILES = new Set(["vercel.json", "netlify.toml", "fly.toml", "render.yaml", "procfile", "app.yaml", "now.json"]);

const DB_DEPS = new Set(["prisma", "@prisma/client", "drizzle-orm", "@supabase/supabase-js", "pg", "mysql2", "mongoose", "sqlalchemy", "psycopg2", "psycopg2-binary", "knex", "typeorm", "sequelize", "redis", "pymongo"]);
const DB_FILE_RE = /prisma\/schema\.prisma$|drizzle\.config\.|(^|\/)migrations\//i;

const BACKEND_DEPS = new Set(["express", "fastify", "koa", "next", "fastapi", "flask", "django", "@nestjs/core", "gin-gonic", "echo", "rails"]);
const API_ROUTE_DIR_RE = /(^|\/)(app|pages)\/api\/|(^|\/)routes\//i;

function fileName(path: string): string {
  return path.split("/").pop()?.toLowerCase() ?? "";
}

function detectReadme(paths: string[]): DetectedSignal {
  const hit = paths.find((p) => !p.includes("/") && README_RE.test(fileName(p)));
  return { key: "readme", label: "README present", detected: !!hit, confidence: hit ? "high" : "low", evidence: hit ? [hit] : [] };
}

function detectTesting(paths: string[], manifestDeps: string[]): DetectedSignal {
  const testDirs = paths.filter((p) => TEST_DIR_RE.test(p));
  const testConfigs = paths.filter((p) => TEST_CONFIG_FILES.has(fileName(p)));
  const testDeps = manifestDeps.filter((d) => TEST_DEPS.has(d));
  const evidence = [...testConfigs, ...testDirs.slice(0, 3), ...testDeps.map((d) => `dependency: ${d}`)];

  const detected = evidence.length > 0;
  const confidence: DetectedSignal["confidence"] = testConfigs.length > 0 || testDeps.length > 0 ? "high" : testDirs.length > 0 ? "medium" : "low";
  return { key: "testing", label: "Automated tests", detected, confidence, evidence: evidence.slice(0, 6) };
}

function detectCiCd(paths: string[]): DetectedSignal {
  const workflows = paths.filter((p) => CI_WORKFLOW_RE.test(p));
  return { key: "cicd", label: "CI/CD (GitHub Actions)", detected: workflows.length > 0, confidence: workflows.length > 0 ? "high" : "low", evidence: workflows.slice(0, 5) };
}

function detectDocker(paths: string[]): DetectedSignal {
  const hits = paths.filter((p) => DOCKER_FILES.has(fileName(p)));
  return { key: "docker", label: "Docker / containerization", detected: hits.length > 0, confidence: hits.length > 0 ? "high" : "low", evidence: hits };
}

function detectDeployment(paths: string[]): DetectedSignal {
  const configHits = paths.filter((p) => DEPLOY_FILES.has(fileName(p)));
  const dockerHits = paths.filter((p) => DOCKER_FILES.has(fileName(p)));
  const evidence = [...configHits, ...dockerHits];
  return {
    key: "deployment",
    label: "Deployment configuration",
    detected: evidence.length > 0,
    confidence: configHits.length > 0 ? "high" : dockerHits.length > 0 ? "medium" : "low",
    evidence: evidence.slice(0, 5),
  };
}

function detectDatabase(paths: string[], manifestDeps: string[]): DetectedSignal {
  const depHits = manifestDeps.filter((d) => DB_DEPS.has(d));
  const fileHits = paths.filter((p) => DB_FILE_RE.test(p));
  const evidence = [...depHits.map((d) => `dependency: ${d}`), ...fileHits.slice(0, 3)];
  return {
    key: "database",
    label: "Database / persistence",
    detected: evidence.length > 0,
    confidence: depHits.length > 0 && fileHits.length > 0 ? "high" : evidence.length > 0 ? "medium" : "low",
    evidence: evidence.slice(0, 6),
  };
}

function detectBackendApi(paths: string[], manifestDeps: string[]): DetectedSignal {
  const depHits = manifestDeps.filter((d) => BACKEND_DEPS.has(d));
  const routeHits = paths.filter((p) => API_ROUTE_DIR_RE.test(p));
  const evidence = [...depHits.map((d) => `dependency: ${d}`), ...routeHits.slice(0, 3)];
  return {
    key: "backendApi",
    label: "Backend / API framework",
    detected: evidence.length > 0,
    confidence: depHits.length > 0 ? "high" : routeHits.length > 0 ? "medium" : "low",
    evidence: evidence.slice(0, 6),
  };
}

export function runAllDetectors(paths: string[], manifestDeps: string[]): DetectedSignal[] {
  return [
    detectReadme(paths),
    detectTesting(paths, manifestDeps),
    detectCiCd(paths),
    detectDocker(paths),
    detectDeployment(paths),
    detectDatabase(paths, manifestDeps),
    detectBackendApi(paths, manifestDeps),
  ];
}

export type { DetectorKey };
