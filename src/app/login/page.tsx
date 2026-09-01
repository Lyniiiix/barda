import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { expectedPassword, makeToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function login(fd: FormData) {
  "use server";
  const pwd = String(fd.get("password") ?? "");
  const next = String(fd.get("next") ?? "/") || "/";
  const expected = expectedPassword();
  if (!expected) redirect(`/login?e=2&next=${encodeURIComponent(next)}`);
  if (pwd !== expected) redirect(`/login?e=1&next=${encodeURIComponent(next)}`);

  const t = await makeToken();
  (await cookies()).set(t.name, t.value, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: t.maxAge,
  });
  redirect(next.startsWith("/") ? next : "/");
}

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div style={{ paddingTop: "22vh" }}>
      <h1 style={{ fontSize: 28, marginBottom: 4 }}>Barda</h1>
      <p className="muted small" style={{ marginTop: 0 }}>Inventaire du matériel.</p>
      <form action={login}>
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <div className="field">
          <label>Mot de passe</label>
          <input name="password" type="password" autoFocus autoComplete="current-password" />
        </div>
        {sp.e === "1" && <p className="small" style={{ color: "var(--bad)" }}>Mot de passe incorrect.</p>}
        {sp.e === "2" && (
          <p className="small" style={{ color: "var(--bad)" }}>
            `BARDA_PASSWORD` n&apos;est pas défini côté serveur — personne ne peut entrer tant que
            la variable n&apos;est pas posée dans Coolify.
          </p>
        )}
        <button className="btn primary wide" type="submit">Entrer</button>
      </form>
    </div>
  );
}
