import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { db, photoDir, row } from "@/lib/db";
import { setPhoto } from "@/lib/mutations";
import { kindOf } from "@/lib/codes";

export const dynamic = "force-dynamic";

const MAX = 2 * 1024 * 1024; // le client redimensionne déjà ; garde-fou serveur

function photoOf(code: string): string | null {
  const r = db.prepare("SELECT photo FROM items WHERE code = ?").get(code);
  const name = r ? row<{ photo: string }>(r).photo : "";
  return name || null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const name = photoOf(code.toUpperCase());
  if (!name) return new Response("pas de photo", { status: 404 });
  try {
    const buf = await readFile(join(photoDir(), name));
    return new Response(buf, {
      headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" },
    });
  } catch {
    return new Response("introuvable", { status: 404 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  if (kindOf(code) !== "item") return NextResponse.json({ error: "code invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const dataUrl = typeof body?.photo === "string" ? body.photo : "";
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    return NextResponse.json({ error: "photo attendue en JPEG" }, { status: 400 });
  }

  const buf = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
  if (buf.length === 0 || buf.length > MAX) {
    return NextResponse.json({ error: "photo vide ou trop lourde" }, { status: 400 });
  }

  // Le nom porte l'horodatage : le navigateur ne resservira pas l'ancienne image.
  const name = `${code}-${Date.now().toString(36)}.jpg`;
  await mkdir(photoDir(), { recursive: true });
  await writeFile(join(photoDir(), name), buf);
  setPhoto(code, name);

  return NextResponse.json({ ok: true });
}
