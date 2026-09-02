"use server";

import { revalidatePath } from "next/cache";
import * as p from "./print";

export async function queueLabel(
  code: string, label: string, png: string, copies: number, target: "file" | "relais" = "file",
) {
  const r = p.addToBasket(code, label, png, copies, target);
  revalidatePath("/impression");
  revalidatePath("/");
  return r;
}

/** Renvoie les images : c'est le navigateur (ou l'app) qui parle à l'imprimante. */
export async function basketForPrinting() {
  return p.basket().map((j) => ({ ...j, png: p.pngOf(j.id) ?? "" })).filter((j) => j.png);
}

export async function markJobsPrinted(ids: number[]) {
  p.markPrinted(ids);
  revalidatePath("/impression");
  revalidatePath("/");
  return { ok: true };
}

export async function setJobCopies(fd: FormData) {
  p.setCopies(Number(fd.get("id")), Number(fd.get("copies")));
  revalidatePath("/impression");
}

export async function moveJobTo(fd: FormData) {
  const target = String(fd.get("target")) === "relais" ? "relais" : "file";
  p.moveJob(Number(fd.get("id")), target);
  revalidatePath("/impression");
  revalidatePath("/");
}

export async function removeJob(fd: FormData) {
  p.remove(Number(fd.get("id")));
  revalidatePath("/impression");
  revalidatePath("/");
}

export async function clearPrintBasket() {
  p.clearBasket();
  revalidatePath("/impression");
  revalidatePath("/");
}

export async function sendBasketToRelay() {
  p.sendBasketToRelay();
  revalidatePath("/impression");
  revalidatePath("/");
}
