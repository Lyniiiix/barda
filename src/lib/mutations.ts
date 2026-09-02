import "server-only";
import { db, now, row } from "./db";
import { newCode } from "./ids";

/**
 * Toutes les écritures passent par ici — les formulaires de l'app comme le
 * serveur MCP. Une seule définition de « ce que veut dire modifier un objet ».
 */

export type ItemInput = {
  name?: string;
  description?: string;
  category?: string;
  qty?: number;
  unit?: string;
  status?: string;
  restock?: boolean;
  minQty?: number;
  barcode?: string;
  lot?: string | null;
  projects?: string[];
};

function lotId(code: string | null | undefined): number | null {
  if (!code) return null;
  const r = db.prepare("SELECT id FROM lots WHERE code = ?").get(code);
  return r ? row<{ id: number }>(r).id : null;
}

function itemId(code: string): number | null {
  const r = db.prepare("SELECT id FROM items WHERE code = ?").get(code);
  return r ? row<{ id: number }>(r).id : null;
}

function applyProjects(id: number, codes: string[]) {
  db.prepare("DELETE FROM item_projects WHERE item_id = ?").run(id);
  const ins = db.prepare(
    "INSERT OR IGNORE INTO item_projects (item_id, project_id) SELECT ?, id FROM projects WHERE code = ?",
  );
  for (const c of codes) if (c) ins.run(id, c);
}

export function createItem(input: ItemInput): string {
  const code = newCode("item");
  const t = now();
  db.prepare(`
    INSERT INTO items (code, name, description, category, qty, unit, status, restock, min_qty, barcode, lot_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code,
    input.name?.trim() || "Sans nom",
    input.description ?? "",
    input.category ?? "",
    input.qty ?? 1,
    input.unit || "u",
    input.status || "ok",
    input.restock ? 1 : 0,
    input.minQty ?? 0,
    input.barcode ?? "",
    lotId(input.lot),
    t, t,
  );
  applyProjects(itemId(code)!, input.projects ?? []);
  return code;
}

/** Modification partielle : seuls les champs fournis sont touchés. */
export function updateItem(code: string, patch: ItemInput): boolean {
  const id = itemId(code);
  if (id === null) return false;

  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  const put = (col: string, v: string | number | null) => { sets.push(`${col} = ?`); args.push(v); };

  if (patch.name !== undefined) put("name", patch.name.trim() || "Sans nom");
  if (patch.description !== undefined) put("description", patch.description);
  if (patch.category !== undefined) put("category", patch.category);
  if (patch.qty !== undefined) put("qty", Math.max(0, patch.qty));
  if (patch.unit !== undefined) put("unit", patch.unit || "u");
  if (patch.status !== undefined) put("status", patch.status || "ok");
  if (patch.restock !== undefined) put("restock", patch.restock ? 1 : 0);
  if (patch.minQty !== undefined) put("min_qty", Math.max(0, patch.minQty));
  if (patch.barcode !== undefined) put("barcode", patch.barcode);
  if (patch.lot !== undefined) put("lot_id", lotId(patch.lot));

  if (sets.length) {
    put("updated_at", now());
    db.prepare(`UPDATE items SET ${sets.join(", ")} WHERE code = ?`).run(...args, code);
  }
  if (patch.projects !== undefined) applyProjects(id, patch.projects);
  return true;
}

export function bumpQty(code: string, delta: number): number | null {
  if (itemId(code) === null) return null;
  db.prepare("UPDATE items SET qty = MAX(0, qty + ?), updated_at = ? WHERE code = ?")
    .run(delta, now(), code);
  const qty = row<{ qty: number }>(db.prepare("SELECT qty FROM items WHERE code = ?").get(code)).qty;
  // Tomber à zéro, c'est « y'en a plus » : inutile de penser à le cocher.
  if (qty <= 0) db.prepare("UPDATE items SET restock = 1 WHERE code = ?").run(code);
  return qty;
}

/** Marque ou démarque un objet sur la liste de courses. */
export function setRestock(code: string, on: boolean): boolean {
  const id = itemId(code);
  if (id === null) return false;
  db.prepare("UPDATE items SET restock = ?, updated_at = ? WHERE code = ?").run(on ? 1 : 0, now(), code);
  return true;
}

export function setPhoto(code: string, file: string, credit = ""): boolean {
  if (itemId(code) === null) return false;
  db.prepare("UPDATE items SET photo = ?, photo_credit = ?, updated_at = ? WHERE code = ?")
    .run(file, credit, now(), code);
  return true;
}

/** Réapprovisionnement : on remet du stock et on sort de la liste de courses. */
export function restock(code: string, qty: number): number | null {
  const id = itemId(code);
  if (id === null) return null;
  db.prepare("UPDATE items SET qty = ?, restock = 0, status = CASE WHEN status = 'manquant' THEN 'ok' ELSE status END, updated_at = ? WHERE code = ?")
    .run(Math.max(0, qty), now(), code);
  return Math.max(0, qty);
}

export function deleteItem(code: string): boolean {
  return db.prepare("DELETE FROM items WHERE code = ?").run(code).changes > 0;
}

export type LotInput = { name?: string; description?: string; kind?: string; place?: string };

export function createLot(input: LotInput): string {
  const auto = row<{ n: number }>(db.prepare("SELECT COUNT(*) AS n FROM lots").get()).n + 1;
  const code = newCode("lot");
  const t = now();
  db.prepare(`
    INSERT INTO lots (code, name, description, kind, place, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(code, input.name?.trim() || `Lot ${auto}`, input.description ?? "",
         input.kind ?? "", input.place ?? "", t, t);
  return code;
}

export function updateLot(code: string, patch: LotInput): boolean {
  const exists = db.prepare("SELECT 1 FROM lots WHERE code = ?").get(code);
  if (!exists) return false;
  db.prepare(`
    UPDATE lots SET name = COALESCE(?, name), description = COALESCE(?, description),
                    kind = COALESCE(?, kind), place = COALESCE(?, place), updated_at = ?
    WHERE code = ?
  `).run(patch.name?.trim() || null, patch.description ?? null, patch.kind ?? null,
         patch.place ?? null, now(), code);
  return true;
}

export function deleteLot(code: string): boolean {
  return db.prepare("DELETE FROM lots WHERE code = ?").run(code).changes > 0;
}

export type ProjectInput = { name?: string; description?: string; color?: string; status?: string };

export function createProject(input: ProjectInput): string {
  const code = newCode("project");
  const t = now();
  db.prepare(`
    INSERT INTO projects (code, name, description, color, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(code, input.name?.trim() || "Projet", input.description ?? "",
         input.color || "#7c9cff", input.status || "actif", t, t);
  return code;
}

export function updateProject(code: string, patch: ProjectInput): boolean {
  const exists = db.prepare("SELECT 1 FROM projects WHERE code = ?").get(code);
  if (!exists) return false;
  db.prepare(`
    UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description),
                        color = COALESCE(?, color), status = COALESCE(?, status), updated_at = ?
    WHERE code = ?
  `).run(patch.name?.trim() || null, patch.description ?? null, patch.color ?? null,
         patch.status ?? null, now(), code);
  return true;
}

export function deleteProject(code: string): boolean {
  return db.prepare("DELETE FROM projects WHERE code = ?").run(code).changes > 0;
}
