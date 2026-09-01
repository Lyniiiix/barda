import Link from "next/link";
import ItemForm from "@/components/ItemForm";
import { createItem } from "@/lib/actions";
import { listLots, listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NouvelObjet({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <Link className="back" href="/objets">‹ Objets</Link>
      <div className="topbar"><h1>Nouvel objet</h1></div>

      {sp.ok && (
        <div className="card" style={{ borderColor: "var(--ok)" }}>
          <div className="small">Enregistré. <Link href={`/objets/${sp.ok}`} style={{ color: "var(--accent)" }}>Voir {sp.ok}</Link></div>
        </div>
      )}

      <ItemForm
        action={createItem}
        lots={listLots()}
        projects={listProjects()}
        defaultLot={sp.lot ?? ""}
        defaultBarcode={sp.barcode ?? ""}
        submitLabel="Enregistrer"
        showContinue
      />
    </>
  );
}
