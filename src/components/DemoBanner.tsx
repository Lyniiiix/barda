import { ArrowUpRight, Eye } from "lucide-react";
import { DEMO, REPO_URL } from "@/lib/demo";
import DemoGuard from "./DemoGuard";

/** Dit clairement au visiteur de la démo ce qu'il regarde, et où trouver le code. */
export default function DemoBanner() {
  if (!DEMO) return null;
  return (
    <>
    <div className="demo-banner glass">
      <Eye size={18} strokeWidth={1.9} aria-hidden />
      <span>
        <b>Démo publique.</b> Données fictives, en lecture seule : rien ne s&apos;enregistre.
      </span>
      <a href={REPO_URL} target="_blank" rel="noopener" className="btn sm" style={{ marginLeft: "auto" }}>
        Code source <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
      </a>
    </div>
    {/* Hors du bandeau : son flou ferait de lui le repère du message « fixe ». */}
    <DemoGuard />
    </>
  );
}
