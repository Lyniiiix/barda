import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { db, photoDir, row } from "@/lib/db";
import { setPhoto } from "@/lib/mutations";
import { kindOf } from "@/lib/codes";

export const dynamic = "force-dynamic";

const MAX = 3 * 1024 * 1024; // le client redimensionne déjà ; garde-fou serveur

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
};

const mimeOf = (name: string) =>
  Object.entries(TYPES).find(([, ext]) => name.endsWith(`.${ext}`))?.[0] ?? "image/jpeg";

/** Récupère une image déposée par son adresse — le navigateur ne peut pas, à cause de CORS. */
async function fetchImage(url: string): Promise<{ buf: Buffer; ext: string }> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error("adresse invalide"); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("adresse invalide");

  const res = await fetch(parsed, {
    headers: { "user-agent": "barda/1.0 (inventaire personnel)", accept: "image/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`la source a répondu ${res.status}`);

  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const ext = TYPES[type];
  if (!ext) throw new Error(`ce n'est pas une image (${type || "type inconnu"})`);

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error("image vide");
  if (buf.length > MAX) throw new Error("image trop lourde");
  return { buf, ext };
}

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
      headers: { "content-type": mimeOf(name), "cache-control": "private, max-age=86400" },
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

  let buf: Buffer;
  let ext = "jpg";
  if (typeof body?.url === "string" && body.url) {
    try {
      ({ buf, ext } = await fetchImage(body.url));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "échec" }, { status: 400 });
    }
    // Unsplash demande de signaler l'usage réel d'une photo. On le fait sans
    // bloquer : si l'appel échoue, la photo est quand même enregistrée.
    if (typeof body?.telechargement === "string" && process.env.UNSPLASH_ACCESS_KEY) {
      void fetch(body.telechargement, {
        headers: { authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` },
        signal: AbortSignal.timeout(8_000),
      }).catch(() => {});
    }
  } else {
    const dataUrl = typeof body?.photo === "string" ? body.photo : "";
    if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
      return NextResponse.json({ error: "photo attendue en JPEG" }, { status: 400 });
    }
    buf = Buffer.from(dataUrl.split(",")[1] ?? "", "base64");
    if (buf.length === 0 || buf.length > MAX) {
      return NextResponse.json({ error: "photo vide ou trop lourde" }, { status: 400 });
    }
  }

  // Le nom porte l'horodatage : le navigateur ne resservira pas l'ancienne image.
  const name = `${code}-${Date.now().toString(36)}.${ext}`;
  await mkdir(photoDir(), { recursive: true });
  await writeFile(join(photoDir(), name), buf);
  setPhoto(code, name, typeof body?.credit === "string" ? body.credit.slice(0, 120) : "");

  return NextResponse.json({ ok: true });
}
