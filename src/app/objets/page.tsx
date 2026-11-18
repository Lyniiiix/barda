import Link from "next/link";
import { CalendarDays, Package, Plus, Search, SearchX, ShoppingCart, Target } from "lucide-react";
import { categoriesUsed, listItems, listLots, listProjects, purchaseDates } from "@/lib/queries";
import { printedCodes } from "@/lib/print";
import { STATUSES } from "@/lib/constants";
import ItemCard from "@/components/ItemCard";
import LabelBatch from "@/components/LabelBatch";

export const dynamic = "force-dynamic";
export const metadata = { title: "Objets" };

export default async function Objets({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const filter = {
    q: sp.q, lot: sp.lot, project: sp.project, category: sp.category,
    status: sp.status, sansLot: sp.sansLot === "1", aRacheter: sp.aRacheter === "1",
    achat: sp.achat,
  };
  const items = listItems(filter);
  const lots = listLots();
  const projects = listProjects();
  const cats = categoriesUsed();
  const commandes = purchaseDates();
  const filtered = Object.keys(sp).some((k) => sp[k]);
  // L'étiquetage en série ne s'offre que sur une sélection raisonnable : une commande,
  // un lot, une recherche. Jamais sur l'inventaire entier par accident.
  const printed = filtered && items.length > 0 && items.length <= 60 ? printedCodes() : null;

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || p.get(k) === v) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/objets?${s}` : "/objets";
  };
  const i13 = { size: 13, strokeWidth: 2.1, "aria-hidden": true } as const;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Objets</h1>
          <div className="sub">{items.length} affiché{items.length > 1 ? "s" : ""}</div>
        </div>
        <div className="spacer" />
        <Link className="btn primary" href="/objets/nouveau"><Plus size={18} strokeWidth={2.2} aria-hidden />Ajouter</Link>
      </div>

      <form className="search" action="/objets">
        {Object.entries(sp).filter(([k]) => k !== "q").map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Search size={18} strokeWidth={2} aria-hidden />
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Chercher…" enterKeyHint="search" autoComplete="off" />
      </form>

      <div className="chips scroll">
        {commandes.map((c) => (
          <Link key={c.date} className={`chip ${sp.achat === c.date ? "on" : ""}`} href={qs({ achat: c.date })}>
            <CalendarDays {...i13} />reçu le {new Date(c.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })} · {c.n}
          </Link>
        ))}
        <Link className={`chip ${sp.aRacheter === "1" ? "on" : ""}`} href={qs({ aRacheter: "1" })}><ShoppingCart {...i13} />à racheter</Link>
        <Link className={`chip ${filter.sansLot ? "on" : ""}`} href={qs({ sansLot: "1" })}>sans lot</Link>
        {lots.map((l) => (
          <Link key={l.code} className={`chip ${sp.lot === l.code ? "on" : ""}`} href={qs({ lot: l.code })}><Package {...i13} />{l.name}</Link>
        ))}
      </div>
      <div className="chips scroll" style={{ marginTop: 6 }}>
        {projects.map((p) => (
          <Link key={p.code} className={`chip ${sp.project === p.code ? "on" : ""}`} href={qs({ project: p.code })}><Target {...i13} />{p.name}</Link>
        ))}
        {cats.map((c) => (
          <Link key={c} className={`chip ${sp.category === c ? "on" : ""}`} href={qs({ category: c })}>{c}</Link>
        ))}
        {STATUSES.filter((s) => s !== "ok").map((s) => (
          <Link key={s} className={`chip ${sp.status === s ? "on" : ""}`} href={qs({ status: s })}>{s}</Link>
        ))}
      </div>

      <div style={{ height: 16 }} />

      {printed && (
        <LabelBatch items={items.map((i) => ({
          code: i.code, name: i.name, sub: i.lot_name || i.category, printed: printed.has(i.code),
        }))} />
      )}

      {items.length === 0 ? (
        <div className="card empty">
          <SearchX size={26} strokeWidth={1.6} aria-hidden />
          Aucun objet ne correspond.
        </div>
      ) : (
        <div className="cards">
          {items.map((i) => <ItemCard key={i.code} item={i} desc />)}
        </div>
      )}
    </>
  );
}
