import {
  BriefcaseMedical, Bolt, Cable, CookingPot, Cpu, Drill, FileText, HardDrive, Laptop, Package,
  Ruler, Shirt, SprayCan, Tent, Wrench, type LucideIcon,
} from "lucide-react";

/** Une icône par catégorie : c'est le repère visuel quand il n'y a pas de photo. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "Outil": Wrench,
  "Outil électroportatif": Drill,
  "Consommable": SprayCan,
  "Électronique": Cpu,
  "Câble / connectique": Cable,
  "Informatique": Laptop,
  "Stockage": HardDrive,
  "Mesure": Ruler,
  "Quincaillerie": Bolt,
  "Camping / voyage": Tent,
  "Cuisine": CookingPot,
  "Vêtement": Shirt,
  "Papier / administratif": FileText,
  "Santé / secours": BriefcaseMedical,
  "Autre": Package,
};

export function CategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  const Icon = CATEGORY_ICONS[category] ?? Package;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}

/** Taille et trait communs à toutes les icônes d'interface. */
export const ic = { size: 18, strokeWidth: 1.9, "aria-hidden": true } as const;
export const icSm = { size: 15, strokeWidth: 2, "aria-hidden": true } as const;
