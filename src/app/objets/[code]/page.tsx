import Link from "next/link";
import { notFound } from "next/navigation";
import LabelButton from "@/components/LabelButton";
import { bumpQty } from "@/lib/actions";
import { getItemByCode } from "@/lib/queries";
import { lastPrinted } from "@/lib/print";

export const dynamic = "force-dynamic";

export default async function Objet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = getItemByCode(code.toUpperCase());
  if (!item) notFound();

  return (
    <>
      <Link className="back" href="/objets">‹ Objets</Link>

      <div className="topbar">
        <div>
          <h1>{item.name}</h1>
          <div className="sub code">{item.code}</div>
        </div>
        <div className="spacer" />
        <Link className="btn sm" href={`/objets/${item.code}/modifier`}>Modifier</Link>
      </div>

      <div className="card">
        <div className="row">
          <form action={bumpQty}>
            <input type="hidden" name="code" value={item.code} />
            <input type="hidden" name="delta" value="-1" />
            <button className="btn sm" type="submit">−</button>
          </form>
          <b style={{ fontSize: 20 }}>{item.qty}</b>
          <span className="muted">{item.unit}</span>
          <form action={bumpQty}>
            <input type="hidden" name="code" value={item.code} />
            <input type="hidden" name="delta" value="1" />
            <button className="btn sm" type="submit">＋</button>
          </form>
          <span style={{ marginLeft: "auto" }} className={`chip ${item.status === "ok" ? "ok" : item.status === "manquant" ? "bad" : "warn"}`}>
            {item.status}
          </span>
        </div>

        {item.description && <div className="card-desc" style={{ marginTop: 10 }}>{item.description}</div>}

        <div className="chips">
          {item.lot_code
            ? <Link className="chip" href={`/lots/${item.lot_code}`}>📦 {item.lot_name}</Link>
            : <span className="chip warn">sans lot</span>}
          {item.category && <span className="chip">{item.category}</span>}
          {item.projects && item.projects.split(" · ").map((p) => <span key={p} className="chip">🎯 {p}</span>)}
          {item.barcode && <span className="chip code">⌗ {item.barcode}</span>}
        </div>
      </div>

      <LabelButton code={item.code} name={item.name} sub={item.lot_name || item.category}
                   lastPrinted={lastPrinted(item.code)} />

      <p className="small muted center">
        Créé le {new Date(item.created_at).toLocaleDateString("fr-FR")} · modifié le{" "}
        {new Date(item.updated_at).toLocaleDateString("fr-FR")}
      </p>
    </>
  );
}
