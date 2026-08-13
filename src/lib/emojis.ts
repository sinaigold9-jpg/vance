export const ALLOWED_EMOJIS = [
  "🎮",
  "💰",
  "⚠️",
  "🏅",
  "🏆",
  "🎖️",
  "🥇",
  "🎁",
  "👆",
  "☺️",
  "🥳",
  "🫡",
  "🧐",
  "😕",
  "🎉",
  "🎊",
  "👇",
  "🤔",
  "👍",
  "✌️",
];

export const DEFAULT_EMOJI = "🏅";

export function isAllowedEmoji(e: string | null | undefined) {
  if (!e) return false;
  return ALLOWED_EMOJIS.includes(e);
}

export function sanitizeEmoji(e: string | null | undefined) {
  if (!e) return DEFAULT_EMOJI;
  return isAllowedEmoji(e) ? e : DEFAULT_EMOJI;
}
