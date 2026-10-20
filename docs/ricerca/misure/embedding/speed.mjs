// Usage: node speed.mjs <dtype> <threads>
const PKG = process.env.PKG ?? new URL('./node_modules', import.meta.url).pathname;
const MODELS = process.env.MODELS ?? new URL('./models', import.meta.url).pathname;
const T = await import(PKG + '/@huggingface/transformers/dist/transformers.node.mjs');
T.env.cacheDir = MODELS;
const [dtype, threadsArg] = process.argv.slice(2);
const threads = Number(threadsArg);
const t0 = performance.now();
const ex = await T.pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { dtype, session_options: { intraOpNumThreads: threads, interOpNumThreads: 1 } });
const tLoad = performance.now() - t0;
const base = 'passage: Il paragrafo numero NUM descrive come il runtime riconcilia le modifiche fatte da un altro editor o da Git, e quale concetto esprime rispetto alla composizione che lo cita.';
const texts = Array.from({ length: 256 }, (_, i) => base.replace('NUM', String(i)));
const nTok = texts.map(t => ex.tokenizer.encode(t).length);
await ex(texts.slice(0, 8), { pooling: 'mean', normalize: true }); // warm-up
const t1 = performance.now();
for (let i = 0; i < texts.length; i += 32) await ex(texts.slice(i, i + 32), { pooling: 'mean', normalize: true });
const dt = performance.now() - t1;
console.log(JSON.stringify({ dtype, threads, load_ms: Math.round(tLoad), items: texts.length, tokens_per_item: nTok[0], total_ms: Math.round(dt), ms_per_item: +(dt / texts.length).toFixed(2), rss_mb: Math.round(process.memoryUsage().rss / 1e6) }));
