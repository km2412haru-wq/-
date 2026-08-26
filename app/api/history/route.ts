import { NextRequest, NextResponse } from "next/server";
import { fetchCountryHistory } from "@/lib/wikipedia";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "missing 'name' query param" }, { status: 400 });
  }

  const result = await fetchCountryHistory(name);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
