import Link from "next/link";
import PrintNow from "@/components/PrintNow";
import { basket, countLabels, history, sentToRelay } from "@/lib/print";
import { clearPrintBasket, removeJob, sendBasketToRelay, setJobCopies } from "@/lib/print-actions";

export const dynamic = "force-dynamic";

export default function Impression() {
  const jobs = basket();
  const relais = sentToRelay();
  const passees = history(10);
  const total = countLabels("file");

  return (
    <>
      <Link className="back" href="/">‹ Accueil</Link>
      <div className="topbar">
        <div>
          <h1>File d&apos;impression</h1>
          <div className="sub">
            {total === 0
              ? "Rien en attente"
              : `${total} étiquette${total > 1 ? "s" : ""} sortiront de l'imprimante`}
          </div>
        </div>
      </div>

      {jobs.length === 0 && (
        <div className="card center muted small">
          La file est vide. Sur la fiche d&apos;un objet ou d&apos;un lot, « Ajouter à la file ».
        </div>
      )}

      {jobs.map((j) => (
        <div className="card" key={j.id}>
          <div className="row">
            <div>
              <div className="card-title">{j.label}</div>
              <div className="card-sub code">{j.code || "—"}</div>
            </div>
            <div className="row" style={{ marginLeft: "auto" }}>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={j.id} />
                <input type="hidden" name="copies" value={j.copies - 1} />
                <button className="btn sm" type="submit" disabled={j.copies <= 1}>−</button>
              </form>
              <span className="small muted">{j.copies}</span>
              <form action={setJobCopies}>
                <input type="hidden" name="id" value={j.id} />
                <input type="hidden" name="copies" value={j.copies + 1} />
                <button className="btn sm" type="submit">＋</button>
              </form>
              <form action={removeJob}>
                <input type="hidden" name="id" value={j.id} />
                <button className="btn sm danger" type="submit">✕</button>
              </form>
            </div>
          </div>
        </div>
      ))}

      {jobs.length > 0 && (
        <>
          <PrintNow total={total} />
          <div className="row" style={{ marginTop: 8 }}>
            <form action={sendBasketToRelay} style={{ flex: 1 }}>
              <button className="btn wide" type="submit">Confier au Mac</button>
            </form>
            <form action={clearPrintBasket} style={{ flex: 1 }}>
              <button className="btn wide danger" type="submit">Vider la file</button>
            </form>
          </div>
        </>
      )}

      {relais.length > 0 && (
        <>
          <hr className="sep" />
          <div className="card-sub" style={{ marginBottom: 6 }}>
            Confiées au Mac ({relais.reduce((n, j) => n + j.copies, 0)})
          </div>
          <div className="card">
            <p className="small muted" style={{ margin: 0 }}>
              {relais.map((j) => j.label).join(", ")}
            </p>
            <p className="small muted">
              Elles sortiront quand <span className="code">npm run spool</span> tournera sur le Mac.
            </p>
          </div>
        </>
      )}

      {passees.length > 0 && (
        <>
          <hr className="sep" />
          <div className="card-sub" style={{ marginBottom: 6 }}>Dernières imprimées</div>
          {passees.map((j) => (
            <div className="card" key={j.id}>
              <div className="row">
                <span className="small">{j.label}</span>
                <span className="small muted" style={{ marginLeft: "auto" }}>
                  {j.copies > 1 && `× ${j.copies} · `}
                  {j.printed_at ? new Date(j.printed_at).toLocaleString("fr-FR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  }) : ""}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
