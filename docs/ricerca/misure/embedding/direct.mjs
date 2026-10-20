// Usage: node direct.mjs <node|web> <onnx file name> <threads> <outfile>
// Runs the same ONNX graph through onnxruntime-node (CPU EP) or onnxruntime-web (WASM EP) in Node,
// with identical tokenization and identical JS pooling, and hashes the raw outputs.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const PKG = process.env.PKG ?? new URL('./node_modules', import.meta.url).pathname;
const MODELS = process.env.MODELS ?? new URL('./models', import.meta.url).pathname;

const MDIR = MODELS + '/Xenova/multilingual-e5-small';
const [backend, onnxName, threadsArg, outfile] = process.argv.slice(2);
const threads = Number(threadsArg);

const T = await import(PKG + '/@huggingface/transformers/dist/transformers.node.mjs');
T.env.cacheDir = MODELS;
const tok = await T.AutoTokenizer.from_pretrained('Xenova/multilingual-e5-small');

let ort, sessOpts;
if (backend === 'web') {
  ort = await import(PKG + '/onnxruntime-web/dist/ort.node.min.mjs');
  ort.env.wasm.numThreads = threads;
  sessOpts = { executionProviders: ['wasm'] };
} else {
  ort = await import(PKG + '/onnxruntime-node/dist/index.js').then(m => m.default ?? m);
  sessOpts = { executionProviders: ['cpu'], intraOpNumThreads: threads, interOpNumThreads: 1 };
}
const session = await ort.InferenceSession.create(MDIR + '/onnx/' + onnxName, sessOpts);

const texts = [
  'query: Il collegamento tra concetto e oggetto si rompe quando il file viene rinominato.',
  'passage: La tabella riporta le vendite trimestrali per regione, con colonne anno, regione e fatturato.',
  'passage: Un grafico a barre mostra la crescita del fatturato.',
  'passage: Il paragrafo descrive come il runtime riconcilia le modifiche fatte da Git.',
  'passage: Una fotografia di un gatto su un divano.',
];
const enc = tok(texts, { padding: true, truncation: true });
const feeds = {};
for (const name of session.inputNames) {
  const t = enc[name] ?? (name === 'token_type_ids' ? null : undefined);
  if (t) feeds[name] = new ort.Tensor('int64', t.data, t.dims);
  else if (name === 'token_type_ids') feeds[name] = new ort.Tensor('int64', new BigInt64Array(enc.input_ids.data.length), enc.input_ids.dims);
}
const res = await session.run(feeds);
const hs = res[session.outputNames[0]];
const [B, L, D] = hs.dims;
const mask = enc.attention_mask.data;
const pooled = new Float32Array(B * D);
for (let b = 0; b < B; b++) {
  let n = 0;
  const acc = new Float64Array(D);
  for (let l = 0; l < L; l++) {
    if (mask[b * L + l] === 0n) continue;
    n++;
    for (let d = 0; d < D; d++) acc[d] += hs.data[(b * L + l) * D + d];
  }
  let norm = 0;
  for (let d = 0; d < D; d++) { acc[d] /= n; norm += acc[d] * acc[d]; }
  norm = Math.sqrt(norm);
  for (let d = 0; d < D; d++) pooled[b * D + d] = acc[d] / norm;
}
const h = (a) => createHash('sha256').update(Buffer.from(a.buffer, a.byteOffset, a.byteLength)).digest('hex');
writeFileSync(outfile, JSON.stringify({ backend, onnxName, threads, dims: hs.dims, sha_hidden: h(hs.data), sha_pooled: h(pooled), pooled: Array.from(pooled) }));
console.log(backend, onnxName, 't=' + threads, hs.dims.join('x'), 'hidden', h(hs.data).slice(0, 16), 'pooled', h(pooled).slice(0, 16));
