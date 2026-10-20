// Usage: node embed.mjs <backend: node|web> <dtype> <threads> <outfile>
// Embeds a fixed set of Italian sentences and writes raw float32 vectors + sha256.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const PKG = process.env.PKG ?? new URL('./node_modules', import.meta.url).pathname;
const MODELS = process.env.MODELS ?? new URL('./models', import.meta.url).pathname;

const [backend, dtype, threadsArg, outfile] = process.argv.slice(2);
const threads = Number(threadsArg);

if (backend === 'web') {
  const ortWeb = await import(PKG + '/onnxruntime-web/dist/ort.node.min.mjs').catch(async () => import(PKG + '/onnxruntime-web/dist/ort.wasm.min.mjs'));
  ortWeb.env.wasm.numThreads = threads;
  globalThis[Symbol.for('onnxruntime')] = ortWeb;
}
const T = await import(PKG + '/@huggingface/transformers/dist/transformers.node.mjs');
T.env.cacheDir = MODELS;
T.env.allowLocalModels = false;

const opts = { dtype };
if (backend === 'web') opts.device = 'wasm';
else opts.session_options = { intraOpNumThreads: threads, interOpNumThreads: 1 };

const extractor = await T.pipeline('feature-extraction', 'Xenova/multilingual-e5-small', opts);
const texts = [
  'query: Il collegamento tra concetto e oggetto si rompe quando il file viene rinominato.',
  'passage: La tabella riporta le vendite trimestrali per regione, con colonne anno, regione e fatturato.',
  'passage: Un grafico a barre mostra la crescita del fatturato.',
  'passage: Il paragrafo descrive come il runtime riconcilia le modifiche fatte da Git.',
  'passage: Una fotografia di un gatto su un divano.',
];
const out = await extractor(texts, { pooling: 'mean', normalize: true });
const data = out.data; // Float32Array
const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
const sha = createHash('sha256').update(buf).digest('hex');
writeFileSync(outfile, JSON.stringify({ backend, dtype, threads, dims: out.dims, sha256: sha, data: Array.from(data) }));
console.log(backend, dtype, threads, out.dims.join('x'), sha);
