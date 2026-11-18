import { ArrowUpRight } from "lucide-react";

/**
 * La signature de can.sys, en pied de page, comme sur ses autres sites.
 *
 * `BARDA_SIGNATURE` : `opere` sur les instances que can.sys fait tourner (« Site conçu et
 * opéré par »), `off` pour la retirer. Par défaut, une instance installée par quelqu'un
 * d'autre dit seulement qui l'a conçue, ce qui reste vrai partout.
 */
export default function Signature() {
  const mode = process.env.BARDA_SIGNATURE ?? "";
  if (mode === "off") return null;
  const texte = mode === "opere" ? "Site conçu et opéré par" : "Conçu par";

  return (
    <footer className="footer">
      <a className="signature" href="https://can-ali.fr/carte" target="_blank" rel="noopener">
        {texte}
        <img src="/cansys.svg" alt="" width={22} height={22} />
        <b>can.sys</b>
        <ArrowUpRight size={16} strokeWidth={2.2} aria-hidden />
      </a>
    </footer>
  );
}
