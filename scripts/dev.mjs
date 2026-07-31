#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const TARGETS = {
  api: "apps/api",
  admin: "apps/admin-panel",
  dashboard: "apps/store-dashboard",
  storefront: "apps/storefront",
};

const COLORS = {
  api: "\x1b[36m", // cyan
  admin: "\x1b[35m", // magenta
  dashboard: "\x1b[33m", // yellow
  storefront: "\x1b[32m", // green
};
const RESET = "\x1b[0m";

const requestedTarget = process.argv[2];

if (requestedTarget && !TARGETS[requestedTarget]) {
  console.error(
    `Usage: npm run dev [target]\n\nAvailable targets: ${Object.keys(TARGETS).join(", ")}`,
  );
  process.exit(1);
}

function runSingle(name, { prefixed } = { prefixed: false }) {
  const child = spawn(`npm run dev --workspace=${TARGETS[name]}`, {
    stdio: prefixed ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: true,
  });

  if (prefixed) {
    const color = COLORS[name] ?? "";
    const label = `${color}[${name}]${RESET}`;
    for (const stream of [child.stdout, child.stderr]) {
      createInterface({ input: stream }).on("line", (line) => {
        console.log(`${label} ${line}`);
      });
    }
  }

  return child;
}

if (requestedTarget) {
  const child = runSingle(requestedTarget, { prefixed: false });
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  const names = Object.keys(TARGETS);
  const children = names.map((name) => runSingle(name, { prefixed: true }));

  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) child.kill();
  }

  for (const child of children) {
    child.on("exit", (code) => {
      if (!shuttingDown && code !== 0) {
        console.error(`One of the dev servers exited with code ${code}, stopping the rest.`);
      }
      shutdown();
    });
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
