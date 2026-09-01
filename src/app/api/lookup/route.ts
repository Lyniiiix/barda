import { NextResponse } from "next/server";
import { findByBarcode } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const barcode = new URL(req.url).searchParams.get("barcode") ?? "";
  const item = barcode ? findByBarcode(barcode) : null;
  return NextResponse.json({ code: item?.code ?? null, name: item?.name ?? null });
}
