// A unified diff of two texts, line by line, for --diff and --dry-run.

/** The longest common subsequence of lines; past this size, one hunk replaces the whole file. */
const MAX_CELLS = 4_000_000;

export function unifiedDiff(file: string, before: string | null, after: string | null, context = 3): string {
  const a = before === null || before === '' ? [] : before.replace(/\n$/, '').split('\n');
  const b = after === null || after === '' ? [] : after.replace(/\n$/, '').split('\n');
  // The edit script: ' ', '-' or '+' for each line.
  let script: Array<[string, string]>;
  if (a.length * b.length > MAX_CELLS) script = [...a.map((l) => ['-', l] as [string, string]), ...b.map((l) => ['+', l] as [string, string])];
  else {
    const n = a.length;
    const m = b.length;
    const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    script = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) {
        script.push([' ', a[i]!]);
        i++;
        j++;
      } else if (j < m && (i >= n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) script.push(['+', b[j++]!]);
      else script.push(['-', a[i++]!]);
    }
  }
  const out = [`--- ${before === null ? '/dev/null' : `a/${file}`}`, `+++ ${after === null ? '/dev/null' : `b/${file}`}`];
  let index = 0;
  while (index < script.length) {
    if (script[index]![0] === ' ') {
      index++;
      continue;
    }
    // A hunk: changes and up to `context` lines around them, joined when close.
    let start = Math.max(0, index - context);
    let end = index;
    while (end < script.length) {
      let next = end;
      while (next < script.length && script[next]![0] === ' ') next++;
      if (next >= script.length || next - end > 2 * context) break;
      while (next < script.length && script[next]![0] !== ' ') next++;
      end = next;
    }
    end = Math.min(script.length, end + context);
    const lineA = script.slice(0, start).filter(([t]) => t !== '+').length;
    const lineB = script.slice(0, start).filter(([t]) => t !== '-').length;
    const hunk = script.slice(start, end);
    const countA = hunk.filter(([t]) => t !== '+').length;
    const countB = hunk.filter(([t]) => t !== '-').length;
    out.push(`@@ -${countA === 0 ? lineA : lineA + 1},${countA} +${countB === 0 ? lineB : lineB + 1},${countB} @@`);
    for (const [type, line] of hunk) out.push(`${type}${line}`);
    index = end;
    start = end;
  }
  return out.join('\n') + '\n';
}
