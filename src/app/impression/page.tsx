import Link from "next/link";
import { ChevronLeft, ChevronRight, History, Laptop, Printer, Tags, Trash2 } from "lucide-react";
import JobCard from "@/components/JobCard";
import LogRow from "@/components/LogRow";
import PrintNow from "@/components/PrintNow";
import { basket, countLabels, history, historyCounts, printedCodes, sentToRelay } from "@/lib/print";
import { listItems, purchaseDates } from "@/lib/queries";
import { clearPrintBasket, sendBasketToRelay } from "@/lib/print-actions";
import { activePrinter } from "@/lib/printers/models";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impression" };

export default function Impression() {
  const jobs = basket();
  const relais = sentToRelay();
  const journal = history(30);
  const compte = historyCounts();
  const total = countLabels("file");
  const totalRelais = countLabels("relais");
  const imprimante = activePrinter();

  // La dernière commande reçue dont des objets n'ont pas encore d'étiquette : c'est souvent
  // ce qu'on vient imprimer quand la file est vide.
  const imprimes = printedCodes();
  const enFile = new Set([...jobs, ...relais].map((j) => j.code));
  const commande = purchaseDates(4)
    .map((c) => {
      const objets = listItems({ achat: c.date });
      return { ...c, sans: objets.filter((i) => !imprimes.has(i.code) && !enFile.has(i.code)).length };
    })
    .find((c) => c.sans > 0);

  return (
    <>
      <Link className="back" href="/"><ChevronLeft size={16} aria-hidden />Accueil</Link>
      <div className="topbar">
        <div>
          <h1>File d&apos;impression</h1>
          <div className="sub">
            {total === 0 && totalRelais === 0
              ? "Rien en attente"
              : `${total} à imprimer d’ici, ${totalRelais} confiée${totalRelais > 1 ? "s" : ""} au Mac`}
            {" · "}{imprimante.name}
          </div>
        </div>
      </div>

      <div className="split">
        <div className="stack">
          {jobs.length === 0 && relais.length === 0 && (
            <div className="card empty">
              <Printer size={26} strokeWidth={1.6} aria-hidden />
              La file est vide. Sur la fiche d&apos;un objet ou d&apos;un lot, « Ajouter à la file ».
            </div>
          )}

          {commande && (
            <Link className="card tap accent" href={`/objets?achat=${commande.date}`}>
              <div className="card-title">
                <Tags size={18} strokeWidth={2} aria-hidden />
                Commande reçue le {new Date(commande.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                <ChevronRight size={18} style={{ marginLeft: "auto" }} aria-hidden />
              </div>
              <div className="card-sub">
                {commande.sans} objet{commande.sans > 1 ? "s" : ""} sans étiquette sur {commande.n}. Les ajouter à la file d&apos;un coup.
              </div>
            </Link>
          )}

          {jobs.length > 0 && (
            <section>
              <div className="section-title" style={{ marginTop: 0 }}>
                À imprimer d&apos;ici · {total} étiquette{total > 1 ? "s" : ""}
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {jobs.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
              <div style={{ marginTop: 14 }}><PrintNow total={total} /></div>
              <div className="actions" style={{ marginTop: 10 }}>
                <form action={sendBasketToRelay}>
                  <button className="btn wide" type="submit"><Laptop size={17} aria-hidden />Tout confier au Mac</button>
                </form>
                <form action={clearPrintBasket}>
                  <button className="btn wide danger" type="submit"><Trash2 size={16} aria-hidden />Vider la file</button>
                </form>
              </div>
            </section>
          )}

          {relais.length > 0 && (
            <section>
              <div className="section-title">
                Confiées au Mac · {totalRelais} étiquette{totalRelais > 1 ? "s" : ""}
              </div>
              <p className="small muted" style={{ marginTop: 0 }}>
                Elles sortiront dès que <span className="code">npm run spool</span> tournera sur le Mac.
                « Reprendre » les remet dans la file d&apos;ici.
              </p>
              <div className="stack" style={{ gap: 10 }}>
                {relais.map((j) => <JobCard key={j.id} job={j} />)}
              </div>
            </section>
          )}
        </div>

        {journal.length > 0 && (
          <section className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="section-title" style={{ margin: 0 }}><History size={14} aria-hidden />Journal</span>
              <span className="chips" style={{ marginLeft: "auto", marginTop: 0 }}>
                <span className="chip ok">{compte["imprimé"]} imprimées</span>
                {compte["échec"] > 0 && <span className="chip bad">{compte["échec"]} échecs</span>}
                {compte["annulé"] > 0 && <span className="chip warn">{compte["annulé"]} annulées</span>}
              </span>
            </div>
            {journal.map((e) => <LogRow key={e.id} entry={e} />)}
          </section>
        )}
      </div>
    </>
  );
}
