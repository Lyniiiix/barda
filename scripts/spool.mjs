#!/usr/bin/env node
/**
 * Relais d'impression pour le Mac.
 *
 * Imprime sur la Fichero D11s, via la CLI `fichero`, les étiquettes qu'on lui a
 * **explicitement confiées** depuis Barda (bouton « Confier au Mac »).
 *
 * Il ne touche jamais au panier : ce qui est dans la file de l'app attend qu'on
 * décide, ici on ne prend que l'état `relais`. C'est ce qui évite qu'un relais
 * resté ouvert imprime tout ce qui passe.
 *
 *   BARDA_URL=https://barda.example.com BARDA_PRINT_TOKEN=… npm run spool
 *
 * ⚠️ À lancer depuis Terminal.app : macOS n'accorde l'accès Bluetooth qu'aux
 * processus dont le parent a l'autorisation. Lancé par launchd ou depuis un
 * autre contexte, l'impression échouera sans message clair.
 *
 * `--queue-only` se contente de déposer les PNG dans la file de
 * `fichero-printer` pour `spooler.sh`, sans imprimer soi-même.
 */

import { writeFile, mkdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const URL_BASE   = process.env.BARDA_URL || "http://localhost:3210";
const TOKEN      = process.env.BARDA_PRINT_TOKEN || "";
const REPO       = process.env.FICHERO_REPO || join(homedir(), "MCP/fichero-printer/repo");
const QUEUE_DIR  = process.env.FICHERO_QUEUE || join(homedir(), "MCP/fichero-printer/queue");
const EVERY      = Number(process.env.BARDA_POLL_MS || 5000);
const DENSITY    = process.env.FICHERO_DENSITY || "2";
const QUEUE_ONLY = process.argv.includes("--queue-only");

if (!TOKEN) {
  console.error("BARDA_PRINT_TOKEN manquant — même valeur que côté serveur.");
  process.exit(1);
}

const stamp = () => new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const slug = (s) => String(s).replace(/[^\w.-]+/g, "-").slice(0, 40);

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => { err += d; });
    child.on("error", (e) => resolve({ ok: false, err: e.message }));
    child.on("close", (code) => resolve({ ok: code === 0, err: err.trim() }));
  });
}

/** Imprime directement : un seul terminal à laisser ouvert, pas deux. */
async function printNow(png, label, copies) {
  const file = join(tmpdir(), `barda-${stamp()}-${slug(label)}.png`);
  await writeFile(file, png);
  try {
    const args = ["run", "fichero", "image", file, "--density", DENSITY, "--copies", String(copies)];
    const { ok, err } = await run("uv", args, REPO);
    if (!ok) throw new Error(err || "échec de la CLI fichero");
  } finally {
    await rm(file, { force: true });
  }
}

/** Repli : on dépose dans la file de fichero-printer, spooler.sh prendra le relais. */
async function dropInQueue(png, label, copies) {
  await mkdir(QUEUE_DIR, { recursive: true });
  for (let c = 0; c < copies; c++) {
    await writeFile(join(QUEUE_DIR, `${stamp()}-${c}-${slug(label)}.png`), png);
  }
}

async function tick() {
  const res = await fetch(`${URL_BASE}/api/print-queue`, { headers: { "x-barda-token": TOKEN } });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const { jobs } = await res.json();
  if (!jobs?.length) return;

  const done = [];
  for (const job of jobs) {
    const png = Buffer.from(job.png.split(",")[1], "base64");
    const copies = Math.max(1, job.copies || 1);
    try {
      if (QUEUE_ONLY) await dropInQueue(png, job.label, copies);
      else await printNow(png, job.label, copies);
      done.push(job.id);
      console.log(`✓ ${job.label} × ${copies}`);
    } catch (e) {
      // On n'acquitte pas : l'étiquette repassera au prochain tour.
      console.error(`✗ ${job.label} — ${e.message}`);
      console.error("  imprimante allumée ? étiquettes chargées ? lancé depuis Terminal.app ?");
      break;
    }
  }

  if (done.length) {
    await fetch(`${URL_BASE}/api/print-queue`, {
      method: "PUT",
      headers: { "x-barda-token": TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ done }),
    });
  }
}

console.log(`[barda] relais d'impression — ${URL_BASE}`);
console.log(`[barda] ${QUEUE_ONLY ? `dépôt dans ${QUEUE_DIR}` : `impression directe via ${REPO}`}, toutes les ${EVERY / 1000}s`);

for (;;) {
  try { await tick(); } catch (e) { console.error(`[barda] ${e.message}`); }
  await new Promise((r) => setTimeout(r, EVERY));
}
