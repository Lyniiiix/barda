import { CATEGORIES, STATUSES, UNITS } from "@/lib/constants";
import type { ItemRow } from "@/lib/queries";
import type { LotRow, ProjectRow } from "@/lib/queries";

type Props = {
  action: (fd: FormData) => void | Promise<void>;
  item?: ItemRow | null;
  lots: LotRow[];
  projects: ProjectRow[];
  selectedProjects?: number[];
  defaultLot?: string;
  defaultBarcode?: string;
  submitLabel: string;
  showContinue?: boolean;
};

export default function ItemForm({
  action, item, lots, projects, selectedProjects = [], defaultLot = "", defaultBarcode = "", submitLabel, showContinue,
}: Props) {
  const cats = Array.from(new Set([...(item?.category ? [item.category] : []), ...CATEGORIES]));

  return (
    <form action={action}>
      {item && <input type="hidden" name="code" value={item.code} />}

      <div className="field">
        <label>Nom</label>
        <input name="name" defaultValue={item?.name ?? ""} required autoFocus={!item} placeholder="Fer à souder, disque dur 2 To…" />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea name="description" defaultValue={item?.description ?? ""} placeholder="Modèle, état, particularités, à quoi ça sert…" />
      </div>

      <div className="grid2">
        <div className="field">
          <label>Quantité</label>
          <input name="qty" type="text" inputMode="decimal" defaultValue={item ? String(item.qty) : "1"} />
        </div>
        <div className="field">
          <label>Unité</label>
          <select name="unit" defaultValue={item?.unit || "u"}>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Catégorie</label>
        <select name="category" defaultValue={item?.category ?? ""}>
          <option value="">—</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid2">
        <div className="field">
          <label>Lot</label>
          <select name="lot" defaultValue={item?.lot_code ?? defaultLot}>
            <option value="">— sans lot —</option>
            {lots.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>État</label>
          <select name="status" defaultValue={item?.status || "ok"}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Code-barres du fabricant (optionnel)</label>
        <input name="barcode" defaultValue={item?.barcode ?? defaultBarcode} placeholder="scanné sur l'emballage" />
      </div>

      {projects.length > 0 && (
        <div className="field">
          <label>Projets</label>
          {projects.map((p) => (
            <div className="checkline" key={p.code}>
              <input type="checkbox" name="projects" value={p.code} id={`p-${p.code}`}
                     defaultChecked={selectedProjects.includes(p.id)} />
              <label htmlFor={`p-${p.code}`} style={{ margin: 0, color: "var(--fg)", fontSize: 15 }}>{p.name}</label>
            </div>
          ))}
        </div>
      )}

      <button className="btn primary wide" type="submit" style={{ marginTop: 8 }}>{submitLabel}</button>
      {showContinue && (
        <button className="btn wide" type="submit" name="continue" value="1" style={{ marginTop: 8 }}>
          Enregistrer et en ajouter un autre
        </button>
      )}
    </form>
  );
}
