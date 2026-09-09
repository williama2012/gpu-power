#!/usr/bin/env node

const { execFileSync } = require("child_process");
const { MongoClient } = require("mongodb");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "ai_logs";
const collectionName = process.env.COLLECTION_NAME || "power_logs";

async function logGpuPower() {
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
    console.error("nvidia-smi failed:", err.message);
    process.exit(1);
  }

  const lines = output.trim().split("\n").filter(Boolean);
  const timestamp = new Date();

  if (lines.length === 0) {
    console.log("No GPUs detected.");
    return;
  }

  const gpuName = [];
  const gpuDraw = [];

  for (const line of lines) {
    const parts = line.split(",");
    if (parts.length >= 2) {
      gpuName.push(parts[0].trim());
      gpuDraw.push(parseFloat(parts[1].trim()));
    }
  }

  const record = {
    _id: timestamp.toISOString(),
    timestamp: timestamp,
    draw: gpuDraw.reduce((a, b) => a + b, 0),
    gpu_name: gpuName,
    gpu_draw: gpuDraw,
  };

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.insertOne(record);
    console.log("Recorded:", JSON.stringify(record));
  } finally {
    await client.close();
  }
}

logGpuPower();
