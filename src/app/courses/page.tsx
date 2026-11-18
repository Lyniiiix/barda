import Link from "next/link";
import { ChevronLeft, Package, ShoppingCart } from "lucide-react";
import ItemAvatar from "@/components/ItemAvatar";
import { markRestocked, toggleRestock } from "@/lib/actions";
import { listItems, restockReason } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "À racheter" };

/** Ce qu'il faut racheter : le drapeau posé à la main, plus ce qui s'est signalé tout seul. */
export default function Courses() {
  const items = listItems({ aRacheter: true });

  return (
    <>
      <Link className="back" href="/"><ChevronLeft size={16} aria-hidden />Accueil</Link>
      <div className="topbar">
        <div>
          <h1>À racheter</h1>
          <div className="sub">
            {items.length === 0 ? "Rien à racheter" : `${items.length} chose${items.length > 1 ? "s" : ""} à reprendre`}
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className="card empty" style={{ maxWidth: 640 }}>
          <ShoppingCart size={26} strokeWidth={1.6} aria-hidden />
          Rien pour l&apos;instant. Un objet arrive ici quand tu le marques « à racheter »,
          quand sa quantité tombe à zéro, quand il passe sous son seuil, ou s&apos;il est porté manquant.
        </div>
      )}

      <div className="cards">
        {items.map((i) => (
          <div className="card" key={i.code}>
            <div className="with-avatar">
              <ItemAvatar code={i.code} photo={i.photo} category={i.category} />
              <div>
                <div className="card-title">
                  <Link className="name" href={`/objets/${i.code}`}>{i.name}</Link>
                </div>
                <div className="card-sub">
                  <span className="meta">{i.qty} {i.unit} restant{i.qty > 1 ? "s" : ""}</span>
                  {i.lot_name && <span className="meta"><Package size={13} strokeWidth={2} aria-hidden />{i.lot_name}</span>}
                </div>
                <div className="chips">
                  <span className="chip warn">{restockReason(i)}</span>
                </div>

                <div className="row wrap" style={{ marginTop: 12 }}>
                  <form action={markRestocked} className="row">
                    <input type="hidden" name="code" value={i.code} />
                    <input name="qty" type="text" inputMode="decimal" className="input" aria-label="Quantité rachetée"
                           defaultValue={String(Math.max(1, i.min_qty * 2 || 1))}
                           style={{ width: 74, padding: "7px 10px" }} />
                    <button className="btn sm primary" type="submit">Racheté</button>
                  </form>
                  <form action={toggleRestock} style={{ marginLeft: "auto" }}>
                    <input type="hidden" name="code" value={i.code} />
                    <input type="hidden" name="on" value="0" />
                    <button className="btn sm" type="submit" disabled={!i.restock}>Retirer</button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
