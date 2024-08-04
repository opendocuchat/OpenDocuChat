import { NextResponse } from "next/server";
import { migrateToLatest } from "@/lib/migrate-db";

export async function GET() {
  try {
    const result = await migrateToLatest();
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}