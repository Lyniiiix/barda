import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2 } from "lucide-react";
import ItemForm from "@/components/ItemForm";
import { deleteItem, updateItem } from "@/lib/actions";
import { getItemByCode, itemProjectIds, listLots, listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Modifier" };

export default async function ModifierObjet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = getItemByCode(code.toUpperCase());
  if (!item) notFound();

  return (
    <>
      <Link className="back" href={`/objets/${item.code}`}><ChevronLeft size={16} aria-hidden />{item.name}</Link>
      <div className="topbar"><h1>Modifier</h1></div>

      <ItemForm
        action={updateItem}
        item={item}
        lots={listLots()}
        projects={listProjects()}
        selectedProjects={itemProjectIds(item.id)}
        submitLabel="Enregistrer"
      />

      <form action={deleteItem} className="form-card" style={{ marginTop: 24 }}>
        <input type="hidden" name="code" value={item.code} />
        <button className="btn danger wide" type="submit"><Trash2 size={16} aria-hidden />Supprimer cet objet</button>
      </form>
    </>
  );
}
