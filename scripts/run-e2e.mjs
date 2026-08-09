import { spawn } from "node:child_process";
import { resolve } from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const externalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL);
let server = null;

function runNode(script, args, env = process.env) {
  return spawn(process.execPath, [script, ...args], { cwd: process.cwd(), env, stdio: "inherit", windowsHide: true });
}

async function waitUntilReady(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error(`Production server did not become ready at ${url}.`);
}

function exitCode(child) {
  return new Promise((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(code ?? (signal ? 1 : 0)));
  });
}

try {
  if (!externalServer) {
    server = runNode(resolve("node_modules/next/dist/bin/next"), ["start"]);
    await waitUntilReady(baseURL);
  }
  const runner = runNode(resolve("node_modules/@playwright/test/cli.js"), ["test"], { ...process.env, PLAYWRIGHT_BASE_URL: baseURL });
  process.exitCode = await exitCode(runner);
} finally {
  if (server && !server.killed) {
    server.kill("SIGTERM");
    await Promise.race([exitCode(server), new Promise((resolveWait) => setTimeout(resolveWait, 5000))]);
    if (!server.killed) server.kill("SIGKILL");
  }
}
