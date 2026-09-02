import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { docDir } from "@/lib/db";
import { addFile, addLink } from "@/lib/docs";
import { kindOf } from "@/lib/codes";

export const dynamic = "force-dynamic";

const MAX = 25 * 1024 * 1024;

const EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "text/plain": "txt",
};

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = raw.toUpperCase();
  if (!kindOf(code)) return NextResponse.json({ error: "code invalide" }, { status: 400 });

  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim();

  // Un lien arrive en JSON, un fichier arrive tel quel dans le corps.
  if (type === "application/json") {
    const body = await req.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "adresse http(s) attendue" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: addLink(code, String(body?.label ?? ""), url) });
  }

  const ext = EXT[type];
  if (!ext) {
    return NextResponse.json(
      { error: `type non accepté (${type || "inconnu"}) — PDF, image ou texte` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length === 0) return NextResponse.json({ error: "fichier vide" }, { status: 400 });
  if (buf.length > MAX) return NextResponse.json({ error: "fichier trop lourd (25 Mo max)" }, { status: 400 });

  const name = `${code}-${Date.now().toString(36)}.${ext}`;
  await mkdir(docDir(), { recursive: true });
  await writeFile(join(docDir(), name), buf);

  const label = decodeURIComponent(req.headers.get("x-barda-label") ?? "").slice(0, 120);
  return NextResponse.json({ ok: true, id: addFile(code, label, name, buf.length) });
}
