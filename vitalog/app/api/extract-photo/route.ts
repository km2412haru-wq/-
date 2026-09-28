import { NextResponse } from "next/server";
import { extractFromPhoto } from "@/lib/anthropic";
import { PHOTO_CAPTURE_KINDS, type ExtractPhotoResponse, type PhotoCaptureKind } from "@/types/photoCapture";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // base64換算。Anthropic APIの上限に対する安全マージン

function isPhotoCaptureKind(value: unknown): value is PhotoCaptureKind {
  return typeof value === "string" && (PHOTO_CAPTURE_KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    kind?: unknown;
    imageBase64?: unknown;
    mediaType?: unknown;
  } | null;

  const kind = body?.kind;
  const imageBase64 = body?.imageBase64;
  const mediaType = body?.mediaType;

  if (!isPhotoCaptureKind(kind) || typeof imageBase64 !== "string" || typeof mediaType !== "string") {
    return NextResponse.json<ExtractPhotoResponse>(
      { fields: null, message: "不正なリクエストです" },
      { status: 400 }
    );
  }

  if (imageBase64.length > MAX_IMAGE_BYTES) {
    return NextResponse.json<ExtractPhotoResponse>(
      { fields: null, message: "画像サイズが大きすぎます" },
      { status: 400 }
    );
  }

  try {
    const fields = await extractFromPhoto(kind, imageBase64, mediaType);
    return NextResponse.json<ExtractPhotoResponse>({ fields });
  } catch (err) {
    // 写真の自動読み取りは付随機能。APIキー未設定・通信エラー時も
    // 手動入力にフォールバックできるよう500にはしない
    console.error("写真からの自動読み取りに失敗しました:", err);
    return NextResponse.json<ExtractPhotoResponse>({
      fields: null,
      message: "自動読み取りは利用できません。手動で入力してください。",
    });
  }
}
