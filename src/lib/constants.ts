export const CATEGORIES = [
  "Outil",
  "Outil électroportatif",
  "Consommable",
  "Électronique",
  "Câble / connectique",
  "Informatique",
  "Stockage",
  "Mesure",
  "Quincaillerie",
  "Camping / voyage",
  "Cuisine",
  "Vêtement",
  "Papier / administratif",
  "Santé / secours",
  "Autre",
];

/** L'état physique de la chose. « À racheter » n'est pas ici : c'est une intention. */
export const STATUSES = ["ok", "usé", "à réparer", "à remplacer", "prêté", "manquant"];

export const UNITS = ["u", "paire", "lot", "m", "cm", "kg", "g", "L", "mL", "boîte", "rouleau"];

export const LOT_KINDS = ["Sac", "Caisse", "Valise", "Boîte", "Trousse", "Carton", "Tiroir", "Étagère", "Vrac"];

/** Une icône par catégorie : c'est le repère visuel quand il n'y a pas de photo. */
export const CATEGORY_ICONS: Record<string, string> = {
  "Outil": "🔧",
  "Outil électroportatif": "🪛",
  "Consommable": "🧴",
  "Électronique": "🔋",
  "Câble / connectique": "🔌",
  "Informatique": "💻",
  "Stockage": "💾",
  "Mesure": "📏",
  "Quincaillerie": "🔩",
  "Camping / voyage": "⛺",
  "Cuisine": "🍴",
  "Vêtement": "👕",
  "Papier / administratif": "📄",
  "Santé / secours": "🩹",
  "Autre": "📦",
};

export const iconFor = (category: string) => CATEGORY_ICONS[category] ?? "📦";
