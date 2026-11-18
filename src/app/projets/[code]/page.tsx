import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Package, Trash2 } from "lucide-react";
import ItemCard from "@/components/ItemCard";
import { deleteProject, updateProject } from "@/lib/actions";
import { getProjectByCode, listItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const p = getProjectByCode((await params).code.toUpperCase());
  return { title: p?.name ?? "Projet" };
}

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
  const i13 = { size: 13, strokeWidth: 2.1, "aria-hidden": true } as const;

  return (
    <>
      <Link className="back" href="/projets"><ChevronLeft size={16} aria-hidden />Projets</Link>

      <div className="topbar">
        <span className="dot-color" style={{ background: p.color, color: p.color, width: 14, height: 14 }} />
        <div>
          <h1>{p.name}</h1>
          <div className="sub">{p.status} · {items.length} objet{items.length > 1 ? "s" : ""} · <span className="code">{p.code}</span></div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          {p.description && <div className="card"><div className="card-desc" style={{ marginTop: 0, color: "var(--fg-2)" }}>{p.description}</div></div>}

          {byLot.size > 0 && (
            <div className="card accent">
              <div className="section-title" style={{ marginTop: 0 }}>À embarquer</div>
              <div className="chips" style={{ marginTop: 0 }}>
                {[...byLot.values()].map((g) => (
                  g.code
                    ? <Link key={g.code} className="chip on" href={`/lots/${g.code}`}><Package {...i13} />{g.name} ({g.items.length})</Link>
                    : <span key="none" className="chip warn">sans lot ({g.items.length})</span>
                ))}
              </div>
            </div>
          )}

          {[...byLot.values()].map((g) => (
            <section key={g.code ?? "none"}>
              <div className="section-title"><Package size={14} aria-hidden />{g.name}</div>
              <div className="cards">
                {g.items.map((i) => <ItemCard key={i.code} item={i} hide={["lot", "projects"]} />)}
              </div>
            </section>
          ))}

          {items.length === 0 && (
            <div className="card empty">
              Aucun objet rattaché. Ouvrir un objet, « Modifier », puis cocher ce projet.
            </div>
          )}
        </div>

        <div className="stack">
          <form action={updateProject} className="card">
            <input type="hidden" name="code" value={p.code} />
            <div className="section-title" style={{ marginTop: 0 }}>Modifier le projet</div>
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

          <form action={deleteProject}>
            <input type="hidden" name="code" value={p.code} />
            <button className="btn danger wide" type="submit"><Trash2 size={16} aria-hidden />Supprimer le projet</button>
          </form>
        </div>
      </div>
    </>
  );
}
