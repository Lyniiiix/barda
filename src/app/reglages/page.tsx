import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { countLabels } from "@/lib/print";
import { COOKIE_NAME } from "@/lib/auth";
import { stats } from "@/lib/queries";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}

export default function Reglages() {
  const st = stats();
  const enFile = countLabels("file");
  const auRelais = countLabels("relais");

  return (
    <>
      <Link className="back" href="/">‹ Accueil</Link>
      <div className="topbar"><h1>Réglages</h1></div>

      <div className="card">
        <div className="card-title">Sauvegarde</div>
        <p className="small muted">
          {st.items} objets, {st.lots} lots, {st.projects} projets. La base vit dans un seul fichier SQLite
          sur le serveur ; l&apos;export ci-dessous est une copie lisible, à garder ailleurs.
        </p>
        <a className="btn wide" href="/api/export">Exporter en JSON</a>
      </div>

      <div className="card">
        <div className="card-title">File d&apos;impression</div>
        <p className="small muted">
          {enFile} dans la file, {auRelais} confiée{auRelais > 1 ? "s" : ""} au Mac. Rien ne sort de
          l&apos;imprimante tant que tu ne l&apos;as pas demandé ; ce qui est confié au Mac part
          quand <span className="code">npm run spool</span> tourne.
        </p>
        <Link className="btn wide" href="/impression">Ouvrir la file</Link>
      </div>

      <div className="card">
        <div className="card-title">Imprimer depuis l&apos;iPhone</div>
        <p className="small muted">
          Safari n&apos;expose pas le Bluetooth aux pages web. Pour imprimer directement depuis le
          téléphone, ouvrir Barda dans <b>Bluefy</b> (App Store, navigateur Web Bluetooth) : le bouton
          « Imprimer (Bluetooth) » apparaît alors sur chaque fiche. Sinon, la file d&apos;impression fait
          le relais par le Mac.
        </p>
      </div>

      <form action={logout}>
        <button className="btn danger wide" type="submit">Se déconnecter</button>
      </form>
    </>
  );
}
