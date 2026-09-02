import Link from "next/link";
import JobCard from "@/components/JobCard";
import PrintNow from "@/components/PrintNow";
import { basket, countLabels, history, sentToRelay } from "@/lib/print";
import { clearPrintBasket, sendBasketToRelay } from "@/lib/print-actions";

export const dynamic = "force-dynamic";

export default function Impression() {
  const jobs = basket();
  const relais = sentToRelay();
  const passees = history(10);
  const total = countLabels("file");
  const totalRelais = countLabels("relais");

  return (
    <>
      <Link className="back" href="/">‹ Accueil</Link>
      <div className="topbar">
        <div>
          <h1>File d&apos;impression</h1>
          <div className="sub">
            {total === 0 && totalRelais === 0
              ? "Rien en attente"
              : `${total} à imprimer d’ici, ${totalRelais} confiée${totalRelais > 1 ? "s" : ""} au Mac`}
          </div>
        </div>
      </div>

      {jobs.length === 0 && relais.length === 0 && (
        <div className="card center muted small">
          La file est vide. Sur la fiche d&apos;un objet ou d&apos;un lot, « Ajouter à la file ».
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <div className="card-sub" style={{ marginBottom: 6 }}>
            À imprimer d&apos;ici — {total} étiquette{total > 1 ? "s" : ""}
          </div>
          {jobs.map((j) => <JobCard key={j.id} job={j} />)}

          <PrintNow total={total} />
          <div className="row" style={{ marginTop: 8 }}>
            <form action={sendBasketToRelay} style={{ flex: 1 }}>
              <button className="btn wide" type="submit">Tout confier au Mac</button>
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
            Confiées au Mac — {totalRelais} étiquette{totalRelais > 1 ? "s" : ""}
          </div>
          <p className="small muted" style={{ marginTop: 0 }}>
            Elles sortiront dès que <span className="code">npm run spool</span> tournera sur le Mac.
            « Reprendre » les remet dans la file d&apos;ici.
          </p>
          {relais.map((j) => <JobCard key={j.id} job={j} />)}
        </>
      )}

      {passees.length > 0 && (
        <>
          <hr className="sep" />
          <div className="card-sub" style={{ marginBottom: 6 }}>Déjà sorties</div>
          {passees.map((j) => <JobCard key={j.id} job={j} archive />)}
        </>
      )}
    </>
  );
}
