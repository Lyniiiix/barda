import "server-only";
import { db } from "./db";
import { randomCode, type Kind } from "./codes";

const TABLE: Record<Kind, string> = { item: "items", lot: "lots", project: "projects" };

export function newCode(kind: Kind): string {
  for (let i = 0; i < 50; i++) {
    const code = randomCode(kind);
    if (!db.prepare(`SELECT 1 FROM ${TABLE[kind]} WHERE code = ?`).get(code)) return code;
  }
  throw new Error("impossible de générer un code unique");
}
