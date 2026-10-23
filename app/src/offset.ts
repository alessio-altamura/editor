// Where the cursor goes when the formatter rewrites the text: as close as it can to
// where it was, by the common start and the common end of the two texts.

export function mapOffset(before: string, after: string, offset: number): number {
  let prefix = 0;
  const limit = Math.min(before.length, after.length);
  while (prefix < limit && before[prefix] === after[prefix]) prefix++;
  if (offset <= prefix) return offset;
  let suffix = 0;
  while (suffix < limit - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  // In the common end: the same distance from the end.
  if (offset >= before.length - suffix) return after.length - (before.length - offset);
  // In the changed middle: the same distance into it, at most its new length.
  return Math.min(prefix + (offset - prefix), after.length - suffix);
}
