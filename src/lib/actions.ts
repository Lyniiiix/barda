"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, now, row } from "./db";
import { newCode } from "./ids";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const n = (v: FormDataEntryValue | null, dflt = 0) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : dflt;
};

function lotIdFromCode(code: string): number | null {
  if (!code) return null;
  const r = db.prepare("SELECT id FROM lots WHERE code = ?").get(code);
  return r ? row<{ id: number }>(r).id : null;
}

function setProjects(itemId: number, codes: string[]) {
  db.prepare("DELETE FROM item_projects WHERE item_id = ?").run(itemId);
  const ins = db.prepare(
    "INSERT OR IGNORE INTO item_projects (item_id, project_id) SELECT ?, id FROM projects WHERE code = ?",
  );
  for (const c of codes) if (c) ins.run(itemId, c);
}

/* ------------------------------------------------------------------ objets */

export async function createItem(fd: FormData) {
  const name = s(fd.get("name")) || "Sans nom";
  const code = newCode("item");
  const t = now();
  db.prepare(`
    INSERT INTO items (code, name, description, category, qty, unit, status, barcode, lot_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, name, s(fd.get("description")), s(fd.get("category")),
    n(fd.get("qty"), 1), s(fd.get("unit")) || "u", s(fd.get("status")) || "ok",
    s(fd.get("barcode")), lotIdFromCode(s(fd.get("lot"))), t, t,
  );
  const id = row<{ id: number }>(db.prepare("SELECT id FROM items WHERE code = ?").get(code)).id;
  setProjects(id, fd.getAll("projects").map(String));

  revalidatePath("/objets");
  if (s(fd.get("continue")) === "1") redirect(`/objets/nouveau?lot=${s(fd.get("lot"))}&ok=${code}`);
  redirect(`/objets/${code}`);
}

export async function updateItem(fd: FormData) {
  const code = s(fd.get("code"));
  db.prepare(`
    UPDATE items SET name = ?, description = ?, category = ?, qty = ?, unit = ?,
                     status = ?, barcode = ?, lot_id = ?, updated_at = ?
    WHERE code = ?
  `).run(
    s(fd.get("name")) || "Sans nom", s(fd.get("description")), s(fd.get("category")),
    n(fd.get("qty"), 1), s(fd.get("unit")) || "u", s(fd.get("status")) || "ok",
    s(fd.get("barcode")), lotIdFromCode(s(fd.get("lot"))), now(), code,
  );
  const r = db.prepare("SELECT id FROM items WHERE code = ?").get(code);
  if (r) setProjects(row<{ id: number }>(r).id, fd.getAll("projects").map(String));

  revalidatePath("/objets");
  redirect(`/objets/${code}`);
}

export async function deleteItem(fd: FormData) {
  db.prepare("DELETE FROM items WHERE code = ?").run(s(fd.get("code")));
  revalidatePath("/objets");
  redirect("/objets");
}

/** Utilisé par le scanner : range un objet dans un lot sans quitter la page. */
export async function assignItemToLot(itemCode: string, lotCode: string | null) {
  const lotId = lotCode ? lotIdFromCode(lotCode) : null;
  db.prepare("UPDATE items SET lot_id = ?, updated_at = ? WHERE code = ?").run(lotId, now(), itemCode);
  revalidatePath("/objets");
  revalidatePath("/lots");
  return { ok: true };
}

export async function bumpQty(fd: FormData) {
  const code = s(fd.get("code"));
  const delta = n(fd.get("delta"), 0);
  db.prepare("UPDATE items SET qty = MAX(0, qty + ?), updated_at = ? WHERE code = ?").run(delta, now(), code);
  revalidatePath(`/objets/${code}`);
  revalidatePath("/objets");
}

/* -------------------------------------------------------------------- lots */

export async function createLot(fd: FormData) {
  const auto = row<{ n: number }>(db.prepare("SELECT COUNT(*) AS n FROM lots").get()).n + 1;
  const code = newCode("lot");
  const t = now();
  db.prepare(`
    INSERT INTO lots (code, name, description, kind, place, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, s(fd.get("name")) || `Lot ${auto}`, s(fd.get("description")),
    s(fd.get("kind")), s(fd.get("place")), t, t,
  );
  revalidatePath("/lots");
  redirect(`/lots/${code}`);
}

export async function updateLot(fd: FormData) {
  const code = s(fd.get("code"));
  db.prepare(`
    UPDATE lots SET name = ?, description = ?, kind = ?, place = ?, updated_at = ? WHERE code = ?
  `).run(
    s(fd.get("name")) || "Lot", s(fd.get("description")), s(fd.get("kind")),
    s(fd.get("place")), now(), code,
  );
  revalidatePath("/lots");
  redirect(`/lots/${code}`);
}

export async function deleteLot(fd: FormData) {
  db.prepare("DELETE FROM lots WHERE code = ?").run(s(fd.get("code")));
  revalidatePath("/lots");
  redirect("/lots");
}

/* ----------------------------------------------------------------- projets */

export async function createProject(fd: FormData) {
  const code = newCode("project");
  const t = now();
  db.prepare(`
    INSERT INTO projects (code, name, description, color, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, s(fd.get("name")) || "Projet", s(fd.get("description")),
    s(fd.get("color")) || "#7c9cff", s(fd.get("status")) || "actif", t, t,
  );
  revalidatePath("/projets");
  redirect(`/projets/${code}`);
}

export async function updateProject(fd: FormData) {
  const code = s(fd.get("code"));
  db.prepare(`
    UPDATE projects SET name = ?, description = ?, color = ?, status = ?, updated_at = ? WHERE code = ?
  `).run(
    s(fd.get("name")) || "Projet", s(fd.get("description")), s(fd.get("color")) || "#7c9cff",
    s(fd.get("status")) || "actif", now(), code,
  );
  revalidatePath("/projets");
  redirect(`/projets/${code}`);
}

export async function deleteProject(fd: FormData) {
  db.prepare("DELETE FROM projects WHERE code = ?").run(s(fd.get("code")));
  revalidatePath("/projets");
  redirect("/projets");
}

/* ----------------------------------------------------- file d'impression */

export async function queueLabel(label: string, png: string, copies = 1) {
  db.prepare("INSERT INTO print_queue (label, png, copies, created_at) VALUES (?, ?, ?, ?)")
    .run(label, png, copies, now());
  return { ok: true };
}
