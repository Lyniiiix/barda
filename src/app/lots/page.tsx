import Link from "next/link";
import { createLot } from "@/lib/actions";
import { LOT_KINDS } from "@/lib/constants";
import { listLots } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function Lots() {
  const lots = listLots();
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Lots</h1>
          <div className="sub">Sacs, caisses, tiroirs — là où sont rangées les choses</div>
        </div>
      </div>

      {lots.map((l) => (
        <Link key={l.code} className="card tap" href={`/lots/${l.code}`}>
          <div className="card-title">
            📦 {l.name}
            <span className="muted small" style={{ marginLeft: "auto" }}>{l.n_items} objet{l.n_items > 1 ? "s" : ""}</span>
          </div>
          <div className="card-sub">
            {[l.kind, l.place].filter(Boolean).join(" · ") || "—"} <span className="code">{l.code}</span>
          </div>
          {l.description && <div className="card-desc">{l.description.slice(0, 100)}</div>}
        </Link>
      ))}

      {lots.length === 0 && <div className="card center muted small">Aucun lot. Le premier s&apos;appellera « Lot 1 ».</div>}

      <hr className="sep" />

      <form action={createLot}>
        <div className="card-sub" style={{ marginBottom: 8 }}>Nouveau lot</div>
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
    </>
  );
}
