import { NextResponse } from "next/server";
import { tagMemo } from "@/lib/anthropic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { memo?: unknown } | null;
  const memo = body?.memo;
  if (typeof memo !== "string" || memo.trim().length === 0) {
    return NextResponse.json({ tags: [] });
  }

  try {
    const tags = await tagMemo(memo);
    return NextResponse.json({ tags });
  } catch (err) {
    // メモのタグ付けは付随機能。失敗しても記録自体は成立させたいので500にはしない
    console.error("メモのタグ付けに失敗しました:", err);
    return NextResponse.json({ tags: [] });
  }
}
