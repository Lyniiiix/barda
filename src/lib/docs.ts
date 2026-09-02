import "server-only";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { db, docDir, now, row, rows } from "./db";

/**
 * Documents attachés à un objet : notice, fiche technique, facture, garantie.
 *
 * Deux natures volontairement distinctes. Un **lien** ne coûte rien mais ne vaut
 * rien sans réseau ; un **fichier** est copié sur le serveur et reste lisible.
 * Pour du matériel qui part à l'étranger, c'est le fichier qui compte.
 */

export type Doc = {
  id: number; code: string; kind: "lien" | "fichier";
  label: string; url: string; file: string; size: number; created_at: string;
};

export function listDocs(code: string): Doc[] {
  return rows<Doc>(
    db.prepare("SELECT * FROM documents WHERE code = ? ORDER BY kind, id").all(code),
  );
}

export function countDocs(code: string): number {
  return Number(row<{ n: number }>(
    db.prepare("SELECT COUNT(*) AS n FROM documents WHERE code = ?").get(code),
  ).n);
}

export function getDoc(id: number): Doc | null {
  const r = db.prepare("SELECT * FROM documents WHERE id = ?").get(id);
  return r ? row<Doc>(r) : null;
}

export function addLink(code: string, label: string, url: string): number {
  db.prepare(
    "INSERT INTO documents (code, kind, label, url, created_at) VALUES (?, 'lien', ?, ?, ?)",
  ).run(code, label.trim() || "Lien", url, now());
  return Number(row<{ id: number }>(db.prepare("SELECT last_insert_rowid() AS id").get()).id);
}

export function addFile(code: string, label: string, file: string, size: number): number {
  db.prepare(
    "INSERT INTO documents (code, kind, label, file, size, created_at) VALUES (?, 'fichier', ?, ?, ?, ?)",
  ).run(code, label.trim() || "Document", file, size, now());
  return Number(row<{ id: number }>(db.prepare("SELECT last_insert_rowid() AS id").get()).id);
}

/** Supprime l'entrée et, si c'était un fichier, la copie sur disque. */
export async function removeDoc(id: number): Promise<boolean> {
  const doc = getDoc(id);
  if (!doc) return false;
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  if (doc.file) await unlink(join(docDir(), doc.file)).catch(() => {});
  return true;
}
