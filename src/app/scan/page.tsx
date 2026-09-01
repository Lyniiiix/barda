import Scanner from "@/components/Scanner";
import { listLots } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Scan({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const lots = listLots().map((l) => ({ code: l.code, name: l.name }));
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Scanner</h1>
          <div className="sub">Étiquette Barda ou code-barres du fabricant</div>
        </div>
      </div>
      <Scanner lots={lots} initialLot={sp.lot} />
    </>
  );
}
