import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import ItemForm from "@/components/ItemForm";
import { createItem } from "@/lib/actions";
import { listLots, listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouvel objet" };

export default async function NouvelObjet({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <>
      <Link className="back" href="/objets"><ChevronLeft size={16} aria-hidden />Objets</Link>
      <div className="topbar"><h1>Nouvel objet</h1></div>

      {sp.ok && (
        <div className="card form-card" style={{ borderColor: "var(--ok)" }}>
          <div className="small row">
            <Check size={16} strokeWidth={2.4} style={{ color: "var(--ok)" }} aria-hidden />
            Enregistré. <Link href={`/objets/${sp.ok}`} style={{ color: "var(--accent)" }}>Voir {sp.ok}</Link>
          </div>
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
