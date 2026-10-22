import type { Diagnostic, Severity } from './tree.js';

export type { Diagnostic, Severity };

/** Severity of every code in §11.2 of the spec. */
const SEVERITY: Record<string, Severity> = {
  'syntax': 'error',
  'id-missing': 'error',
  'id-invalid': 'error',
  'id-duplicate': 'error',
  'id-reused': 'error',
  'kind-missing': 'error',
  'kind-file-extension-mismatch': 'error',
  'kind-unknown': 'warning',
  'attribute-unknown': 'warning',
  'attribute-invalid': 'error',
  'association-unresolved': 'error',
  'association-kind': 'error',
  'association-retired': 'warning',
  'embed-unresolved': 'error',
  'embed-kind': 'error',
  'embed-retired': 'warning',
  'embed-cycle': 'error',
  'embed-outside-composition': 'error',
  'markdown-image': 'error',
  'tree-limit': 'error',
  'retired-chain': 'warning',
  'retired-cycle': 'error',
  'retired-successor-missing': 'error',
  'text-blocks': 'error',
  'composition-content': 'error',
  'raw-html': 'error',
  'embed-inline': 'error',
  'document-missing': 'warning',
  'reference-retired': 'warning',
  'embed-class-invalid': 'error',
  'number-slot-kind': 'warning',
  'stylesheet-ignored': 'warning',
  'stylesheet-kind': 'error',
  'spec-version-missing': 'warning',
  'lang-unsupported': 'warning',
  'reference-text-missing': 'warning',
  'canvas-path-unresolved': 'error',
  'document-duplicate': 'error',
  'document-content': 'error',
  'math-line-invalid': 'warning',
  'math-line-ambiguous': 'warning',
  'eval-unsupported': 'warning',
  'asset-missing': 'error',
  'stylesheet-unsupported': 'warning',
  'reference-unresolved': 'error',
};

export function makeDiagnostic(code: string, file: string, target?: string, fix?: string): Diagnostic {
  const severity = SEVERITY[code];
  if (severity === undefined) throw new Error(`unknown diagnostic code ${code}`);
  const diagnostic: Diagnostic = { severity, code, file };
  if (target !== undefined) diagnostic.target = target;
  if (fix !== undefined) diagnostic.fix = fix;
  return diagnostic;
}

/** Sink for diagnostics; `null` while a node is resolved again inside a root composition. */
export type DiagnosticSink = Diagnostic[] | null;

export function report(sink: DiagnosticSink, code: string, file: string, target?: string, fix?: string): void {
  sink?.push(makeDiagnostic(code, file, target, fix));
}

/** Orders strings by Unicode code point, as §11.3 asks (JS `<` compares UTF-16 units). */
export function compareCodePoints(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i]!.codePointAt(0)! - y[i]!.codePointAt(0)!;
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

export function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort(
    (a, b) =>
      compareCodePoints(a.file, b.file) ||
      compareCodePoints(a.code, b.code) ||
      compareCodePoints(a.target ?? '', b.target ?? ''),
  );
}
