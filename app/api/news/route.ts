import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/fetchNews";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const force = request.nextUrl.searchParams.get("refresh") === "1";
  const result = await getNews({ force });
  return NextResponse.json(result);
}
