import Link from "next/link";
import { MapPin, Package, PackageOpen } from "lucide-react";
import { createLot } from "@/lib/actions";
import { LOT_KINDS } from "@/lib/constants";
import { listLots } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lots" };

export default function Lots() {
  const lots = listLots();
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Lots</h1>
          <div className="sub">Sacs, caisses, tiroirs : là où sont rangées les choses</div>
        </div>
      </div>

      <div className="split">
        <div>
          {lots.length === 0 ? (
            <div className="card empty">
              <PackageOpen size={26} strokeWidth={1.6} aria-hidden />
              Aucun lot. Le premier s&apos;appellera « Lot 1 ».
            </div>
          ) : (
            <div className="cards">
              {lots.map((l) => (
                <Link key={l.code} className="card tap" href={`/lots/${l.code}`}>
                  <div className="with-avatar">
                    <span className="avatar icon" style={{ width: 46, height: 46 }}><Package size={21} strokeWidth={1.75} aria-hidden /></span>
                    <div>
                      <div className="card-title">
                        <span className="name">{l.name}</span>
                        <span className="chip" style={{ marginLeft: "auto" }}>{l.n_items} objet{l.n_items > 1 ? "s" : ""}</span>
                      </div>
                      <div className="card-sub">
                        {l.kind && <span className="meta">{l.kind}</span>}
                        {l.place && <span className="meta"><MapPin size={13} strokeWidth={2} aria-hidden />{l.place}</span>}
                        <span className="code" style={{ marginLeft: "auto" }}>{l.code}</span>
                      </div>
                      {l.description && <div className="card-desc">{l.description.slice(0, 100)}</div>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <form action={createLot} className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Nouveau lot</div>
          <div className="field">
            <label>Nom (vide = Lot {lots.length + 1})</label>
            <input name="name" placeholder={`Lot ${lots.length + 1}`} />
          </div>
          <div className="grid2">
            <div className="field">
              <label>Type</label>
              <select name="kind" defaultValue="">
                <option value="">—</option>
                {LOT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Où</label>
              <input name="place" placeholder="coffre, garage…" />
            </div>
          </div>
          <div className="field">
            <label>Description</label>
            <textarea name="description" placeholder="Sac gris à roulettes, sangle rouge…" />
          </div>
          <button className="btn primary wide" type="submit">Créer le lot</button>
        </form>
      </div>
    </>
  );
}
