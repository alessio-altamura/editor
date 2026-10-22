// The base stylesheet of §0.5 as data: the one source for the resolution and for the export.

/** The properties of the class 1 subset, in the order of §0.5, without `--number-notation`. */
export const STYLE_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'text-align',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'line-height',
  'text-decoration-line',
] as const;
export type StyleProperty = (typeof STYLE_PROPERTIES)[number];

/** Inherited, as in CSS: all but the margins and `text-decoration-line`. */
export const INHERITED_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'color',
  'text-align',
  'line-height',
] as const;

/** The value of a property that is not inherited and that no rule sets. */
export const NOT_INHERITED_DEFAULTS: Readonly<Record<string, string>> = {
  'margin-top': '0pt',
  'margin-right': '0pt',
  'margin-bottom': '0pt',
  'margin-left': '0pt',
  'text-decoration-line': 'none',
};

export interface BaseRule {
  /** Content types of the resolved tree, plus `root` and `title-0`…`title-3`. */
  types: readonly string[];
  /** Declarations, with values already in the written form of §0.5. */
  declarations: ReadonlyArray<readonly [StyleProperty, string]>;
}

export const BASE_STYLESHEET_RULES: readonly BaseRule[] = [
  {
    types: ['root'],
    declarations: [
      ['font-family', 'serif'], ['font-size', '11pt'], ['line-height', '1.4'], ['color', '#000000'],
      ['font-weight', '400'], ['font-style', 'normal'], ['text-align', 'left'],
    ],
  },
  { types: ['paragraph'], declarations: [['margin-bottom', '6pt']] },
  { types: ['title-0'], declarations: [['font-size', '22pt'], ['font-weight', '700'], ['margin-bottom', '12pt']] },
  { types: ['title-1'], declarations: [['font-size', '18pt'], ['font-weight', '700'], ['margin-top', '18pt'], ['margin-bottom', '9pt']] },
  { types: ['title-2'], declarations: [['font-size', '14pt'], ['font-weight', '700'], ['margin-top', '12pt'], ['margin-bottom', '6pt']] },
  { types: ['title-3'], declarations: [['font-size', '11pt'], ['font-weight', '700'], ['margin-top', '9pt'], ['margin-bottom', '3pt']] },
  { types: ['emphasis'], declarations: [['font-style', 'italic']] },
  { types: ['strong'], declarations: [['font-weight', '700']] },
  { types: ['inlineCode', 'code'], declarations: [['font-family', 'monospace']] },
  { types: ['hyperlink'], declarations: [['color', '#1a4f8b'], ['text-decoration-line', 'underline']] },
  { types: ['blockquote'], declarations: [['margin-left', '24pt']] },
  { types: ['list'], declarations: [['margin-left', '18pt'], ['margin-bottom', '6pt']] },
];

/** The base stylesheet written as CSS, as in §0.5. */
export function baseStylesheetCss(): string {
  return BASE_STYLESHEET_RULES.map(
    (rule) => `${rule.types.join(', ')} { ${rule.declarations.map(([p, v]) => `${p}: ${v};`).join(' ')} }\n`,
  ).join('');
}
