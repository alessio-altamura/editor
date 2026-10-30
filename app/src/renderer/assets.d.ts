// The files the renderer takes as text at build time (esbuild, loader text).
declare module '*.svg' {
  const text: string;
  export default text;
}
