"use client";

/**
 * Opens claude.ai in a new tab with a question pre-filled via the
 * `?q=` param. No API key, no billing — just a deep link. Requires the
 * visitor to be signed in to a (free) claude.ai account.
 */
export default function AskClaudeButton({
  prompt,
  label = "🤖 クロードにやさしく解説してもらう",
}: {
  prompt: string;
  label?: string;
}) {
  function handleClick() {
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button type="button" className="askClaudeBtn" onClick={handleClick}>
      {label}
    </button>
  );
}
