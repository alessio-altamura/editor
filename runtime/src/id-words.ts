// An id from the first words of a text (§0.3, §11.9): lowercase, no accents, up to five words,
// without articles and prepositions at the end.

const TRAILING_WORDS = new Set([
  // Italian
  'il', 'lo', 'la', 'i', 'gli', 'le', 'l', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'e', 'o', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal',
  'dalla', 'dai', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli',
  'sulle',
  // English
  'the', 'an', 'of', 'to', 'on', 'at', 'by', 'for', 'from', 'with', 'and', 'or',
]);

/** The words of an id from a text, joined by `-`; empty when the text has none. */
export function idWords(text: string, most = 5): string {
  const words = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, most);
  while (words.length > 1 && TRAILING_WORDS.has(words[words.length - 1]!)) words.pop();
  return words.join('-');
}
