#!/usr/bin/env node

const { execFileSync } = require('child_process');
const { MongoClient } = require('mongodb');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'ai_logs';
const collectionName = process.env.COLLECTION_NAME || 'power_logs';

let client;
let db;
let collection;
let output;
let lines = [];
let gpuName = [];
let gpuDraw = [];
let intervalId;

async function logGpuPower() {
  try {
    output = execFileSync('nvidia-smi', [
      '--query-gpu=name,power.draw',
      '--format=csv,noheader,nounits',
    ], {
      encoding: 'utf-8',
      timeout: 10000,
    });
  } catch (err) {
    console.error('nvidia-smi failed:', err.message);
    return;
  }

  lines = output.trim().split('\n').filter(Boolean);
  
  if (lines.length === 0) {
    console.log('No GPUs detected.');
    return;
  }

  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 2) {
      gpuName.push(parts[0].trim());
      gpuDraw.push(parseFloat(parts[1].trim()));
    }
  }

  const record = {
    timestamp: new Date(),
    draw: gpuDraw.reduce((a, b) => a + b, 0),
    gpu_name: gpuName,
    gpu_draw: gpuDraw,
  };

  output = null;
  lines = [];
  gpuName = [];
  gpuDraw = [];

  try {
    await collection.insertOne(record);
    //console.log(timestamp);
  } catch (err) {
    console.error('MongoDB insert failed:', err.message);
  }
}

async function main() {
  client = new MongoClient(uri);
  try {
    await client.connect();
    db = client.db(dbName);
    collection = db.collection(collectionName);
    intervalId = setInterval(logGpuPower, 1000);
    console.log("GPU Power Logging Started");

  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

const cleanup = async (signal) => {
  console.log(`Received ${signal}, shutting down...`);
  if (intervalId) {
    clearInterval(intervalId);
    console.log("Interval cleared.");
  }
  if (client) {
    await client.close();
    console.log('Database connection closed.');
  }
  process.exit(0);
};

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

process.title = "gpu power logging";
main();
