import Link from "next/link";
import ItemAvatar from "@/components/ItemAvatar";
import { markRestocked, toggleRestock } from "@/lib/actions";
import { listItems, restockReason } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Ce qu'il faut racheter — le drapeau posé à la main, plus ce qui s'est signalé tout seul. */
export default function Courses() {
  const items = listItems({ aRacheter: true });

  return (
    <>
      <Link className="back" href="/">‹ Accueil</Link>
      <div className="topbar">
        <div>
          <h1>À racheter</h1>
          <div className="sub">
            {items.length === 0 ? "Rien à racheter" : `${items.length} chose${items.length > 1 ? "s" : ""} à reprendre`}
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className="card center muted small">
          Rien pour l&apos;instant. Un objet arrive ici quand tu le marques « à racheter »,
          quand sa quantité tombe à zéro, quand il passe sous son seuil, ou s&apos;il est porté manquant.
        </div>
      )}

      {items.map((i) => (
        <div className="card" key={i.code}>
          <div className="with-avatar">
            <ItemAvatar code={i.code} photo={i.photo} category={i.category} />
            <div>
              <div className="card-title">
                <Link href={`/objets/${i.code}`} style={{ color: "var(--accent)" }}>{i.name}</Link>
              </div>
              <div className="card-sub">
                {i.qty} {i.unit} restant{i.qty > 1 ? "s" : ""}
                {i.lot_name && ` · 📦 ${i.lot_name}`}
              </div>
              <div className="chips">
                <span className="chip warn">{restockReason(i)}</span>
              </div>

              <div className="row wrap" style={{ marginTop: 10 }}>
                <form action={markRestocked} className="row">
                  <input type="hidden" name="code" value={i.code} />
                  <input name="qty" type="text" inputMode="decimal" defaultValue={String(Math.max(1, i.min_qty * 2 || 1))}
                         style={{ width: 74, background: "var(--bg-elev)", border: "1px solid var(--line)",
                                  borderRadius: 10, padding: "8px 10px", fontSize: 16 }} />
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
    </>
  );
}
