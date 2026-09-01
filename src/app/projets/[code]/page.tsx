import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject, updateProject } from "@/lib/actions";
import { getProjectByCode, listItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ProjetDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const p = getProjectByCode(code.toUpperCase());
  if (!p) notFound();
  const items = listItems({ project: p.code });

  const byLot = new Map<string, { name: string; code: string | null; items: typeof items }>();
  for (const i of items) {
    const key = i.lot_code ?? "";
    if (!byLot.has(key)) byLot.set(key, { name: i.lot_name ?? "Sans lot", code: i.lot_code, items: [] });
    byLot.get(key)!.items.push(i);
  }

  return (
    <>
      <Link className="back" href="/projets">‹ Projets</Link>

      <div className="topbar">
        <div>
          <h1><span style={{ color: p.color }}>●</span> {p.name}</h1>
          <div className="sub">{p.status} · {items.length} objet{items.length > 1 ? "s" : ""}</div>
        </div>
      </div>

      {p.description && <div className="card"><div className="card-desc" style={{ marginTop: 0 }}>{p.description}</div></div>}

      {byLot.size > 0 && (
        <div className="card">
          <div className="card-sub" style={{ marginTop: 0 }}>À embarquer</div>
          <div className="chips">
            {[...byLot.values()].map((g) => (
              g.code
                ? <Link key={g.code} className="chip on" href={`/lots/${g.code}`}>📦 {g.name} ({g.items.length})</Link>
                : <span key="none" className="chip warn">sans lot ({g.items.length})</span>
            ))}
          </div>
        </div>
      )}

      <Link className="btn wide" href={`/objets?project=${p.code}`} style={{ marginBottom: 12 }}>
        Voir les {items.length} objets
      </Link>

      {[...byLot.values()].map((g) => (
        <div key={g.code ?? "none"}>
          <div className="card-sub" style={{ margin: "12px 0 6px" }}>📦 {g.name}</div>
          {g.items.map((i) => (
            <Link key={i.code} className="card tap" href={`/objets/${i.code}`}>
              <div className="card-title">
                {i.name}
                {i.qty !== 1 && <span className="muted small">× {i.qty} {i.unit}</span>}
                {i.status !== "ok" && <span className={`chip ${i.status === "manquant" ? "bad" : "warn"}`} style={{ marginLeft: "auto" }}>{i.status}</span>}
              </div>
            </Link>
          ))}
        </div>
      ))}

      {items.length === 0 && (
        <div className="card center muted small">
          Aucun objet rattaché. Ouvrir un objet, « Modifier », puis cocher ce projet.
        </div>
      )}

      <hr className="sep" />

      <form action={updateProject}>
        <input type="hidden" name="code" value={p.code} />
        <div className="card-sub" style={{ marginBottom: 8 }}>Modifier le projet</div>
        <div className="field">
          <label>Nom</label>
          <input name="name" defaultValue={p.name} />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea name="description" defaultValue={p.description} />
        </div>
        <div className="grid2">
          <div className="field">
            <label>État</label>
            <select name="status" defaultValue={p.status}>
              <option value="actif">actif</option>
              <option value="en pause">en pause</option>
              <option value="terminé">terminé</option>
            </select>
          </div>
          <div className="field">
            <label>Couleur</label>
            <input name="color" type="color" defaultValue={p.color} style={{ height: 46, padding: 4 }} />
          </div>
        </div>
        <button className="btn primary wide" type="submit">Enregistrer</button>
      </form>

      <form action={deleteProject} style={{ marginTop: 10 }}>
        <input type="hidden" name="code" value={p.code} />
        <button className="btn danger wide" type="submit">Supprimer le projet</button>
      </form>
    </>
  );
}
