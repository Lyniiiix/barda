import "server-only";
import * as q from "./queries";
import * as m from "./mutations";

/**
 * Outils exposés à Claude. Volontairement sans suppression : un modèle peut se
 * tromper de code, et un objet effacé ne se retrouve pas. Les corrections
 * destructives restent à faire dans l'interface.
 */

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, never>) => unknown;
};

const str = (d: string) => ({ type: "string", description: d });
const num = (d: string) => ({ type: "number", description: d });
const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object", properties, required, additionalProperties: false,
});

/** Version compacte d'un objet : le modèle n'a pas besoin des horodatages. */
const brief = (i: q.ItemRow) => ({
  code: i.code,
  nom: i.name,
  description: i.description || undefined,
  quantite: i.qty,
  unite: i.unit,
  categorie: i.category || undefined,
  etat: i.status,
  a_racheter: i.a_racheter ? q.restockReason(i) : undefined,
  seuil: i.min_qty || undefined,
  photo: i.photo ? true : undefined,
  lot: i.lot_name ? { code: i.lot_code, nom: i.lot_name } : null,
  projets: i.projects ? i.projects.split(" · ") : [],
});

const ITEM_FIELDS = {
  nom: str("Nom court et reconnaissable."),
  description: str("Modèle, état, particularités, à quoi ça sert."),
  quantite: num("Quantité (1 par défaut)."),
  unite: str("u, m, kg, boîte, rouleau…"),
  categorie: str("Outil, Consommable, Stockage, Câble / connectique…"),
  lot: str("Code du lot où c'est rangé (L…), ou vide pour aucun."),
  etat: str("État physique : ok, usé, à réparer, à remplacer, prêté, manquant."),
  a_racheter: { type: "boolean", description: "Mettre ou retirer de la liste de courses. Indépendant de l'état." },
  seuil: num("Sous cette quantité, l'objet apparaît tout seul dans la liste de courses. 0 = pas de seuil."),
  code_barres: str("Code-barres du fabricant, si scanné."),
  projets: { type: "array", items: { type: "string" }, description: "Codes des projets (P…)." },
};

const itemInput = (a: Record<string, unknown>): m.ItemInput => ({
  name: a.nom as string | undefined,
  description: a.description as string | undefined,
  category: a.categorie as string | undefined,
  qty: a.quantite as number | undefined,
  unit: a.unite as string | undefined,
  status: a.etat as string | undefined,
  restock: a.a_racheter as boolean | undefined,
  minQty: a.seuil as number | undefined,
  barcode: a.code_barres as string | undefined,
  lot: a.lot === undefined ? undefined : ((a.lot as string) || null),
  projects: a.projets as string[] | undefined,
});

export const TOOLS: Tool[] = [
  {
    name: "inventaire_apercu",
    description:
      "Vue d'ensemble de l'inventaire : combien d'objets, quels lots, quels projets, " +
      "et ce qui demande attention (objets sans lot, manquants, à réparer, prêtés). " +
      "À appeler en premier pour situer le terrain avant de conseiller.",
    inputSchema: obj({}),
    handler: () => {
      const items = q.listItems();
      const attention = items.filter((i) => i.status !== "ok");
      const st = q.stats();
      return {
        totaux: {
          objets: st.items, lots: st.lots, projets: st.projects,
          sans_lot: st.sansLot, a_surveiller: st.aVoir,
        },
        categories: q.categoriesUsed(),
        lots: q.listLots().map((l) => ({
          code: l.code, nom: l.name, type: l.kind || undefined,
          ou: l.place || undefined, objets: l.n_items,
        })),
        projets: q.listProjects().map((p) => ({
          code: p.code, nom: p.name, etat: p.status, objets: p.n_items,
          description: p.description || undefined,
        })),
        a_surveiller: attention.map(brief),
        a_racheter: q.listItems({ aRacheter: true }).map((i) => ({
          code: i.code, nom: i.name, raison: q.restockReason(i), reste: `${i.qty} ${i.unit}`,
        })),
        sans_lot: items.filter((i) => !i.lot_code).map((i) => i.name).slice(0, 40),
      };
    },
  },
  {
    name: "objets_chercher",
    description:
      "Cherche dans l'inventaire. Sans argument, renvoie tout. Le texte porte sur le nom, " +
      "la description, la catégorie et les codes-barres.",
    inputSchema: obj({
      texte: str("Mots à chercher."),
      lot: str("Limiter à un lot (code L…)."),
      projet: str("Limiter à un projet (code P…)."),
      categorie: str("Limiter à une catégorie."),
      etat: str("Limiter à un état : ok, à réparer, usé, prêté, manquant."),
      sans_lot: { type: "boolean", description: "Seulement les objets rangés nulle part." },
      a_racheter: { type: "boolean", description: "Seulement ce qui est à racheter." },
    }),
    handler: (a) => {
      const items = q.listItems({
        q: a.texte, lot: a.lot, project: a.projet,
        category: a.categorie, status: a.etat, sansLot: a.sans_lot, aRacheter: a.a_racheter,
      });
      return { trouves: items.length, objets: items.map(brief) };
    },
  },
  {
    name: "objet_lire",
    description: "Détail d'un objet à partir de son code (I…).",
    inputSchema: obj({ code: str("Code de l'objet, ex. IR7MCX.") }, ["code"]),
    handler: (a) => {
      const item = q.getItemByCode(String(a.code).toUpperCase());
      if (!item) return { erreur: `Aucun objet avec le code ${a.code}.` };
      return brief(item);
    },
  },
  {
    name: "lots_lister",
    description: "Les lots — sacs, caisses, tiroirs — avec le nombre d'objets dans chacun.",
    inputSchema: obj({}),
    handler: () =>
      q.listLots().map((l) => ({
        code: l.code, nom: l.name, type: l.kind || undefined, ou: l.place || undefined,
        description: l.description || undefined, objets: l.n_items,
      })),
  },
  {
    name: "projets_lister",
    description: "Les projets, avec le nombre d'objets rattachés.",
    inputSchema: obj({}),
    handler: () =>
      q.listProjects().map((p) => ({
        code: p.code, nom: p.name, etat: p.status,
        description: p.description || undefined, objets: p.n_items,
      })),
  },
  {
    name: "projet_besoins",
    description:
      "Ce qu'il faut pour un projet, regroupé par lot — donc quels lots embarquer. " +
      "Signale aussi les objets manquants ou à réparer qui bloqueraient le projet.",
    inputSchema: obj({ code: str("Code du projet (P…).") }, ["code"]),
    handler: (a) => {
      const code = String(a.code).toUpperCase();
      const projet = q.getProjectByCode(code);
      if (!projet) return { erreur: `Aucun projet avec le code ${a.code}.` };

      const items = q.listItems({ project: code });
      const parLot = new Map<string, { lot: string; code: string | null; objets: string[] }>();
      for (const i of items) {
        const key = i.lot_code ?? "";
        if (!parLot.has(key)) {
          parLot.set(key, { lot: i.lot_name ?? "Sans lot", code: i.lot_code, objets: [] });
        }
        parLot.get(key)!.objets.push(i.name);
      }
      return {
        projet: { code: projet.code, nom: projet.name, etat: projet.status,
                  description: projet.description || undefined },
        a_embarquer: [...parLot.values()],
        problemes: items.filter((i) => i.status !== "ok")
                        .map((i) => ({ nom: i.name, etat: i.status, code: i.code })),
      };
    },
  },
  {
    name: "objet_ajouter",
    description:
      "Ajoute un objet à l'inventaire et renvoie son code. Le code sert ensuite à imprimer " +
      "l'étiquette depuis l'application.",
    inputSchema: obj(ITEM_FIELDS, ["nom"]),
    handler: (a) => {
      const code = m.createItem(itemInput(a));
      return { code, message: `« ${a.nom} » ajouté sous le code ${code}.` };
    },
  },
  {
    name: "objet_modifier",
    description:
      "Modifie un objet. Seuls les champs fournis changent ; les autres sont laissés tels quels. " +
      "Sert aussi à rattacher des projets (la liste fournie remplace l'ancienne).",
    inputSchema: obj({ code: str("Code de l'objet (I…)."), ...ITEM_FIELDS }, ["code"]),
    handler: (a) => {
      const code = String(a.code).toUpperCase();
      const patch = itemInput(a);
      // `nom` absent ne doit pas être compris comme « vider le nom ».
      for (const k of Object.keys(patch) as (keyof m.ItemInput)[]) {
        if (patch[k] === undefined) delete patch[k];
      }
      return m.updateItem(code, patch)
        ? { code, message: "Objet mis à jour." }
        : { erreur: `Aucun objet avec le code ${a.code}.` };
    },
  },
  {
    name: "objet_ranger",
    description: "Range un objet dans un lot, ou l'en sort si le lot est vide.",
    inputSchema: obj({
      code: str("Code de l'objet (I…)."),
      lot: str("Code du lot (L…), ou chaîne vide pour le sortir de tout lot."),
    }, ["code", "lot"]),
    handler: (a) => {
      const code = String(a.code).toUpperCase();
      const lot = String(a.lot ?? "").toUpperCase() || null;
      if (lot && !q.getLotByCode(lot)) return { erreur: `Aucun lot avec le code ${a.lot}.` };
      return m.updateItem(code, { lot })
        ? { message: lot ? `Rangé dans ${lot}.` : "Sorti de son lot." }
        : { erreur: `Aucun objet avec le code ${a.code}.` };
    },
  },
  {
    name: "stock_ajuster",
    description:
      "Ajoute ou retire de la quantité d'un objet — utile pour les consommables. " +
      "Un delta négatif décompte ; la quantité ne descend pas sous zéro.",
    inputSchema: obj({
      code: str("Code de l'objet (I…)."),
      delta: num("Variation, ex. 5 ou -2."),
    }, ["code", "delta"]),
    handler: (a) => {
      const qty = m.bumpQty(String(a.code).toUpperCase(), Number(a.delta));
      return qty === null
        ? { erreur: `Aucun objet avec le code ${a.code}.` }
        : { quantite: qty, message: `Nouvelle quantité : ${qty}.` };
    },
  },
  {
    name: "a_racheter_lister",
    description:
      "La liste de courses : tout ce qui est à racheter, avec la raison — marqué à la main, " +
      "épuisé, sous son seuil, ou porté manquant. À consulter avant de proposer une commande.",
    inputSchema: obj({}),
    handler: () =>
      q.listItems({ aRacheter: true }).map((i) => ({
        code: i.code, nom: i.name, raison: q.restockReason(i),
        reste: `${i.qty} ${i.unit}`, categorie: i.category || undefined,
        lot: i.lot_name || undefined, description: i.description || undefined,
      })),
  },
  {
    name: "stock_reappro",
    description:
      "Réapprovisionnement : fixe la nouvelle quantité et retire l'objet de la liste de courses. " +
      "À utiliser quand la commande est arrivée, plutôt que `stock_ajuster`.",
    inputSchema: obj({
      code: str("Code de l'objet (I…)."),
      quantite: num("Quantité désormais en stock."),
    }, ["code", "quantite"]),
    handler: (a) => {
      const qty = m.restock(String(a.code).toUpperCase(), Number(a.quantite));
      return qty === null
        ? { erreur: `Aucun objet avec le code ${a.code}.` }
        : { quantite: qty, message: `Réappro à ${qty}, retiré de la liste de courses.` };
    },
  },
  {
    name: "lot_creer",
    description: "Crée un lot (sac, caisse, tiroir…). Sans nom, il s'appellera « Lot N ».",
    inputSchema: obj({
      nom: str("Nom du lot."),
      type: str("Sac, Caisse, Valise, Boîte, Trousse, Carton, Tiroir, Étagère, Vrac."),
      ou: str("Où il se trouve : coffre, garage…"),
      description: str("Signes distinctifs, pour le reconnaître."),
    }),
    handler: (a) => {
      const code = m.createLot({
        name: a.nom, kind: a.type, place: a.ou, description: a.description,
      });
      return { code, message: `Lot créé sous le code ${code}.` };
    },
  },
  {
    name: "projet_creer",
    description: "Crée un projet auquel rattacher du matériel.",
    inputSchema: obj({
      nom: str("Nom du projet."),
      description: str("Ce qu'il faut faire, ce qui manque."),
      etat: str("actif, en pause, terminé."),
    }, ["nom"]),
    handler: (a) => {
      const code = m.createProject({ name: a.nom, description: a.description, status: a.etat });
      return { code, message: `Projet créé sous le code ${code}.` };
    },
  },
];

export function callTool(name: string, args: Record<string, unknown>) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Outil inconnu : ${name}`);
  return tool.handler((args ?? {}) as Record<string, never>);
}

export const TOOL_LIST = TOOLS.map(({ name, description, inputSchema }) => ({
  name, description, inputSchema,
}));
