// Usage: node coppie.mjs
// Cosine similarity of Italian sentence pairs with multilingual-e5-small (q8, CPU):
// antonyms, negation and numbers against a paraphrase and an unrelated sentence.
const PKG = process.env.PKG ?? new URL('./node_modules', import.meta.url).pathname;
const MODELS = process.env.MODELS ?? new URL('./models', import.meta.url).pathname;
const T = await import(PKG + '/@huggingface/transformers/dist/transformers.node.mjs');
T.env.cacheDir = MODELS;
const ex = await T.pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype: 'q8', session_options: { intraOpNumThreads: 1, interOpNumThreads: 1 } });
const base = 'Nel terzo trimestre le vendite calano per i ritardi nelle consegne.';
const others = {
  parafrasi: 'Tra luglio e settembre il fatturato scende perché le consegne arrivano in ritardo.',
  antonimo: 'Nel terzo trimestre le vendite crescono per i ritardi nelle consegne.',
  negazione: 'Nel terzo trimestre le vendite non calano per i ritardi nelle consegne.',
  numero: 'Nel terzo trimestre le vendite calano del 3% per i ritardi nelle consegne.',
  numero_x10: 'Nel terzo trimestre le vendite calano del 30% per i ritardi nelle consegne.',
  stesso_tema: 'Le vendite del terzo trimestre sono riportate nella tabella per regione.',
  estraneo: 'Una fotografia di un gatto che dorme su un divano.',
};
const texts = ['passage: ' + base, ...Object.values(others).map(t => 'passage: ' + t)];
const out = await ex(texts, { pooling: 'mean', normalize: true });
const D = out.dims[1], v = out.data;
const cos = (i, j) => { let s = 0; for (let d = 0; d < D; d++) s += v[i * D + d] * v[j * D + d]; return s; };
const res = Object.fromEntries(Object.keys(others).map((k, i) => [k, +cos(0, i + 1).toFixed(4)]));
res['numero_vs_numero_x10'] = +cos(4, 5).toFixed(4);
console.log(JSON.stringify({ base, ...res }, null, 1));
