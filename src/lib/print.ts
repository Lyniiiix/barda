import "server-only";
import { db, now, rows, row } from "./db";

/**
 * Le panier d'impression. Rien ne part à l'imprimante tant qu'on ne le demande
 * pas explicitement : c'est tout l'intérêt par rapport à un bouton qui déclenche
 * directement, où un double appui coûte deux étiquettes.
 */

export type Job = {
  id: number;
  code: string;
  label: string;
  png: string;
  copies: number;
  state: "file" | "relais" | "imprimé";
  created_at: string;
  printed_at: string | null;
};

const LIGHT = "id, code, label, copies, state, created_at, printed_at";

export function basket(): Omit<Job, "png">[] {
  return rows(db.prepare(`SELECT ${LIGHT} FROM print_queue WHERE state = 'file' ORDER BY id`).all());
}

export function sentToRelay(): Omit<Job, "png">[] {
  return rows(db.prepare(`SELECT ${LIGHT} FROM print_queue WHERE state = 'relais' ORDER BY id`).all());
}

export function history(limit = 20): Omit<Job, "png">[] {
  return rows(db.prepare(
    `SELECT ${LIGHT} FROM print_queue WHERE state = 'imprimé' ORDER BY printed_at DESC LIMIT ?`,
  ).all(limit));
}

export function pngOf(id: number): string | null {
  const r = db.prepare("SELECT png FROM print_queue WHERE id = ?").get(id);
  return r ? row<{ png: string }>(r).png : null;
}

/** Date de dernière impression d'une étiquette, pour ne pas la refaire sans le savoir. */
export function lastPrinted(code: string): string | null {
  if (!code) return null;
  const r = db.prepare(
    "SELECT printed_at FROM print_queue WHERE code = ? AND state = 'imprimé' ORDER BY printed_at DESC LIMIT 1",
  ).get(code);
  return r ? row<{ printed_at: string | null }>(r).printed_at : null;
}

export type AddResult = { id: number; deja: boolean; total: number };

/**
 * Ajoute au panier. Si l'étiquette y est déjà, on met à jour son image sans
 * ajouter de seconde ligne — deux appuis ne doivent pas faire deux étiquettes.
 */
export function addToBasket(
  code: string, label: string, png: string, copies: number, target: "file" | "relais" = "file",
): AddResult {
  const existing = code
    ? db.prepare("SELECT id FROM print_queue WHERE code = ? AND state = ?").get(code, target)
    : null;

  let id: number;
  let deja = false;
  if (existing) {
    id = row<{ id: number }>(existing).id;
    db.prepare("UPDATE print_queue SET png = ?, label = ? WHERE id = ?").run(png, label, id);
    deja = true;
  } else {
    db.prepare(
      "INSERT INTO print_queue (code, label, png, copies, state, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(code, label, png, Math.max(1, copies), target, now());
    id = row<{ id: number }>(db.prepare("SELECT last_insert_rowid() AS id").get()).id;
  }
  return { id, deja, total: countLabels(target) };
}

/** Nombre d'étiquettes qui sortiront réellement — copies comprises. */
export function countLabels(state: "file" | "relais" = "file"): number {
  return Number(
    row<{ n: number }>(
      db.prepare("SELECT COALESCE(SUM(copies), 0) AS n FROM print_queue WHERE state = ?").get(state),
    ).n,
  );
}

export function setCopies(id: number, copies: number) {
  db.prepare("UPDATE print_queue SET copies = ? WHERE id = ? AND state <> 'imprimé'")
    .run(Math.min(20, Math.max(1, copies)), id);
}

export function remove(id: number) {
  db.prepare("DELETE FROM print_queue WHERE id = ? AND state <> 'imprimé'").run(id);
}

export function clearBasket() {
  db.prepare("DELETE FROM print_queue WHERE state = 'file'").run();
}

export function markPrinted(ids: number[]) {
  const stmt = db.prepare("UPDATE print_queue SET state = 'imprimé', printed_at = ? WHERE id = ?");
  const t = now();
  for (const id of ids) stmt.run(t, id);
}

/** Confie le panier au Mac : c'est là, et seulement là, que le relais prend la main. */
export function sendBasketToRelay(): number {
  // node:sqlite peut rendre un bigint sur `changes`.
  return Number(db.prepare("UPDATE print_queue SET state = 'relais' WHERE state = 'file'").run().changes);
}
