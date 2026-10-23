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
  /** Content types of the resolved tree, plus `root`, `title-0`…`title-3` and `image` for the embed of an image. */
  types: readonly string[];
  /** Declarations, with values already in the written form of §0.5. */
  declarations: ReadonlyArray<readonly [StyleProperty, string]>;
  /** A rule of the block `@media (prefers-color-scheme: dark)`: only `color`, only in the dark theme. */
  dark?: true;
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
  { types: ['table', 'code', 'image', 'thematicBreak'], declarations: [['margin-bottom', '6pt']] },
  { types: ['root'], declarations: [['color', '#e6e6e6']], dark: true },
  { types: ['hyperlink'], declarations: [['color', '#8ab4f8']], dark: true },
];

/** The page background, fixed by the spec for each theme (§0.5); the renderer draws it. */
export const PAGE_BACKGROUND = { light: '#ffffff', dark: '#1e1e1e' } as const;
export type Theme = keyof typeof PAGE_BACKGROUND;

/** The base stylesheet written as CSS, as in §0.5. */
export function baseStylesheetCss(): string {
  const css = (rules: readonly BaseRule[]) =>
    rules.map((rule) => `${rule.types.join(', ')} { ${rule.declarations.map(([p, v]) => `${p}: ${v};`).join(' ')} }\n`).join('');
  const dark = BASE_STYLESHEET_RULES.filter((rule) => rule.dark);
  return css(BASE_STYLESHEET_RULES.filter((rule) => !rule.dark)) + `@media (prefers-color-scheme: dark) {\n${css(dark)}}\n`;
}

/**
 * The base fonts: the three open fonts the runtime carries for the generic families
 * (§0.5), variable in weight, with an upright and an italic file each.
 */
export const BASE_FONTS = {
  'serif': { family: 'Source Serif 4', normal: 'SourceSerif4Variable-Roman.ttf.woff2', italic: 'SourceSerif4Variable-Italic.ttf.woff2' },
  'sans-serif': { family: 'Source Sans 3', normal: 'SourceSans3VF-Upright.ttf.woff2', italic: 'SourceSans3VF-Italic.ttf.woff2' },
  'monospace': { family: 'Source Code Pro', normal: 'SourceCodeVF-Upright.ttf.woff2', italic: 'SourceCodeVF-Italic.ttf.woff2' },
} as const;
export type GenericFamily = keyof typeof BASE_FONTS;
/** The weight axis of the three fonts: a weight outside it is drawn at its nearest end. */
export const BASE_FONT_WEIGHTS = '200 900';
