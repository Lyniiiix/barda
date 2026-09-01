import Link from "next/link";
import { notFound } from "next/navigation";
import ItemForm from "@/components/ItemForm";
import { deleteItem, updateItem } from "@/lib/actions";
import { getItemByCode, itemProjectIds, listLots, listProjects } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ModifierObjet({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const item = getItemByCode(code.toUpperCase());
  if (!item) notFound();

  return (
    <>
      <Link className="back" href={`/objets/${item.code}`}>‹ {item.name}</Link>
      <div className="topbar"><h1>Modifier</h1></div>

      <ItemForm
        action={updateItem}
        item={item}
        lots={listLots()}
        projects={listProjects()}
        selectedProjects={itemProjectIds(item.id)}
        submitLabel="Enregistrer"
      />

      <hr className="sep" />
      <form action={deleteItem}>
        <input type="hidden" name="code" value={item.code} />
        <button className="btn danger wide" type="submit">Supprimer cet objet</button>
      </form>
    </>
  );
}
