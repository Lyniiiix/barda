import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Propose des images depuis Wikipédia. **Des propositions, jamais un choix
 * automatique** : la recherche est bonne sur le générique (« fer à souder ») et
 * franchement mauvaise ailleurs — « tresse à dessouder » renvoie le dieu Seth.
 * C'est à l'œil humain de trancher.
 */
type Suggestion = {
  titre: string; image: string; source: string;
  credit?: string; telechargement?: string;
};

/**
 * Unsplash — de belles photos génériques, à la manière des couvertures Notion.
 * Nécessite une clé gratuite (unsplash.com/developers) dans `UNSPLASH_ACCESS_KEY` ;
 * sans elle, on se rabat simplement sur Wikipédia.
 */
async function unsplash(q: string): Promise<Suggestion[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const url = "https://api.unsplash.com/search/photos?" + new URLSearchParams({
    query: q, per_page: "4", orientation: "squarish", content_filter: "high",
  });
  const res = await fetch(url, {
    headers: { authorization: `Client-ID ${key}`, "accept-version": "v1" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];

  const data = await res.json().catch(() => null);
  return (data?.results ?? []).map((r: {
    description?: string; alt_description?: string;
    urls?: { small?: string }; user?: { name?: string };
    links?: { download_location?: string };
  }) => ({
    titre: r.alt_description ?? r.description ?? q,
    image: String(r.urls?.small ?? ""),
    source: "Unsplash",
    credit: r.user?.name ? `Photo de ${r.user.name} sur Unsplash` : "Unsplash",
    telechargement: r.links?.download_location,
  })).filter((s: Suggestion) => s.image);
}

async function wikipedia(q: string, lang: string): Promise<Suggestion[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
    action: "query", format: "json", origin: "*",
    prop: "pageimages", piprop: "thumbnail", pithumbsize: "500",
    generator: "search", gsrsearch: q, gsrlimit: "5",
  });

  const res = await fetch(url, {
    headers: { "user-agent": "barda/1.0 (inventaire personnel; usage privé)" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];

  const data = await res.json().catch(() => null);
  const pages = data?.query?.pages ?? {};
  return Object.values(pages)
    .map((p) => p as { title?: string; thumbnail?: { source?: string } })
    .filter((p) => p.thumbnail?.source)
    .map((p) => ({
      titre: String(p.title),
      image: String(p.thumbnail!.source),
      source: `${lang}.wikipedia.org`,
    }));
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    // Unsplash d'abord : plus joli et plus régulier sur les objets du quotidien.
    // Wikipédia derrière : plus juste sur le vocabulaire technique précis.
    const [libre, encyclo] = await Promise.all([
      unsplash(q).catch(() => []),
      wikipedia(q, "fr").catch(() => []),
    ]);
    let suggestions = [...libre, ...encyclo];
    if (suggestions.length === 0) suggestions = await wikipedia(q, "en").catch(() => []);
    return NextResponse.json({ suggestions: suggestions.slice(0, 6), unsplash: !!process.env.UNSPLASH_ACCESS_KEY });
  } catch {
    // Wikipédia limite le débit : mieux vaut une liste vide qu'une page en erreur.
    return NextResponse.json({ suggestions: [] });
  }
}
