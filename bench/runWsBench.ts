import { runWsBenchmark } from "./utils/ws.ts";
import config from "./config.ts";
import { waitForServerReady } from "./utils/wait.ts";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { hostname } = config;
const PROJECT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const PNPM_BIN = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const RUNNER_ENTRY = path.join(PROJECT_ROOT, "utils", "frameworkRunner.ts");

async function main() {
  const frameworks = ["kito", "bun"];
  const duration = 10;
  const connections = 50;

  console.log(`Running WS benchmark: ${connections} connections for ${duration}s\n`);

  for (const framework of frameworks) {
    const port = 4000;
    try {
      spawn("kill", ["$(lsof -t -i :4000)"], { shell: true });
    } catch {}
    const runtime = framework === "bun" ? "bun" : "node";

    console.log(`Starting ${framework} on ${runtime}...`);

    let child: ChildProcess;
    if (runtime === "node") {
      child = spawn(
        PNPM_BIN,
        ["dlx", "tsx", RUNNER_ENTRY, "ws", framework, String(port)],
        {
          stdio: "inherit",
          cwd: PROJECT_ROOT,
        },
      );
    } else {
      child = spawn(
        PNPM_BIN,
        ["dlx", "bun", "run", RUNNER_ENTRY, "ws", framework, String(port)],
        {
          stdio: "inherit",
          cwd: PROJECT_ROOT,
        },
      );
    }

    await waitForServerReady(port);

    console.log(`Benchmarking ${framework}...`);
    const url = `ws://${hostname}:${port}/ws`;
    const result = await runWsBenchmark(url, duration, connections);

    console.log(`${framework} results:`);
    console.log(`  Messages/sec: ${result.messagesPerSec.toFixed(2)}`);
    console.log(`  Avg Latency:  ${result.latencyAvg.toFixed(2)}ms\n`);

    child.kill();
    await new Promise((r) => setTimeout(r, 1000));
  }
}

main().catch(console.error);
