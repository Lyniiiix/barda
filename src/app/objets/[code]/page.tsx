import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Barcode, CalendarDays, Check, ChevronLeft, Minus, Package, Pencil, Plus, RefreshCw, ShoppingCart,
  Tag, Target,
} from "lucide-react";
import LabelButton from "@/components/LabelButton";
import { bumpQty, toggleRestock } from "@/lib/actions";
import ItemAvatar from "@/components/ItemAvatar";
import PhotoPicker from "@/components/PhotoPicker";
import { restockReason } from "@/lib/queries";
import { getItemByCode } from "@/lib/queries";
import { lastPrinted } from "@/lib/print";
import Documents from "@/components/Documents";
import { listDocs } from "@/lib/docs";
import { statusTone } from "@/components/ItemCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const item = getItemByCode((await params).code.toUpperCase());
  return { title: item?.name ?? "Objet" };
}

export default async function Objet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = getItemByCode(code.toUpperCase());
  if (!item) notFound();
  const i13 = { size: 13, strokeWidth: 2.1, "aria-hidden": true } as const;
  const date = (d: string) => new Date(d).toLocaleDateString("fr-FR");

  return (
    <>
      <Link className="back" href="/objets"><ChevronLeft size={16} aria-hidden />Objets</Link>

      <div className="topbar">
        <ItemAvatar code={item.code} photo={item.photo} category={item.category} size={64} />
        <div style={{ minWidth: 0 }}>
          <h1>{item.name}</h1>
          <div className="sub code">{item.code}</div>
        </div>
        <div className="spacer" />
        <Link className="btn sm" href={`/objets/${item.code}/modifier`}><Pencil size={15} aria-hidden />Modifier</Link>
      </div>

      <div className="split">
        <div className="stack">
          <div className="card">
            <div className="row">
              <form action={bumpQty}>
                <input type="hidden" name="code" value={item.code} />
                <input type="hidden" name="delta" value="-1" />
                <button className="btn sm icon" type="submit" aria-label="Retirer un"><Minus size={16} aria-hidden /></button>
              </form>
              <b style={{ fontSize: 26, fontWeight: 650, fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "center" }}>{item.qty}</b>
              <span className="muted">{item.unit}</span>
              <form action={bumpQty}>
                <input type="hidden" name="code" value={item.code} />
                <input type="hidden" name="delta" value="1" />
                <button className="btn sm icon" type="submit" aria-label="Ajouter un"><Plus size={16} aria-hidden /></button>
              </form>
              <span style={{ marginLeft: "auto" }} className={`chip ${statusTone(item.status)}`}>{item.status}</span>
            </div>

            {item.description && <div className="card-desc" style={{ marginTop: 12, color: "var(--fg-2)" }}>{item.description}</div>}

            <div className="chips">
              {item.a_racheter ? <span className="chip warn"><ShoppingCart {...i13} />{restockReason(item)}</span> : null}
              {item.min_qty > 0 && <span className="chip">seuil : {item.min_qty} {item.unit}</span>}
              {item.lot_code
                ? <Link className="chip" href={`/lots/${item.lot_code}`}><Package {...i13} />{item.lot_name}</Link>
                : <span className="chip warn"><Package {...i13} />sans lot</span>}
              {item.category && <span className="chip"><Tag {...i13} />{item.category}</span>}
              {item.projects && item.projects.split(" · ").map((p) => <span key={p} className="chip"><Target {...i13} />{p}</span>)}
              {item.barcode && <span className="chip code"><Barcode {...i13} />{item.barcode}</span>}
              {item.bought_at && (
                <span className="chip">
                  <CalendarDays {...i13} />acheté le {date(item.bought_at)}
                  {item.price > 0 && ` · ${item.price.toLocaleString("fr-FR")} €`}
                </span>
              )}
              {item.renew_at && <span className="chip"><RefreshCw {...i13} />renouvellement {date(item.renew_at)}</span>}
            </div>

            <div className="row wrap" style={{ marginTop: 14 }}>
              <form action={toggleRestock}>
                <input type="hidden" name="code" value={item.code} />
                <input type="hidden" name="on" value={item.restock ? "0" : "1"} />
                <button className={`btn sm ${item.restock ? "primary" : ""}`} type="submit">
                  {item.restock
                    ? <><Check size={15} strokeWidth={2.4} aria-hidden />Sur la liste de courses</>
                    : <><ShoppingCart size={15} aria-hidden />À racheter</>}
                </button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Photo</div>
            <PhotoPicker code={item.code} name={item.name} hasPhoto={!!item.photo} />
            {item.photo_credit && <p className="small muted" style={{ marginBottom: 0 }}>{item.photo_credit}</p>}
          </div>

          <Documents code={item.code} docs={listDocs(item.code)} />
        </div>

        <div className="stack">
          <LabelButton code={item.code} name={item.name} sub={item.lot_name || item.category}
                       lastPrinted={lastPrinted(item.code)} />
          <p className="small muted center" style={{ margin: 0 }}>
            Créé le {date(item.created_at)} · modifié le {date(item.updated_at)}
          </p>
        </div>
      </div>
    </>
  );
}
