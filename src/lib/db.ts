import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS lots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  kind        TEXT    NOT NULL DEFAULT '',
  place       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  color       TEXT    NOT NULL DEFAULT '#7c9cff',
  status      TEXT    NOT NULL DEFAULT 'actif',
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  category    TEXT    NOT NULL DEFAULT '',
  qty         REAL    NOT NULL DEFAULT 1,
  unit        TEXT    NOT NULL DEFAULT '',
  status      TEXT    NOT NULL DEFAULT 'ok',
  barcode     TEXT    NOT NULL DEFAULT '',
  lot_id      INTEGER REFERENCES lots(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS item_projects (
  item_id    INTEGER NOT NULL REFERENCES items(id)    ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, project_id)
);

CREATE TABLE IF NOT EXISTS print_queue (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  code       TEXT    NOT NULL DEFAULT '',
  label      TEXT    NOT NULL,
  png        TEXT    NOT NULL,
  copies     INTEGER NOT NULL DEFAULT 1,
  -- file : dans le panier, personne n'imprime tout seul
  -- relais : confié au Mac, qui l'imprimera à son prochain relevé
  -- imprimé : sorti
  state      TEXT    NOT NULL DEFAULT 'file',
  created_at TEXT    NOT NULL,
  printed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_lot     ON items(lot_id);
CREATE INDEX IF NOT EXISTS idx_items_name    ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode);
`;

declare global {
  var __bardaDb: DatabaseSync | undefined;
}

/** Ajoute les colonnes manquantes aux bases créées avant leur apparition. */
function migrate(db: DatabaseSync) {
  const columns = (db.prepare("PRAGMA table_info(print_queue)").all() as { name: string }[])
    .map((c) => c.name);
  if (!columns.includes("code")) db.exec("ALTER TABLE print_queue ADD COLUMN code TEXT NOT NULL DEFAULT ''");
  if (!columns.includes("printed_at")) db.exec("ALTER TABLE print_queue ADD COLUMN printed_at TEXT");
  // Avant le panier, tout ce qui était en file était destiné au Mac.
  db.exec("UPDATE print_queue SET state = 'relais' WHERE state = 'en_attente'");
}

function open(): DatabaseSync {
  const file = resolve(process.env.BARDA_DB || "./data/barda.db");
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/**
 * Ouverture paresseuse : `next build` importe ces modules dans plusieurs workers
 * parallèles rien que pour lire la config des routes. Ouvrir la base à
 * l'import les faisait se marcher dessus (« Failed to collect page data »).
 * Ici, le fichier n'est touché qu'à la première vraie requête.
 */
function handle(): DatabaseSync {
  return (globalThis.__bardaDb ??= open());
}

export const db = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const value = Reflect.get(handle(), prop);
    return typeof value === "function" ? value.bind(handle()) : value;
  },
}) as DatabaseSync;

export const now = () => new Date().toISOString();

/** Les lignes de node:sqlite ont un prototype nul : React n'aime pas les sérialiser. */
export function row<T>(r: unknown): T {
  return { ...(r as object) } as T;
}
export function rows<T>(rs: unknown[]): T[] {
  return rs.map((r) => row<T>(r));
}

export type Lot = {
  id: number; code: string; name: string; description: string;
  kind: string; place: string; created_at: string; updated_at: string;
};
export type Project = {
  id: number; code: string; name: string; description: string;
  color: string; status: string; created_at: string; updated_at: string;
};
export type Item = {
  id: number; code: string; name: string; description: string;
  category: string; qty: number; unit: string; status: string;
  barcode: string; lot_id: number | null; created_at: string; updated_at: string;
};
