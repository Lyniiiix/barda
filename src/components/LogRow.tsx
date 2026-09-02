import Link from "next/link";
import { kindOf } from "@/lib/codes";
import type { LogEntry } from "@/lib/print";

const LOOK: Record<LogEntry["outcome"], { chip: string; icon: string }> = {
  "imprimé": { chip: "ok", icon: "✓" },
  "échec": { chip: "bad", icon: "✕" },
  "annulé": { chip: "warn", icon: "⊘" },
};

const fiche = (code: string) => {
  switch (kindOf(code)) {
    case "item": return `/objets/${code}`;
    case "lot": return `/lots/${code}`;
    case "project": return `/projets/${code}`;
    default: return null;
  }
};

/** Une ligne du journal : ce qui est arrivé à une étiquette, et quand. */
export default function LogRow({ entry }: { entry: LogEntry }) {
  const look = LOOK[entry.outcome] ?? LOOK["annulé"];
  const href = fiche(entry.code);

  return (
    <div className="card">
      <div className="row">
        <span className={`chip ${look.chip}`}>{look.icon} {entry.outcome}</span>
        <span className="small">
          {href ? <Link href={href} style={{ color: "var(--accent)" }}>{entry.label}</Link> : entry.label}
          {entry.copies > 1 && <span className="muted"> × {entry.copies}</span>}
        </span>
        <span className="small muted" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
          {new Date(entry.at).toLocaleString("fr-FR", {
            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </div>
      {entry.detail && <div className="card-desc small">{entry.detail}</div>}
    </div>
  );
}
