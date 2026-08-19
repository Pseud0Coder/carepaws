import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/firestore";

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) },
      { status: 500 }
    );
  }
}
