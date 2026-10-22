// Math lines (§0.4): grammar, decimal arithmetic and the strings to show.
import { Decimal as DecimalJs } from 'decimal.js';

/** 34 significant digits, half-even: the precision of decimal128 (§0.4). */
export const Decimal = DecimalJs.clone({
  precision: 34,
  rounding: DecimalJs.ROUND_HALF_EVEN,
  maxE: 9e15,
  minE: -9e15,
});
export type Decimal = InstanceType<typeof Decimal>;

const MAX_PARENTHESES = 100;
const E_MIN = -6143;
const E_MAX = 6144;

/** True when a value fits the decimal128 exponent range, read exactly (§0.4). */
export function inDecimal128Range(value: Decimal): boolean {
  return value.isZero() || (value.isFinite() && value.e >= E_MIN && value.e <= E_MAX);
}

/**
 * Reads a decimal literal exactly. Returns null when its adjusted exponent is
 * out of the decimal128 range, checked on the digits before decimal.js sees them.
 */
export function readDecimal(literal: string): Decimal | null {
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(literal);
  if (!match) return null;
  const intPart = match[2] ?? '';
  const fracPart = match[3] ?? '';
  const digits = (intPart + fracPart).replace(/^0+/, '');
  if (digits !== '') {
    const adjusted = BigInt(match[4] ?? '0') - BigInt(fracPart.length) + BigInt(digits.length - 1);
    if (adjusted < BigInt(E_MIN) || adjusted > BigInt(E_MAX)) return null;
  }
  // More than 34 digits round when read, so `= x` and `= x + 0` agree (§0.4).
  const rounded = new Decimal(literal).toSignificantDigits(34, Decimal.ROUND_HALF_EVEN);
  // Rounding can carry past the range, as 35 nines do: checked again like a result.
  return inDecimal128Range(rounded) ? rounded : null;
}

/** Writes a value with the point, without exponent or trailing zeros, and without the sign of a zero. */
export function plainString(value: Decimal): string {
  if (value.isZero()) return '0';
  return value.toFixed();
}

export function roundHalfEven(value: Decimal, places: number): Decimal {
  return value.toDecimalPlaces(places, Decimal.ROUND_HALF_EVEN);
}

interface LangFormat {
  decimal: string;
  group: string;
  minimumGroupingDigits: number;
  compact: [string, string, string, string];
}

/** The language table of §0.4, from CLDR 48. Compact suffixes for 1e3, 1e6, 1e9, 1e12. */
const LANGS: ReadonlyMap<string, LangFormat> = new Map([
  ['it', { decimal: ',', group: '.', minimumGroupingDigits: 2, compact: ['K', '\u00a0Mln', '\u00a0Mld', '\u00a0Bln'] }],
  ['en', { decimal: '.', group: ',', minimumGroupingDigits: 1, compact: ['K', 'M', 'B', 'T'] }],
]);

/** Looks up a BCP 47 tag: the exact row first, then the language without region. */
export function langFormat(lang: string): LangFormat | undefined {
  const tag = lang.toLowerCase();
  return LANGS.get(tag) ?? LANGS.get(tag.split('-')[0]!);
}

function localize(plain: string, format: LangFormat | undefined): string {
  if (!format) return plain;
  const negative = plain.startsWith('-');
  const [intPart = '', fracPart] = (negative ? plain.slice(1) : plain).split('.');
  let grouped = intPart;
  if (intPart.length >= 3 + format.minimumGroupingDigits) {
    grouped = intPart.replace(/\B(?=(\d{3})+$)/g, format.group);
  }
  return (negative ? '-' : '') + grouped + (fracPart === undefined ? '' : format.decimal + fracPart);
}

export type NumberNotation = 'standard' | 'compact';

/** The `display` string: half-even to 10 decimals, or the compact form of §0.4. */
export function displayString(value: Decimal, lang: string | undefined, notation: NumberNotation, decimals = 2): string {
  const format = lang === undefined ? undefined : langFormat(lang);
  // Without a language, compact gives the string without language: no short form (reading of §0.4).
  if (notation === 'compact' && format && value.abs().gte(1000)) {
    const divisors = [new Decimal(1e3), new Decimal(1e6), new Decimal(1e9), new Decimal(1e12)];
    for (let i = 0; i < divisors.length; i++) {
      const scaled = roundHalfEven(value.abs().div(divisors[i]!), 1);
      // The divisor is chosen on the rounded value: 999950 gives 1M, not 1000K.
      if (scaled.lt(1000) || i === divisors.length - 1) {
        return (value.isNegative() ? '-' : '') + localize(plainString(scaled), format) + format.compact[i];
      }
    }
  }
  return localize(plainString(roundHalfEven(value, decimals)), format);
}

export interface MathLineResult {
  value?: Decimal;
  /** Numbers written like 1.200, for `math-line-ambiguous`. */
  ambiguous: string[];
}

type Token = { kind: 'number'; text: string } | { kind: 'op'; text: string };

function tokenize(expression: string): Token[] | null {
  const tokens: Token[] = [];
  const pattern = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([-+*/()]))/y;
  let index = 0;
  while (index < expression.length) {
    if (/^\s*$/.test(expression.slice(index))) break;
    pattern.lastIndex = index;
    const match = pattern.exec(expression);
    if (!match) return null;
    tokens.push(match[1] !== undefined ? { kind: 'number', text: match[1] } : { kind: 'op', text: match[2]! });
    index = pattern.lastIndex;
  }
  return tokens;
}

/** Evaluates the expression after «= »; no value means `math-line-invalid`. */
export function evaluateMathLine(expression: string): MathLineResult {
  const tokens = tokenize(expression);
  if (!tokens) return { ambiguous: [] };
  const ambiguous = tokens
    // With a zero integer part, as in 0.123, the number cannot mean 123.
    .filter((t) => t.kind === 'number' && /^\d*[1-9]\d*\.\d{3}$/.test(t.text))
    .map((t) => t.text);
  let position = 0;

  const fail = (): never => {
    throw new MathLineError();
  };
  const checked = (value: Decimal): Decimal => (inDecimal128Range(value) ? value : fail());

  const parseExpression = (): Decimal => {
    let value = parseTerm();
    while (tokens[position]?.text === '+' || tokens[position]?.text === '-') {
      const op = tokens[position++]!.text;
      const right = parseTerm();
      value = checked(op === '+' ? value.plus(right) : value.minus(right));
    }
    return value;
  };
  const parseTerm = (): Decimal => {
    let value = parseFactor();
    while (tokens[position]?.text === '*' || tokens[position]?.text === '/') {
      const op = tokens[position++]!.text;
      const right = parseFactor();
      if (op === '/' && right.isZero()) fail();
      value = checked(op === '*' ? value.times(right) : value.div(right));
    }
    return value;
  };
  // Deep parentheses make the line invalid instead of exhausting the stack (reading).
  let nesting = 0;
  const parseFactor = (): Decimal => {
    let negative = false;
    if (tokens[position]?.text === '-') {
      negative = true;
      position++;
    }
    const token = tokens[position++];
    let value: Decimal;
    if (token?.kind === 'number') {
      value = readDecimal(token.text) ?? fail();
    } else if (token?.text === '(') {
      if (++nesting > MAX_PARENTHESES) fail();
      value = parseExpression();
      nesting--;
      if (tokens[position++]?.text !== ')') fail();
    } else {
      return fail();
    }
    return negative ? value.negated() : value;
  };

  try {
    const value = parseExpression();
    if (position !== tokens.length) return { ambiguous: [] };
    return { value, ambiguous };
  } catch (error) {
    if (error instanceof MathLineError) return { ambiguous: [] };
    throw error;
  }
}

class MathLineError extends Error {}
