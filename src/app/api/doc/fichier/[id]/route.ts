import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { docDir } from "@/lib/db";
import { getDoc } from "@/lib/docs";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", png: "image/png", txt: "text/plain; charset=utf-8",
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const doc = getDoc(Number(id));
  if (!doc?.file) return new Response("introuvable", { status: 404 });

  try {
    const buf = await readFile(join(docDir(), doc.file));
    const ext = doc.file.split(".").pop() ?? "";
    return new Response(buf, {
      headers: {
        "content-type": TYPES[ext] ?? "application/octet-stream",
        // `inline` : la notice s'ouvre dans l'app, sans détour par les fichiers.
        "content-disposition": `inline; filename="${encodeURIComponent(doc.label || doc.file)}"`,
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("fichier manquant", { status: 404 });
  }
}
