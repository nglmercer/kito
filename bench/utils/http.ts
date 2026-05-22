import config from "../config.ts";
import { spawn } from "node:child_process";

const { duration, connections, pipelining } = config;

export type WrkResult = {
  requests: { average: number };
  latency: { average: number };
  throughput: { average: number };
};

export const runBenchmark = (url: string) => {
  return new Promise<WrkResult>((resolve, reject) => {
    const args = [
        "dlx", "autocannon",
        "-c", String(connections),
        "-p", String(pipelining),
        "-d", String(duration),
        "--json",
        url
    ];

    let stdout = "";
    const child = spawn("pnpm", args);

    child.stdout.on("data", (data) => {
        stdout += data.toString();
    });

    child.on("close", (code) => {
        if (code !== 0) {
            reject(new Error("autocannon failed"));
            return;
        }

        try {
            const result = JSON.parse(stdout);
            resolve({
                requests: { average: result.requests.average },
                latency: { average: result.latency.average },
                throughput: { average: result.throughput.average },
            });
        } catch (e) {
            reject(e);
        }
    });
  });
};
