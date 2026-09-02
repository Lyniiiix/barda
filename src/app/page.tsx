import Link from "next/link";
import { listItems, listLots, stats } from "@/lib/queries";
import { countLabels } from "@/lib/print";

export const dynamic = "force-dynamic";

export default function Home() {
  const st = stats();
  const enFile = countLabels("file");
  const recents = listItems().slice(0, 6);
  const lots = listLots();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Barda</h1>
          <div className="sub">Ce que j&apos;ai, et où c&apos;est</div>
        </div>
        <div className="spacer" />
        <Link className="btn sm" href="/reglages">⚙︎</Link>
      </div>

      <form action="/objets" className="search">
        <input name="q" placeholder="Chercher un objet…" autoComplete="off" enterKeyHint="search" />
      </form>

      <div className="grid3" style={{ marginBottom: 10 }}>
        <Link className="stat" href="/objets"><b>{st.items}</b><span>objets</span></Link>
        <Link className="stat" href="/lots"><b>{st.lots}</b><span>lots</span></Link>
        <Link className="stat" href="/projets"><b>{st.projects}</b><span>projets</span></Link>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link className="btn primary wide" href="/scan">📷 Scanner</Link>
        <Link className="btn wide" href="/objets/nouveau">＋ Objet</Link>
      </div>

      {enFile > 0 && (
        <Link className="card tap" href="/impression" style={{ borderColor: "var(--accent)" }}>
          <div className="card-title">
            🖨 {enFile} étiquette{enFile > 1 ? "s" : ""} en attente d&apos;impression
          </div>
          <div className="card-sub">Rien ne sort tant que tu ne l&apos;as pas demandé.</div>
        </Link>
      )}

      {(st.sansLot > 0 || st.aVoir > 0 || st.aRacheter > 0) && (
        <div className="chips" style={{ marginBottom: 14 }}>
          {st.sansLot > 0 && <Link className="chip warn" href="/objets?sansLot=1">{st.sansLot} sans lot</Link>}
          {st.aVoir > 0 && <Link className="chip bad" href="/objets?status=manquant">{st.aVoir} à surveiller</Link>}
          {st.aRacheter > 0 && <Link className="chip warn" href="/courses">🛒 {st.aRacheter} à racheter</Link>}
        </div>
      )}

      {lots.length > 0 && (
        <>
          <div className="card-sub" style={{ marginBottom: 6 }}>Lots</div>
          <div className="chips scroll" style={{ marginBottom: 14 }}>
            {lots.map((l) => (
              <Link key={l.code} className="chip" href={`/lots/${l.code}`}>
                📦 {l.name} · {l.n_items}
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="card-sub" style={{ marginBottom: 6 }}>Derniers objets</div>
      {recents.length === 0 && (
        <div className="card center muted small">
          Rien pour l&apos;instant. <Link href="/objets/nouveau" style={{ color: "var(--accent)" }}>Ajouter un premier objet</Link>
        </div>
      )}
      {recents.map((i) => (
        <Link key={i.code} className="card tap" href={`/objets/${i.code}`}>
          <div className="card-title">
            {i.name}
            <span className="code">{i.code}</span>
          </div>
          <div className="card-sub">
            {i.qty} {i.unit}
            {i.category && ` · ${i.category}`}
            {i.lot_name ? ` · 📦 ${i.lot_name}` : " · sans lot"}
          </div>
        </Link>
      ))}
    </>
  );
}
