import Link from "next/link";
import { categoriesUsed, listItems, listLots, listProjects } from "@/lib/queries";
import { STATUSES } from "@/lib/constants";
import ItemAvatar from "@/components/ItemAvatar";

export const dynamic = "force-dynamic";

export default async function Objets({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const filter = {
    q: sp.q, lot: sp.lot, project: sp.project, category: sp.category,
    status: sp.status, sansLot: sp.sansLot === "1", aRacheter: sp.aRacheter === "1",
  };
  const items = listItems(filter);
  const lots = listLots();
  const projects = listProjects();
  const cats = categoriesUsed();

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp as Record<string, string>);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || p.get(k) === v) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/objets?${s}` : "/objets";
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Objets</h1>
          <div className="sub">{items.length} affiché{items.length > 1 ? "s" : ""}</div>
        </div>
        <div className="spacer" />
        <Link className="btn sm primary" href="/objets/nouveau">＋</Link>
      </div>

      <form className="search" action="/objets">
        {Object.entries(sp).filter(([k]) => k !== "q").map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Chercher…" enterKeyHint="search" autoComplete="off" />
      </form>

      <div className="chips scroll">
        <Link className={`chip ${sp.aRacheter === "1" ? "on" : ""}`} href={qs({ aRacheter: "1" })}>🛒 à racheter</Link>
        <Link className={`chip ${filter.sansLot ? "on" : ""}`} href={qs({ sansLot: "1" })}>sans lot</Link>
        {lots.map((l) => (
          <Link key={l.code} className={`chip ${sp.lot === l.code ? "on" : ""}`} href={qs({ lot: l.code })}>📦 {l.name}</Link>
        ))}
      </div>
      <div className="chips scroll">
        {projects.map((p) => (
          <Link key={p.code} className={`chip ${sp.project === p.code ? "on" : ""}`} href={qs({ project: p.code })}>🎯 {p.name}</Link>
        ))}
        {cats.map((c) => (
          <Link key={c} className={`chip ${sp.category === c ? "on" : ""}`} href={qs({ category: c })}>{c}</Link>
        ))}
        {STATUSES.filter((s) => s !== "ok").map((s) => (
          <Link key={s} className={`chip ${sp.status === s ? "on" : ""}`} href={qs({ status: s })}>{s}</Link>
        ))}
      </div>

      <div style={{ height: 12 }} />

      {items.length === 0 && <div className="card center muted small">Aucun objet ne correspond.</div>}

      {items.map((i) => (
        <Link key={i.code} className="card tap" href={`/objets/${i.code}`}>
          <div className="with-avatar">
            <ItemAvatar code={i.code} photo={i.photo} category={i.category} />
            <div>
              <div className="card-title">
                {i.name}
                {i.qty !== 1 && <span className="muted small">× {i.qty} {i.unit}</span>}
                <span className="spacer" style={{ marginLeft: "auto" }} />
                {i.a_racheter ? <span className="chip warn">🛒</span> : null}
                {i.status !== "ok" && (
                  <span className={`chip ${i.status === "manquant" ? "bad" : "warn"}`}>{i.status}</span>
                )}
              </div>
              <div className="card-sub">
                {i.lot_name ? `📦 ${i.lot_name}` : "sans lot"}
                {i.category && ` · ${i.category}`}
                {i.projects && ` · 🎯 ${i.projects}`}
              </div>
              {i.description && <div className="card-desc">{i.description.slice(0, 120)}</div>}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
