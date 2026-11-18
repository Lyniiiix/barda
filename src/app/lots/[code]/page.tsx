import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Package, PackageOpen, Plus, ScanQrCode, Trash2 } from "lucide-react";
import LabelButton from "@/components/LabelButton";
import ItemCard from "@/components/ItemCard";
import { deleteLot, updateLot } from "@/lib/actions";
import { LOT_KINDS } from "@/lib/constants";
import { getLotByCode, listItems } from "@/lib/queries";
import { lastPrinted } from "@/lib/print";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const lot = getLotByCode((await params).code.toUpperCase());
  return { title: lot?.name ?? "Lot" };
}

export default async function LotDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const lot = getLotByCode(code.toUpperCase());
  if (!lot) notFound();
  const items = listItems({ lot: lot.code });

  return (
    <>
      <Link className="back" href="/lots"><ChevronLeft size={16} aria-hidden />Lots</Link>

      <div className="topbar">
        <span className="avatar icon big" style={{ width: 64, height: 64 }}><Package size={28} strokeWidth={1.6} aria-hidden /></span>
        <div style={{ minWidth: 0 }}>
          <h1>{lot.name}</h1>
          <div className="sub" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {lot.kind && <span>{lot.kind}</span>}
            {lot.place && <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><MapPin size={13} aria-hidden />{lot.place}</span>}
            <span className="code">{lot.code}</span>
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          {lot.description && <div className="card"><div className="card-desc" style={{ marginTop: 0, color: "var(--fg-2)" }}>{lot.description}</div></div>}

          <div className="actions">
            <Link className="btn primary" href={`/scan?lot=${lot.code}`}><ScanQrCode size={18} aria-hidden />Ranger ici</Link>
            <Link className="btn" href={`/objets/nouveau?lot=${lot.code}`}><Plus size={18} aria-hidden />Objet</Link>
          </div>

          <div className="section-title" style={{ marginBottom: 0 }}>{items.length} objet{items.length > 1 ? "s" : ""}</div>
          {items.length === 0 ? (
            <div className="card empty"><PackageOpen size={26} strokeWidth={1.6} aria-hidden />Lot vide.</div>
          ) : (
            <div className="cards">
              {items.map((i) => <ItemCard key={i.code} item={i} hide={["lot"]} />)}
            </div>
          )}
        </div>

        <div className="stack">
          <LabelButton code={lot.code} name={lot.name} sub={[lot.kind, lot.place].filter(Boolean).join(" · ")}
                       lastPrinted={lastPrinted(lot.code)} />

          <form action={updateLot} className="card">
            <input type="hidden" name="code" value={lot.code} />
            <div className="section-title" style={{ marginTop: 0 }}>Modifier le lot</div>
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

          <form action={deleteLot}>
            <input type="hidden" name="code" value={lot.code} />
            <button className="btn danger wide" type="submit"><Trash2 size={16} aria-hidden />Supprimer le lot (les objets restent)</button>
          </form>
        </div>
      </div>
    </>
  );
}
