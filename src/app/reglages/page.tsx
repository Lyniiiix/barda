import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, row } from "@/lib/db";
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
  const pending = row<{ n: number }>(
    db.prepare("SELECT COUNT(*) AS n FROM print_queue WHERE state = 'en_attente'").get(),
  ).n;

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
          {pending} étiquette{pending > 1 ? "s" : ""} en attente. Le Mac les récupère quand{" "}
          <span className="code">npm run spool</span> tourne, et les envoie à la Fichero D11s.
        </p>
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
