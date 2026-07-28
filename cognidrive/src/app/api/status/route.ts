import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/supabase/client";

export async function GET() {
  const status = getConfigStatus();
  return NextResponse.json(status);
}
