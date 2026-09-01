import { exportAll } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const body = JSON.stringify(exportAll(), null, 2);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="barda-${day}.json"`,
    },
  });
}
