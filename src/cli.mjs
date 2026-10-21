#!/usr/bin/env node
// Usage: node src/cli.mjs <github_user> <output.svg> [more outputs...]
// Reads GITHUB_TOKEN and COCKPIT_TELEMETRY_TZ (e.g. America/New_York) from the environment.
// Set COCKPIT_TELEMETRY_STATS to a saved stats JSON to render offline.
import fs from "node:fs";
import path from "node:path";
import { getStats } from "./stats.mjs";
import { buildSvg } from "./render.mjs";

const [user, ...outputs] = process.argv.slice(2).flatMap((a) => a.split("\n")).map((a) => a.trim()).filter(Boolean);
if (!user || !outputs.length) {
  console.error("Usage: node src/cli.mjs <github_user> <output.svg> [more outputs...]");
  process.exit(1);
}

let stats;
try {
  stats = process.env.COCKPIT_TELEMETRY_STATS
    ? JSON.parse(fs.readFileSync(process.env.COCKPIT_TELEMETRY_STATS, "utf8"))
    : await getStats(user, process.env.GITHUB_TOKEN, { timeZone: process.env.COCKPIT_TELEMETRY_TZ || "UTC" });
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
console.log(`${stats.login}: ${stats.contributions} contributions, ${stats.repoCount} repos, ${stats.languages.length} languages`);

for (const file of outputs) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, buildSvg(stats));
  console.log(`wrote ${file}`);
}
