import { pngOf } from "@/lib/print";

export const dynamic = "force-dynamic";

/** Sert l'image d'une étiquette en file, pour l'afficher sans alourdir la page. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const png = pngOf(Number(id));
  if (!png) return new Response("introuvable", { status: 404 });

  const base64 = png.split(",")[1] ?? "";
  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "content-type": "image/png",
      // L'image d'une ligne de file ne change pas : inutile de la redemander.
      "cache-control": "private, max-age=3600",
    },
  });
}
