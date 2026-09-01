#!/usr/bin/env node
// Relève la file d'impression de Barda et dépose les PNG dans la file locale
// de fichero-printer, que spooler.sh envoie à la D11s.
//
//   BARDA_URL=https://barda.example.com BARDA_PRINT_TOKEN=… node scripts/spool.mjs
//
// À lancer à côté de `~/MCP/fichero-printer/spooler.sh`, qui fait l'impression.

import { writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const URL_BASE = process.env.BARDA_URL || "http://localhost:3210";
const TOKEN = process.env.BARDA_PRINT_TOKEN || "";
const QUEUE = process.env.FICHERO_QUEUE || join(homedir(), "MCP/fichero-printer/queue");
const EVERY = Number(process.env.BARDA_POLL_MS || 5000);

if (!TOKEN) {
  console.error("BARDA_PRINT_TOKEN manquant — même valeur que côté serveur.");
  process.exit(1);
}

await mkdir(QUEUE, { recursive: true });
console.log(`[barda-spool] ${URL_BASE} → ${QUEUE}, toutes les ${EVERY / 1000}s`);

const stamp = () => new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

async function tick() {
  const r = await fetch(`${URL_BASE}/api/print-queue`, { headers: { "x-barda-token": TOKEN } });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  const { jobs } = await r.json();
  if (!jobs?.length) return;

  const done = [];
  for (const job of jobs) {
    const png = Buffer.from(job.png.split(",")[1], "base64");
    const slug = String(job.label).replace(/[^\w.-]+/g, "-").slice(0, 40);
    for (let c = 0; c < (job.copies || 1); c++) {
      await writeFile(join(QUEUE, `${stamp()}-${job.id}-${c}-${slug}.png`), png);
    }
    done.push(job.id);
    console.log(`[barda-spool] ${job.label} × ${job.copies || 1}`);
  }

  await fetch(`${URL_BASE}/api/print-queue`, {
    method: "PUT",
    headers: { "x-barda-token": TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ done }),
  });
}

for (;;) {
  try { await tick(); } catch (e) { console.error("[barda-spool]", e.message); }
  await new Promise((r) => setTimeout(r, EVERY));
}
