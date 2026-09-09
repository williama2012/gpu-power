#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOG_DIR = __dirname;
const LOG_FILE = path.join(LOG_DIR, "gpu-power.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logGpuPower() {
  ensureLogDir();

  let output;
  try {
    output = execFileSync("nvidia-smi", [
      "--query-gpu=name,power.draw",
      "--format=csv,noheader,nounits",
    ], {
      encoding: "utf-8",
      timeout: 10000,
    });
  } catch (err) {
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] ERROR: ${err.message}\n`);
    console.error("nvidia-smi failed:", err.message);
    process.exit(1);
  }

  const lines = output.trim().split("\n").filter(Boolean);
  const ts = new Date().toISOString();

  if (lines.length === 0) {
    fs.appendFileSync(LOG_FILE, `[${ts}] No GPUs found.\n`);
    console.log("No GPUs detected.");
    return;
  }

  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const power = parts[1].trim();
      const entry = `[${ts}] ${name}: ${power} W\n`;
      fs.appendFileSync(LOG_FILE, entry);
      console.log(`${name}: ${power} W`);
    }
  }
}

logGpuPower();
