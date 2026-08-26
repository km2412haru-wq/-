/**
 * Builds the pre-filled prompt text for an "ask Claude" deep link
 * (`https://claude.ai/new?q=...`). Kept short and single-purpose so it's
 * easy to unit test independent of the button component.
 */

const MAX_SOURCE_CHARS = 500;

export function truncateForPrompt(text: string, maxChars: number = MAX_SOURCE_CHARS): string {
  const trimmed = text.trim();
  return trimmed.length > maxChars ? trimmed.slice(0, maxChars).trim() + "…" : trimmed;
}

export function buildExplainPrompt(countryName: string, sectionLabel: string, text: string): string {
  const source = truncateForPrompt(text);
  return `「${countryName}」の${sectionLabel}について書かれた次の文章を、文系大学生にもわかるやさしい言葉で解説してください:\n\n${source}`;
}
