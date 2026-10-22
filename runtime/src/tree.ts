// The resolved tree of §11.3: types and forms only, shared by the resolution and the export.

/** The form of a `lang` value: a BCP 47 tag, loosely (§4). */
export const LANG_FORM = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{1,8})*$/;
/** The form of an `id` (§3). */
export const ID_FORM = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** The form of a `class` name (§3). */
export const CLASS_FORM = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export type Severity = 'error' | 'warning';

export interface Diagnostic {
  severity: Severity;
  code: string;
  file: string;
  target?: string;
  message?: string;
  fix?: string;
}

/** A JsonML element of the content: the type, an optional object of attributes, the children. */
export type JsonML = string | [string, ...unknown[]];

export interface TreeNode {
  id?: string;
  kind: string;
  directive?: true;
  file: string;
  attributes?: Record<string, unknown>;
  computedStyle?: Record<string, string>;
  content?: JsonML[];
}

export interface ResolvedTree {
  nodes?: TreeNode[];
  associations?: Array<{ ids: [string, string]; declaredIn: string[] }>;
  diagnostics?: Diagnostic[];
  document?: { id?: string; file: string; attributes?: Record<string, unknown> };
}
