import type { DatabaseSync } from "node:sqlite";
import { randomCode } from "./codes";

/**
 * L'inventaire fictif de la démo : un atelier d'électronique et de bricolage, avec
 * de quoi voir chaque mécanisme (lots, projets, seuils, liste de courses, états).
 * Ne tourne que sur une base vide, et seulement en mode démo.
 */

type L = { key: string; name: string; kind: string; place: string; description: string };
type P = { key: string; name: string; color: string; status: string; description: string };
type I = {
  name: string; category: string; qty: number; unit: string; lot?: string; projects?: string[];
  status?: string; restock?: boolean; minQty?: number; description?: string;
  boughtAt?: string; price?: number; renewAt?: string;
};

const LOTS: L[] = [
  { key: "elec", name: "Caisse électronique", kind: "Caisse", place: "Atelier, étagère du haut",
    description: "Caisse grise à couvercle clipsé : soudure, mesure, modules." },
  { key: "sac", name: "Sac d'intervention", kind: "Sac", place: "Coffre de la voiture",
    description: "Sac à dos noir : le minimum pour dépanner sur place." },
  { key: "quinc", name: "Tiroir quincaillerie", kind: "Tiroir", place: "Établi, tiroir 2",
    description: "Vis, écrous, inserts, colliers, gaine." },
  { key: "voyage", name: "Valise voyage", kind: "Valise", place: "Garage",
    description: "Ce qui part pour un long séjour : secours, câbles, adaptateurs." },
];

const PROJECTS: P[] = [
  { key: "robot", name: "Robot ESP32", color: "#f59e0b", status: "actif",
    description: "Petit robot à deux roues piloté en Wi-Fi." },
  { key: "velo", name: "Atelier vélo", color: "#10b981", status: "actif",
    description: "Entretien des deux vélos avant l'été." },
  { key: "ete", name: "Voyage d'été", color: "#38bdf8", status: "en pause",
    description: "Six semaines sur la route : ce qu'il faut emporter, groupé par lot." },
];

const ITEMS: I[] = [
  { name: "Fer à souder TS101", category: "Outil", qty: 1, unit: "u", lot: "elec", projects: ["robot"],
    description: "Alimenté en USB-C PD, panne fine.", boughtAt: "2026-03-14", price: 64.9 },
  { name: "Étain 0,8 mm", category: "Consommable", qty: 1, unit: "rouleau", lot: "elec", projects: ["robot"],
    minQty: 1, restock: true, description: "Sn99 sans plomb. Dernier rouleau entamé." },
  { name: "Flux de brasage", category: "Consommable", qty: 2, unit: "u", lot: "elec", minQty: 1 },
  { name: "Tresse à dessouder", category: "Consommable", qty: 0, unit: "rouleau", lot: "elec", minQty: 1 },
  { name: "Multimètre", category: "Mesure", qty: 1, unit: "u", lot: "sac", projects: ["robot", "velo"],
    description: "Calibre auto, mesure de continuité sonore.", boughtAt: "2025-11-02", price: 39 },
  { name: "Testeur USB-C", category: "Mesure", qty: 1, unit: "u", lot: "sac" },
  { name: "Pied à coulisse", category: "Mesure", qty: 1, unit: "u", lot: "elec" },
  { name: "ESP32-S3 DevKit", category: "Électronique", qty: 3, unit: "u", lot: "elec", projects: ["robot"] },
  { name: "Pilote moteur TB6612", category: "Électronique", qty: 2, unit: "u", lot: "elec", projects: ["robot"] },
  { name: "Batterie 18650", category: "Électronique", qty: 4, unit: "u", lot: "elec", projects: ["robot"],
    status: "usé", description: "Deux sur quatre tiennent mal la charge." },
  { name: "Câbles Dupont", category: "Câble / connectique", qty: 1, unit: "lot", lot: "elec", projects: ["robot"] },
  { name: "Câble USB-C 2 m", category: "Câble / connectique", qty: 3, unit: "u", lot: "voyage", projects: ["ete"] },
  { name: "Adaptateur secteur US", category: "Câble / connectique", qty: 1, unit: "u", lot: "voyage", projects: ["ete"] },
  { name: "Gaine thermo assortie", category: "Quincaillerie", qty: 1, unit: "boîte", lot: "quinc" },
  { name: "Inserts filetés M3", category: "Quincaillerie", qty: 40, unit: "u", lot: "quinc", minQty: 20 },
  { name: "Vis M3 × 10", category: "Quincaillerie", qty: 12, unit: "u", lot: "quinc", minQty: 20 },
  { name: "Colliers de serrage", category: "Quincaillerie", qty: 1, unit: "lot", lot: "sac" },
  { name: "Tournevis de précision", category: "Outil", qty: 1, unit: "u", lot: "sac", projects: ["robot"] },
  { name: "Clés Allen", category: "Outil", qty: 1, unit: "lot", lot: "sac", projects: ["velo"] },
  { name: "Démonte-pneus", category: "Outil", qty: 2, unit: "u", projects: ["velo"] },
  { name: "Perceuse visseuse", category: "Outil électroportatif", qty: 1, unit: "u",
    status: "à réparer", description: "Le mandrin patine. Charbons à vérifier." },
  { name: "Lampe frontale", category: "Camping / voyage", qty: 1, unit: "u", lot: "voyage", projects: ["ete"],
    status: "prêté", description: "Prêtée pour le week-end, à récupérer." },
  { name: "Trousse de secours", category: "Santé / secours", qty: 1, unit: "u", lot: "voyage", projects: ["ete"],
    renewAt: "2026-06-01", description: "Désinfectant et pansements à date." },
  { name: "SSD externe 1 To", category: "Stockage", qty: 1, unit: "u", lot: "voyage", projects: ["ete"],
    boughtAt: "2026-01-20", price: 89 },
  { name: "Ruban adhésif toilé", category: "Consommable", qty: 0.5, unit: "rouleau", lot: "sac" },
  { name: "Notice perceuse", category: "Papier / administratif", qty: 1, unit: "u", status: "manquant" },
];

const LOG: [string, number, "imprimé" | "échec" | "annulé", string][] = [
  ["Caisse électronique", 1, "imprimé", ""],
  ["Fer à souder TS101", 1, "imprimé", ""],
  ["Multimètre", 2, "imprimé", ""],
  ["ESP32-S3 DevKit", 3, "échec", "imprimante hors de portée"],
  ["ESP32-S3 DevKit", 3, "imprimé", ""],
  ["Sac d'intervention", 1, "annulé", ""],
];

export function seedDemo(db: DatabaseSync) {
  const empty = (db.prepare("SELECT COUNT(*) AS n FROM items").get() as { n: number }).n === 0;
  if (!empty) return;

  const day = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
  const lotIds = new Map<string, { id: number; code: string }>();
  const projIds = new Map<string, number>();

  db.exec("BEGIN");
  try {
    LOTS.forEach((l, i) => {
      const code = randomCode("lot");
      const r = db.prepare(
        "INSERT INTO lots (code, name, description, kind, place, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(code, l.name, l.description, l.kind, l.place, day(60 - i), day(10 - i));
      lotIds.set(l.key, { id: Number(r.lastInsertRowid), code });
    });

    PROJECTS.forEach((p, i) => {
      const r = db.prepare(
        "INSERT INTO projects (code, name, description, color, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).run(randomCode("project"), p.name, p.description, p.color, p.status, day(50 - i), day(5 - i));
      projIds.set(p.key, Number(r.lastInsertRowid));
    });

    ITEMS.forEach((it, i) => {
      const r = db.prepare(`
        INSERT INTO items (code, name, description, category, qty, unit, status, restock, min_qty,
                           bought_at, price, renew_at, barcode, lot_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)
      `).run(
        randomCode("item"), it.name, it.description ?? "", it.category, it.qty, it.unit,
        it.status ?? "ok", it.restock ? 1 : 0, it.minQty ?? 0, it.boughtAt ?? "", it.price ?? 0,
        it.renewAt ?? "", it.lot ? lotIds.get(it.lot)!.id : null, day(40 - i), day(ITEMS.length - i),
      );
      const id = Number(r.lastInsertRowid);
      for (const p of it.projects ?? []) {
        db.prepare("INSERT INTO item_projects (item_id, project_id) VALUES (?, ?)").run(id, projIds.get(p)!);
      }
    });

    LOG.forEach(([label, copies, outcome, detail], i) => {
      db.prepare("INSERT INTO print_log (code, label, copies, outcome, detail, at) VALUES ('', ?, ?, ?, ?, ?)")
        .run(label, copies, outcome, detail, day(LOG.length - i));
    });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
