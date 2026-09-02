import Link from "next/link";
import { kindOf } from "@/lib/codes";
import { moveJobTo, removeJob, setJobCopies } from "@/lib/print-actions";

type Job = {
  id: number; code: string; label: string; copies: number;
  state: "file" | "relais" | "imprimé"; created_at: string; printed_at: string | null;
};

const fiche = (code: string) => {
  switch (kindOf(code)) {
    case "item": return `/objets/${code}`;
    case "lot": return `/lots/${code}`;
    case "project": return `/projets/${code}`;
    default: return null;
  }
};

/** Une étiquette en file : ce qu'elle contient, où elle va, et comment l'enlever. */
export default function JobCard({ job, archive = false }: { job: Job; archive?: boolean }) {
  const href = fiche(job.code);
  const confiee = job.state === "relais";

  return (
    <div className="card">
      <div className="job">
        <div className="label-thumb">
          <img src={`/api/label/${job.id}`} alt={`Étiquette ${job.label}`} width={96} height={240} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">
            {href ? <Link href={href} style={{ color: "var(--accent)" }}>{job.label}</Link> : job.label}
          </div>
          <div className="card-sub code">{job.code || "—"}</div>

          <div className="chips">
            <span className={`chip ${confiee ? "warn" : "on"}`}>
              {confiee ? "💻 confiée au Mac" : "📱 à imprimer d’ici"}
            </span>
            <span className="chip">
              {job.copies} exemplaire{job.copies > 1 ? "s" : ""}
            </span>
            {archive && job.printed_at && (
              <span className="chip ok">
                sortie le {new Date(job.printed_at).toLocaleString("fr-FR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {!archive && (
            <div className="row wrap" style={{ marginTop: 10 }}>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="copies" value={job.copies - 1} />
                <button className="btn sm" type="submit" disabled={job.copies <= 1}>−</button>
              </form>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="copies" value={job.copies + 1} />
                <button className="btn sm" type="submit" disabled={job.copies >= 20}>＋</button>
              </form>

              <form action={moveJobTo}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="target" value={confiee ? "file" : "relais"} />
                <button className="btn sm" type="submit">
                  {confiee ? "↩ Reprendre" : "→ Confier au Mac"}
                </button>
              </form>

              <form action={removeJob} style={{ marginLeft: "auto" }}>
                <input type="hidden" name="id" value={job.id} />
                <button className="btn sm danger" type="submit">Supprimer</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
