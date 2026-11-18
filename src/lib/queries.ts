import "server-only";
import { db, rows, row, type Item, type Lot, type Project } from "./db";

export type ItemRow = Item & {
  lot_name: string | null; lot_code: string | null; projects: string; a_racheter: number;
};

/** Pourquoi cet objet est sur la liste de courses — pour l'afficher sans le recalculer. */
export function restockReason(i: ItemRow): string | null {
  if (!i.a_racheter) return null;
  if (i.status === "manquant") return "porté manquant";
  if (i.qty <= 0) return "épuisé";
  if (i.min_qty > 0 && i.qty <= i.min_qty) return `sous le seuil de ${i.min_qty} ${i.unit}`;
  if (i.renew_at && i.renew_at <= new Date().toISOString().slice(0, 10)) {
    return `renouvellement prévu le ${new Date(i.renew_at).toLocaleDateString("fr-FR")}`;
  }
  return "marqué à racheter";
}

const ITEM_SELECT = `
  SELECT i.*, l.name AS lot_name, l.code AS lot_code,
         CASE WHEN (i.restock = 1 OR i.qty <= 0 OR (i.min_qty > 0 AND i.qty <= i.min_qty)
                    OR i.status = 'manquant'
                    OR (i.renew_at <> '' AND i.renew_at <= date('now'))) THEN 1 ELSE 0 END AS a_racheter,
         COALESCE((SELECT group_concat(p.name, ' · ')
                   FROM item_projects ip JOIN projects p ON p.id = ip.project_id
                   WHERE ip.item_id = i.id ORDER BY p.name), '') AS projects
  FROM items i LEFT JOIN lots l ON l.id = i.lot_id
`;

export type ItemFilter = {
  q?: string; lot?: string; project?: string; category?: string; status?: string;
  sansLot?: boolean; aRacheter?: boolean;
  /** Date d'achat exacte (AAAA-MM-JJ) : tout ce qui est arrivé dans une même commande. */
  achat?: string;
};

/**
 * Un objet est à racheter s'il est explicitement marqué, s'il n'en reste plus,
 * si son seuil est franchi, ou s'il est porté manquant. Le drapeau manuel suffit,
 * mais les trois autres cas évitent d'avoir à y penser.
 */
export const RESTOCK_SQL =
  "(i.restock = 1 OR i.qty <= 0 OR (i.min_qty > 0 AND i.qty <= i.min_qty) " +
  "OR i.status = 'manquant' OR (i.renew_at <> '' AND i.renew_at <= date('now')))";

export function listItems(f: ItemFilter = {}): ItemRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];

  if (f.q) {
    where.push("(i.name LIKE ? OR i.description LIKE ? OR i.code LIKE ? OR i.barcode LIKE ? OR i.category LIKE ?)");
    const like = `%${f.q}%`;
    args.push(like, like, like, like, like);
  }
  if (f.lot) { where.push("l.code = ?"); args.push(f.lot); }
  if (f.sansLot) where.push("i.lot_id IS NULL");
  if (f.aRacheter) where.push(RESTOCK_SQL);
  if (f.category) { where.push("i.category = ?"); args.push(f.category); }
  if (f.status) { where.push("i.status = ?"); args.push(f.status); }
  if (f.achat) { where.push("i.bought_at = ?"); args.push(f.achat); }
  if (f.project) {
    where.push("EXISTS (SELECT 1 FROM item_projects ip JOIN projects p ON p.id = ip.project_id WHERE ip.item_id = i.id AND p.code = ?)");
    args.push(f.project);
  }

  const sql = `${ITEM_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY i.updated_at DESC LIMIT 500`;
  return rows<ItemRow>(db.prepare(sql).all(...args));
}

export function getItemByCode(code: string): ItemRow | null {
  const r = db.prepare(`${ITEM_SELECT} WHERE i.code = ?`).get(code);
  return r ? row<ItemRow>(r) : null;
}

export function itemProjectIds(itemId: number): number[] {
  return rows<{ project_id: number }>(
    db.prepare("SELECT project_id FROM item_projects WHERE item_id = ?").all(itemId),
  ).map((r) => r.project_id);
}

export type LotRow = Lot & { n_items: number; qty_total: number };

export function listLots(): LotRow[] {
  return rows<LotRow>(db.prepare(`
    SELECT l.*, COUNT(i.id) AS n_items, COALESCE(SUM(i.qty), 0) AS qty_total
    FROM lots l LEFT JOIN items i ON i.lot_id = l.id
    GROUP BY l.id ORDER BY l.id
  `).all());
}

export function getLotByCode(code: string): LotRow | null {
  const r = db.prepare(`
    SELECT l.*, COUNT(i.id) AS n_items, COALESCE(SUM(i.qty), 0) AS qty_total
    FROM lots l LEFT JOIN items i ON i.lot_id = l.id
    WHERE l.code = ? GROUP BY l.id
  `).get(code);
  return r ? row<LotRow>(r) : null;
}

export type ProjectRow = Project & { n_items: number };

export function listProjects(): ProjectRow[] {
  return rows<ProjectRow>(db.prepare(`
    SELECT p.*, COUNT(ip.item_id) AS n_items
    FROM projects p LEFT JOIN item_projects ip ON ip.project_id = p.id
    GROUP BY p.id ORDER BY p.status, p.name
  `).all());
}

export function getProjectByCode(code: string): ProjectRow | null {
  const r = db.prepare(`
    SELECT p.*, COUNT(ip.item_id) AS n_items
    FROM projects p LEFT JOIN item_projects ip ON ip.project_id = p.id
    WHERE p.code = ? GROUP BY p.id
  `).get(code);
  return r ? row<ProjectRow>(r) : null;
}

export function findByBarcode(barcode: string): ItemRow | null {
  const r = db.prepare(`${ITEM_SELECT} WHERE i.barcode = ? AND i.barcode <> ''`).get(barcode);
  return r ? row<ItemRow>(r) : null;
}

export function stats() {
  const one = (sql: string) => Number(row<Record<string, number>>(db.prepare(sql).get())?.n ?? 0);
  return {
    items: one("SELECT COUNT(*) AS n FROM items"),
    lots: one("SELECT COUNT(*) AS n FROM lots"),
    projects: one("SELECT COUNT(*) AS n FROM projects"),
    sansLot: one("SELECT COUNT(*) AS n FROM items WHERE lot_id IS NULL"),
    aVoir: one("SELECT COUNT(*) AS n FROM items WHERE status <> 'ok'"),
    aRacheter: one(`SELECT COUNT(*) AS n FROM items i WHERE ${RESTOCK_SQL}`),
  };
}

export function categoriesUsed(): string[] {
  return rows<{ category: string }>(
    db.prepare("SELECT DISTINCT category FROM items WHERE category <> '' ORDER BY category").all(),
  ).map((r) => r.category);
}

export function exportAll() {
  return {
    exported_at: new Date().toISOString(),
    lots: rows<Lot>(db.prepare("SELECT * FROM lots ORDER BY id").all()),
    projects: rows<Project>(db.prepare("SELECT * FROM projects ORDER BY id").all()),
    items: rows<Item>(db.prepare("SELECT * FROM items ORDER BY id").all()),
    item_projects: rows<{ item_id: number; project_id: number }>(
      db.prepare("SELECT * FROM item_projects").all(),
    ),
  };
}

/** Les dernières dates d'achat : une date, c'est en pratique une commande reçue. */
export function purchaseDates(limit = 6): { date: string; n: number }[] {
  return rows<{ date: string; n: number }>(db.prepare(
    "SELECT bought_at AS date, COUNT(*) AS n FROM items WHERE bought_at <> '' GROUP BY bought_at ORDER BY bought_at DESC LIMIT ?",
  ).all(limit));
}
