import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ChevronLeft, Download, LogOut, Printer, Smartphone } from "lucide-react";
import { countLabels } from "@/lib/print";
import { COOKIE_NAME } from "@/lib/auth";
import { stats } from "@/lib/queries";
import { activePrinter } from "@/lib/printers/models";
import { DEMO } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Réglages" };

async function logout() {
  "use server";
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}

export default function Reglages() {
  const st = stats();
  const enFile = countLabels("file");
  const auRelais = countLabels("relais");
  const imprimante = activePrinter();

  return (
    <>
      <Link className="back" href="/"><ChevronLeft size={16} aria-hidden />Accueil</Link>
      <div className="topbar"><h1>Réglages</h1></div>

      <div className="cards">
        <div className="card">
          <div className="card-title"><Download size={18} aria-hidden />Sauvegarde</div>
          <p className="small muted">
            {st.items} objets, {st.lots} lots, {st.projects} projets. La base vit dans un seul fichier SQLite
            sur le serveur ; l&apos;export ci-dessous est une copie lisible, à garder ailleurs.
          </p>
          <a className="btn wide" href="/api/export">Exporter en JSON</a>
        </div>

        <div className="card">
          <div className="card-title"><Printer size={18} aria-hidden />Imprimante</div>
          <p className="small muted">
            <b style={{ color: "var(--fg)" }}>{imprimante.name}</b>. {enFile} étiquette{enFile > 1 ? "s" : ""} dans
            la file, {auRelais} confiée{auRelais > 1 ? "s" : ""} au Mac. Rien ne sort tant que tu ne l&apos;as pas
            demandé ; ce qui est confié au Mac part quand <span className="code">npm run spool</span> tourne.
          </p>
          <Link className="btn wide" href="/impression">Ouvrir la file</Link>
        </div>

        <div className="card">
          <div className="card-title"><Smartphone size={18} aria-hidden />Imprimer depuis l&apos;iPhone</div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Safari n&apos;expose pas le Bluetooth aux pages web. L&apos;app iOS de Barda (dépôt
            <span className="code"> barda-ios</span>) affiche ce site et parle elle-même à l&apos;imprimante.
            Sinon, la file d&apos;impression fait le relais par le Mac.
          </p>
        </div>
      </div>

      {!DEMO && (
        <form action={logout} style={{ marginTop: 16, maxWidth: 360 }}>
          <button className="btn danger wide" type="submit"><LogOut size={16} aria-hidden />Se déconnecter</button>
        </form>
      )}
    </>
  );
}
