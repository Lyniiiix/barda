import Link from "next/link";
import { notFound } from "next/navigation";
import LabelButton from "@/components/LabelButton";
import { deleteLot, updateLot } from "@/lib/actions";
import { LOT_KINDS } from "@/lib/constants";
import { getLotByCode, listItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LotDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lot = getLotByCode(code.toUpperCase());
  if (!lot) notFound();
  const items = listItems({ lot: lot.code });

  return (
    <>
      <Link className="back" href="/lots">‹ Lots</Link>

      <div className="topbar">
        <div>
          <h1>📦 {lot.name}</h1>
          <div className="sub">{[lot.kind, lot.place].filter(Boolean).join(" · ")} <span className="code">{lot.code}</span></div>
        </div>
      </div>

      {lot.description && <div className="card"><div className="card-desc" style={{ marginTop: 0 }}>{lot.description}</div></div>}

      <div className="row" style={{ marginBottom: 12 }}>
        <Link className="btn primary wide" href={`/scan?lot=${lot.code}`}>📷 Ranger ici</Link>
        <Link className="btn wide" href={`/objets/nouveau?lot=${lot.code}`}>＋ Objet</Link>
      </div>

      <div className="card-sub" style={{ marginBottom: 6 }}>{items.length} objet{items.length > 1 ? "s" : ""}</div>
      {items.map((i) => (
        <Link key={i.code} className="card tap" href={`/objets/${i.code}`}>
          <div className="card-title">
            {i.name}
            {i.qty !== 1 && <span className="muted small">× {i.qty} {i.unit}</span>}
          </div>
          {(i.category || i.projects) && (
            <div className="card-sub">{[i.category, i.projects && `🎯 ${i.projects}`].filter(Boolean).join(" · ")}</div>
          )}
        </Link>
      ))}
      {items.length === 0 && <div className="card center muted small">Lot vide.</div>}

      <LabelButton code={lot.code} name={lot.name} sub={[lot.kind, lot.place].filter(Boolean).join(" · ")} />

      <hr className="sep" />

      <form action={updateLot}>
        <input type="hidden" name="code" value={lot.code} />
        <div className="card-sub" style={{ marginBottom: 8 }}>Modifier le lot</div>
        <div className="field">
          <label>Nom</label>
          <input name="name" defaultValue={lot.name} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>Type</label>
            <select name="kind" defaultValue={lot.kind}>
              <option value="">—</option>
              {Array.from(new Set([...(lot.kind ? [lot.kind] : []), ...LOT_KINDS])).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Où</label>
            <input name="place" defaultValue={lot.place} />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea name="description" defaultValue={lot.description} />
        </div>
        <button className="btn primary wide" type="submit">Enregistrer</button>
      </form>

      <form action={deleteLot} style={{ marginTop: 10 }}>
        <input type="hidden" name="code" value={lot.code} />
        <button className="btn danger wide" type="submit">Supprimer le lot (les objets restent)</button>
      </form>
    </>
  );
}
