import Link from "next/link";
import { Laptop, Minus, Plus, Send, Smartphone, Trash2, Undo2 } from "lucide-react";
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
  const i13 = { size: 13, strokeWidth: 2.1, "aria-hidden": true } as const;

  return (
    <div className="card">
      <div className="job">
        <div className="label-thumb">
          <img src={`/api/label/${job.id}`} alt={`Étiquette ${job.label}`} width={96} height={240} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">
            {href ? <Link className="name" href={href}>{job.label}</Link> : <span className="name">{job.label}</span>}
          </div>
          <div className="card-sub code">{job.code || "—"}</div>

          <div className="chips">
            <span className={`chip ${confiee ? "warn" : ""}`}>
              {confiee ? <><Laptop {...i13} />confiée au Mac</> : <><Smartphone {...i13} />à imprimer d’ici</>}
            </span>
            <span className="chip">{job.copies} exemplaire{job.copies > 1 ? "s" : ""}</span>
            {archive && job.printed_at && (
              <span className="chip ok">
                sortie le {new Date(job.printed_at).toLocaleString("fr-FR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {!archive && (
            <div className="row wrap" style={{ marginTop: 12 }}>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="copies" value={job.copies - 1} />
                <button className="btn sm icon" type="submit" disabled={job.copies <= 1} aria-label="Un exemplaire de moins"><Minus size={15} aria-hidden /></button>
              </form>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="copies" value={job.copies + 1} />
                <button className="btn sm icon" type="submit" disabled={job.copies >= 20} aria-label="Un exemplaire de plus"><Plus size={15} aria-hidden /></button>
              </form>

              <form action={moveJobTo}>
                <input type="hidden" name="id" value={job.id} />
                <input type="hidden" name="target" value={confiee ? "file" : "relais"} />
                <button className="btn sm" type="submit">
                  {confiee ? <><Undo2 size={15} aria-hidden />Reprendre</> : <><Send size={15} aria-hidden />Confier au Mac</>}
                </button>
              </form>

              <form action={removeJob} style={{ marginLeft: "auto" }}>
                <input type="hidden" name="id" value={job.id} />
                <button className="btn sm danger" type="submit"><Trash2 size={15} aria-hidden />Supprimer</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
