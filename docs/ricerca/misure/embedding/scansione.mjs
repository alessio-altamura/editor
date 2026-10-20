// Usage: node scansione.mjs
// Exhaustive dot-product scan over 10,000 random unit vectors of 384 float32, in plain JS.
const N = 10000, D = 384, R = 50;
let seed = 1; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5;
const db = new Float32Array(N * D);
for (let i = 0; i < N; i++) { let n = 0; for (let d = 0; d < D; d++) { const x = rnd(); db[i * D + d] = x; n += x * x; } n = Math.sqrt(n); for (let d = 0; d < D; d++) db[i * D + d] /= n; }
const q = db.slice(0, D), scores = new Float32Array(N);
const scan = () => { for (let i = 0; i < N; i++) { let s = 0; const o = i * D; for (let d = 0; d < D; d++) s += q[d] * db[o + d]; scores[i] = s; } };
for (let k = 0; k < 10; k++) scan();
const t = performance.now(); for (let k = 0; k < R; k++) scan(); const ms = (performance.now() - t) / R;
console.log(JSON.stringify({ vectors: N, dims: D, bytes: db.byteLength, ms_per_scan: +ms.toFixed(2) }));
