/** 画像ファイルをVision API呼び出し用のbase64ペイロードに変換する共通ヘルパー */
export function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, base64] = result.split(",");
      const mediaType = meta.match(/data:(.*);base64/)?.[1] ?? file.type;
      resolve({ base64, mediaType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
