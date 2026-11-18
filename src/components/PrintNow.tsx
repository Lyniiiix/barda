"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { canvasFromPng, printJobs, printerKind, type PrintJob } from "@/lib/label";
import { basketForPrinting, markJobsFailed, markJobsPrinted } from "@/lib/print-actions";

/** Au-delà, on demande confirmation : c'est le garde-fou contre l'impression folle. */
const SEUIL = 10;

export default function PrintNow({ total }: { total: number }) {
  const router = useRouter();
  const [state, setState] = useState<"prêt" | "confirme" | "impression">("prêt");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(0);
  // Décidé après le montage : le serveur ne peut pas savoir si ce navigateur
  // sait parler à l'imprimante, et le deviner casse l'hydratation.
  const [kind, setKind] = useState<"native" | "bluetooth" | "aucun" | null>(null);

  useEffect(() => { setKind(printerKind()); }, []);

  const go = async () => {
    if (state === "prêt" && total > SEUIL) {
      setState("confirme");
      return;
    }
    setState("impression");
    setMsg("Préparation…");

    const raw = await basketForPrinting();
    const jobs: PrintJob[] = [];
    for (const j of raw) {
      jobs.push({ id: j.id, label: j.label, canvas: await canvasFromPng(j.png), copies: j.copies });
    }

    // Toujours compter en étiquettes, jamais en lignes de la file : c'est le
    // nombre d'étiquettes qui sort de l'imprimante, et donc le seul qui compte.
    const sorties = (ids: number[]) =>
      jobs.filter((j) => ids.includes(j.id)).reduce((n, j) => n + j.copies, 0);

    const res = await printJobs(jobs, (m, ids) => { setMsg(m); setDone(sorties(ids)); });
    // On n'acquitte que ce qui est réellement sorti : une coupure ne perd rien.
    if (res.done.length) await markJobsPrinted(res.done);
    // Ce qui n'est pas sorti et qui a été interrompu : consigné comme échec,
    // mais laissé en file pour pouvoir relancer.
    if (res.error) {
      const restants = jobs.filter((j) => !res.done.includes(j.id)).map((j) => j.id);
      if (restants.length) await markJobsFailed(restants, res.error);
    }

    const n = sorties(res.done);
    setMsg(
      res.error
        ? `Arrêté après ${n} étiquette${n > 1 ? "s" : ""} sur ${total} — ${res.error}. Le reste est toujours dans la file.`
        : `${n} étiquette${n > 1 ? "s" : ""} imprimée${n > 1 ? "s" : ""} ✓`,
    );
    setState("prêt");
    router.refresh();
  };

  if (kind === null) return <button className="btn wide primary" disabled>…</button>;

  if (kind === "aucun") {
    return (
      <p className="small muted">
        Ce navigateur ne peut pas parler à l&apos;imprimante. Ouvre cette page dans l&apos;app
        iPhone, ou confie la file au Mac.
      </p>
    );
  }

  return (
    <>
      <button
        className={`btn wide ${state === "confirme" ? "danger" : "primary"}`}
        onClick={go}
        disabled={state === "impression" || total === 0}
      >
        {state === "impression"
          ? `Impression… ${done}/${total}`
          : state === "confirme"
            ? `Confirmer : ${total} étiquettes vont sortir`
            : <><Printer size={18} aria-hidden />Imprimer les {total} étiquettes</>}
      </button>
      {state === "confirme" && (
        <button className="btn wide" onClick={() => setState("prêt")} style={{ marginTop: 8 }}>
          Annuler
        </button>
      )}
      {msg && <p className="small" style={{ marginTop: 8 }}>{msg}</p>}
    </>
  );
}
