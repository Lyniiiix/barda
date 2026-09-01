import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db, now, rows } from "@/lib/db";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Le Mac s'authentifie par jeton ; l'app, par le cookie de session. */
async function allowed(req: Request, tokenOnly = false): Promise<boolean> {
  const token = process.env.BARDA_PRINT_TOKEN;
  const given = req.headers.get("x-barda-token");
  if (token && given && given === token) return true;
  if (tokenOnly) return false;
  return verifyToken((await cookies()).get(COOKIE_NAME)?.value);
}

/** Relevé par le spooler du Mac : les étiquettes en attente. */
export async function GET(req: Request) {
  if (!(await allowed(req, true))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const jobs = rows<{ id: number; label: string; png: string; copies: number }>(
    db.prepare("SELECT id, label, png, copies FROM print_queue WHERE state = 'en_attente' ORDER BY id LIMIT 20").all(),
  );
  return NextResponse.json({ jobs });
}

/** Mise en file depuis l'app. */
export async function POST(req: Request) {
  if (!(await allowed(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.png || typeof body.png !== "string" || !body.png.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "png manquant" }, { status: 400 });
  }
  db.prepare("INSERT INTO print_queue (label, png, copies, created_at) VALUES (?, ?, ?, ?)")
    .run(String(body.label ?? "étiquette"), body.png, Math.max(1, Number(body.copies) || 1), now());
  return NextResponse.json({ ok: true });
}

/** Acquittement par le spooler. */
export async function PUT(req: Request) {
  if (!(await allowed(req, true))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const ids: number[] = Array.isArray(body?.done) ? body.done.map(Number).filter(Number.isInteger) : [];
  const stmt = db.prepare("UPDATE print_queue SET state = 'imprimé' WHERE id = ?");
  for (const id of ids) stmt.run(id);
  return NextResponse.json({ ok: true, done: ids.length });
}
