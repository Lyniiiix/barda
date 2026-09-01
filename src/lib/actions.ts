"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as m from "./mutations";

/** Adaptateurs FormData → couche de mutation. La logique est dans `mutations.ts`. */

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const n = (v: FormDataEntryValue | null, dflt = 0) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : dflt;
};

const itemFields = (fd: FormData): m.ItemInput => ({
  name: s(fd.get("name")),
  description: s(fd.get("description")),
  category: s(fd.get("category")),
  qty: n(fd.get("qty"), 1),
  unit: s(fd.get("unit")) || "u",
  status: s(fd.get("status")) || "ok",
  barcode: s(fd.get("barcode")),
  lot: s(fd.get("lot")) || null,
  projects: fd.getAll("projects").map(String),
});

/* ------------------------------------------------------------------ objets */

export async function createItem(fd: FormData) {
  const code = m.createItem(itemFields(fd));
  revalidatePath("/objets");
  if (s(fd.get("continue")) === "1") redirect(`/objets/nouveau?lot=${s(fd.get("lot"))}&ok=${code}`);
  redirect(`/objets/${code}`);
}

export async function updateItem(fd: FormData) {
  const code = s(fd.get("code"));
  m.updateItem(code, itemFields(fd));
  revalidatePath("/objets");
  redirect(`/objets/${code}`);
}

export async function deleteItem(fd: FormData) {
  m.deleteItem(s(fd.get("code")));
  revalidatePath("/objets");
  redirect("/objets");
}

/** Utilisé par le scanner : range un objet dans un lot sans quitter la page. */
export async function assignItemToLot(itemCode: string, lotCode: string | null) {
  const ok = m.updateItem(itemCode, { lot: lotCode });
  revalidatePath("/objets");
  revalidatePath("/lots");
  return { ok };
}

export async function bumpQty(fd: FormData) {
  const code = s(fd.get("code"));
  m.bumpQty(code, n(fd.get("delta"), 0));
  revalidatePath(`/objets/${code}`);
  revalidatePath("/objets");
}

/* -------------------------------------------------------------------- lots */

export async function createLot(fd: FormData) {
  const code = m.createLot({
    name: s(fd.get("name")), description: s(fd.get("description")),
    kind: s(fd.get("kind")), place: s(fd.get("place")),
  });
  revalidatePath("/lots");
  redirect(`/lots/${code}`);
}

export async function updateLot(fd: FormData) {
  const code = s(fd.get("code"));
  m.updateLot(code, {
    name: s(fd.get("name")), description: s(fd.get("description")),
    kind: s(fd.get("kind")), place: s(fd.get("place")),
  });
  revalidatePath("/lots");
  redirect(`/lots/${code}`);
}

export async function deleteLot(fd: FormData) {
  m.deleteLot(s(fd.get("code")));
  revalidatePath("/lots");
  redirect("/lots");
}

/* ----------------------------------------------------------------- projets */

export async function createProject(fd: FormData) {
  const code = m.createProject({
    name: s(fd.get("name")), description: s(fd.get("description")),
    color: s(fd.get("color")), status: s(fd.get("status")),
  });
  revalidatePath("/projets");
  redirect(`/projets/${code}`);
}

export async function updateProject(fd: FormData) {
  const code = s(fd.get("code"));
  m.updateProject(code, {
    name: s(fd.get("name")), description: s(fd.get("description")),
    color: s(fd.get("color")), status: s(fd.get("status")),
  });
  revalidatePath("/projets");
  redirect(`/projets/${code}`);
}

export async function deleteProject(fd: FormData) {
  m.deleteProject(s(fd.get("code")));
  revalidatePath("/projets");
  redirect("/projets");
}
