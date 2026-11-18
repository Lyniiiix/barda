import Link from "next/link";
import { Package, ShoppingCart, Target } from "lucide-react";
import ItemAvatar from "./ItemAvatar";
import type { ItemRow } from "@/lib/queries";

const fmtQty = (q: number) => (Number.isInteger(q) ? String(q) : q.toLocaleString("fr-FR"));

export const statusTone = (s: string) => (s === "ok" ? "ok" : s === "manquant" ? "bad" : "warn");

/**
 * Un objet dans une liste : photo ou icône, ce qu'il en reste, où il est, à quoi il sert.
 * `hide` retire l'information déjà donnée par la page (le lot sur la fiche d'un lot…).
 */
export default function ItemCard({
  item: i, hide = [], desc = false,
}: { item: ItemRow; hide?: ("lot" | "projects")[]; desc?: boolean }) {
  return (
    <Link className="card tap" href={`/objets/${i.code}`}>
      <div className="with-avatar">
        <ItemAvatar code={i.code} photo={i.photo} category={i.category} />
        <div>
          <div className="card-title">
            <span className="name">{i.name}</span>
            <span style={{ marginLeft: "auto" }} />
            {i.a_racheter ? (
              <span className="chip warn" title="à racheter"><ShoppingCart size={13} strokeWidth={2.2} aria-hidden /></span>
            ) : null}
            {i.status !== "ok" && <span className={`chip ${statusTone(i.status)}`}>{i.status}</span>}
          </div>
          <div className="card-sub">
            <span className="meta" style={{ color: "var(--fg-2)", fontWeight: 550 }}>
              {fmtQty(i.qty)} {i.unit}
            </span>
            {!hide.includes("lot") && (
              <span className="meta">
                <Package size={13} strokeWidth={2} aria-hidden />
                {i.lot_name ?? "sans lot"}
              </span>
            )}
            {!hide.includes("projects") && i.projects && (
              <span className="meta">
                <Target size={13} strokeWidth={2} aria-hidden />
                {i.projects}
              </span>
            )}
            <span className="code" style={{ marginLeft: "auto" }}>{i.code}</span>
          </div>
          {desc && i.description && <div className="card-desc">{i.description.slice(0, 120)}</div>}
        </div>
      </div>
    </Link>
  );
}
