// Fast, deterministic first layer — runs before the AI model call so obvious
// abuse is caught even if the moderation microservice is slow or unreachable.
const BANNED_TERMS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'faggot',
  'retard',
  'kill yourself',
  'kys',
];

// Leading boundary only (no trailing \b) so suffixed forms like "fucking" or
// "bitching" are still caught, not just the exact root word.
const BANNED_TERMS_PATTERN = new RegExp(
  `\\b(${BANNED_TERMS.map((term) => term.replace(/\s+/g, '\\s+')).join('|')})`,
  'i',
);

export function containsProfanity(text: string): boolean {
  return BANNED_TERMS_PATTERN.test(text);
}
