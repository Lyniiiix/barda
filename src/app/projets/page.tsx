import Link from "next/link";
import { createProject } from "@/lib/actions";
import { listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function Projets() {
  const projects = listProjects();
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Projets</h1>
          <div className="sub">À quoi sert le matériel</div>
        </div>
      </div>

      {projects.map((p) => (
        <Link key={p.code} className="card tap" href={`/projets/${p.code}`}>
          <div className="card-title">
            <span style={{ color: p.color }}>●</span> {p.name}
            <span className="muted small" style={{ marginLeft: "auto" }}>{p.n_items} objet{p.n_items > 1 ? "s" : ""}</span>
          </div>
          <div className="card-sub">{p.status}</div>
          {p.description && <div className="card-desc">{p.description.slice(0, 100)}</div>}
        </Link>
      ))}

      {projects.length === 0 && <div className="card center muted small">Aucun projet. « Support CAN », « Voiture »…</div>}

      <hr className="sep" />

      <form action={createProject}>
        <div className="card-sub" style={{ marginBottom: 8 }}>Nouveau projet</div>
        <div className="field">
          <label>Nom</label>
          <input name="name" placeholder="Voiture enfant, support CAN…" required />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea name="description" placeholder="Ce qu'il faut faire, ce qu'il manque…" />
        </div>
        <div className="grid2">
          <div className="field">
            <label>État</label>
            <select name="status" defaultValue="actif">
              <option value="actif">actif</option>
              <option value="en pause">en pause</option>
              <option value="terminé">terminé</option>
            </select>
          </div>
          <div className="field">
            <label>Couleur</label>
            <input name="color" type="color" defaultValue="#7c9cff" style={{ height: 46, padding: 4 }} />
          </div>
        </div>
        <button className="btn primary wide" type="submit">Créer le projet</button>
      </form>
    </>
  );
}
