import Link from "next/link";
import { Ban, Check, X } from "lucide-react";
import { kindOf } from "@/lib/codes";
import type { LogEntry } from "@/lib/print";

const LOOK: Record<LogEntry["outcome"], { chip: string; Icon: typeof Check }> = {
  "imprimé": { chip: "ok", Icon: Check },
  "échec": { chip: "bad", Icon: X },
  "annulé": { chip: "warn", Icon: Ban },
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
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
      <div className="row">
        <span className={`chip ${look.chip}`}><look.Icon size={13} strokeWidth={2.4} aria-hidden />{entry.outcome}</span>
        <span className="small" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
