import { NextRequest, NextResponse } from "next/server";
import { getSitterInvoices } from "@/lib/firestore";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sitterId = searchParams.get("sitterId");
  if (!sitterId) return NextResponse.json({ error: "sitterId required" }, { status: 400 });

  const invoices = await getSitterInvoices(sitterId);
  return NextResponse.json(invoices);
}
