// I value del runtime (evaluateMathLine, src/math-line.ts) per le espressioni generate da
// decimali.py: node valori-runtime.mjs < espressioni.json > valori-runtime.json
import { readFileSync } from 'node:fs';
const { evaluateMathLine, plainString } = await import(new URL('../../../../runtime/dist/src/math-line.js', import.meta.url));
const sources = JSON.parse(readFileSync(0, 'utf8'));
const values = sources.map((source) => {
  const result = evaluateMathLine(source);
  return result.value === undefined ? null : plainString(result.value);
});
process.stdout.write(JSON.stringify(values) + '\n');
