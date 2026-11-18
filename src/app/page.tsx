import Link from "next/link";
import {
  ChevronRight, CircleAlert, Package, Plus, Printer, ScanQrCode, Search, Settings, ShoppingCart,
  Target, Wrench,
} from "lucide-react";
import { listItems, listLots, stats } from "@/lib/queries";
import { countLabels } from "@/lib/print";
import ItemCard from "@/components/ItemCard";
import Wordmark from "@/components/Wordmark";

export const dynamic = "force-dynamic";

export default function Home() {
  const st = stats();
  const enFile = countLabels("file");
  const recents = listItems().slice(0, 8);
  const lots = listLots();

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="only-mobile"><Wordmark size={34} /></h1>
          <h1 className="only-desktop">Accueil</h1>
          <div className="sub">Ce que j&apos;ai, et où c&apos;est</div>
        </div>
        <div className="spacer" />
        <Link className="btn icon" href="/reglages" aria-label="Réglages"><Settings size={19} strokeWidth={1.9} aria-hidden /></Link>
      </div>

      <form action="/objets" className="search">
        <Search size={18} strokeWidth={2} aria-hidden />
        <input name="q" placeholder="Chercher un objet…" autoComplete="off" enterKeyHint="search" />
      </form>

      <div className="cards dense" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", marginBottom: 14 }}>
        <Link className="stat" href="/objets"><Wrench className="ico" size={18} aria-hidden /><b>{st.items}</b><span>objets</span></Link>
        <Link className="stat" href="/lots"><Package className="ico" size={18} aria-hidden /><b>{st.lots}</b><span>lots</span></Link>
        <Link className="stat" href="/projets"><Target className="ico" size={18} aria-hidden /><b>{st.projects}</b><span>projets</span></Link>
        <Link className="stat" href="/courses"><ShoppingCart className="ico" size={18} aria-hidden /><b>{st.aRacheter}</b><span>à racheter</span></Link>
      </div>

      <div className="actions" style={{ marginBottom: 16 }}>
        <Link className="btn primary" href="/scan"><ScanQrCode size={19} strokeWidth={2} aria-hidden />Scanner</Link>
        <Link className="btn" href="/objets/nouveau"><Plus size={19} strokeWidth={2} aria-hidden />Nouvel objet</Link>
      </div>

      {enFile > 0 && (
        <Link className="card tap accent" href="/impression">
          <div className="card-title">
            <Printer size={18} strokeWidth={2} aria-hidden />
            {enFile} étiquette{enFile > 1 ? "s" : ""} en attente d&apos;impression
            <ChevronRight size={18} style={{ marginLeft: "auto" }} aria-hidden />
          </div>
          <div className="card-sub">Rien ne sort tant que tu ne l&apos;as pas demandé.</div>
        </Link>
      )}

      {(st.sansLot > 0 || st.aVoir > 0) && (
        <div className="chips" style={{ marginBottom: 6 }}>
          {st.sansLot > 0 && (
            <Link className="chip warn" href="/objets?sansLot=1">
              <Package size={13} strokeWidth={2.2} aria-hidden />{st.sansLot} sans lot
            </Link>
          )}
          {st.aVoir > 0 && (
            <Link className="chip bad" href="/objets?status=manquant">
              <CircleAlert size={13} strokeWidth={2.2} aria-hidden />{st.aVoir} à surveiller
            </Link>
          )}
        </div>
      )}

      <div className="split">
        <section>
          <div className="section-title">
            Derniers objets
            <Link className="more" href="/objets">Tout voir</Link>
          </div>
          {recents.length === 0 ? (
            <div className="card empty">
              <Wrench size={26} strokeWidth={1.6} aria-hidden />
              Rien pour l&apos;instant.
              <Link className="btn sm primary" href="/objets/nouveau"><Plus size={15} aria-hidden />Ajouter un premier objet</Link>
            </div>
          ) : (
            <div className="cards">
              {recents.map((i) => <ItemCard key={i.code} item={i} />)}
            </div>
          )}
        </section>

        {lots.length > 0 && (
          <section>
            <div className="section-title">
              Lots
              <Link className="more" href="/lots">Tout voir</Link>
            </div>
            <div className="stack" style={{ gap: 10 }}>
              {lots.map((l) => (
                <Link key={l.code} className="card tap" href={`/lots/${l.code}`}>
                  <div className="card-title">
                    <span className="avatar icon" style={{ width: 36, height: 36 }}><Package size={17} strokeWidth={1.8} aria-hidden /></span>
                    <span className="name">{l.name}</span>
                    <span className="muted small" style={{ marginLeft: "auto", fontWeight: 500 }}>{l.n_items}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
