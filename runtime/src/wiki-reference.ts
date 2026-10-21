// `[[…]]` and `![[…]]` as a micromark text construct (§0.6): they are tokenized
// before the other inline constructs, outside code, and their text is plain text.
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Code, Construct, Effects, Extension, State, TokenizeContext } from 'micromark-util-types';

/** An `id reference` in the text: `[[value]]`, or `![[value]]` when `embed` is true. */
export interface WikiReference {
  type: 'wikiReference';
  /** What stands between the brackets, as written, with `\|` read as `|`. */
  value: string;
  embed: boolean;
  position?: import('unist').Position;
}

declare module 'mdast' {
  interface PhrasingContentMap {
    wikiReference: WikiReference;
  }
  interface RootContentMap {
    wikiReference: WikiReference;
  }
}

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    wikiReference: 'wikiReference';
    wikiReferenceMarker: 'wikiReferenceMarker';
    wikiReferenceString: 'wikiReferenceString';
  }
}

const EXCLAMATION = 33;
const LEFT_BRACKET = 91;
const RIGHT_BRACKET = 93;

function tokenizer(embed: boolean) {
  return function tokenize(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
    // Line endings are the negative codes below -2; brackets inside are not allowed.
    const stops = (code: Code) => code === null || code < -2 || code === LEFT_BRACKET;
    const open = (count: number): State => (code) => {
      if (code !== LEFT_BRACKET) return nok(code);
      effects.consume(code);
      if (count === 1) return open(2);
      effects.exit('wikiReferenceMarker');
      return first;
    };
    const first: State = (code) => {
      if (stops(code) || code === RIGHT_BRACKET) return nok(code);
      effects.enter('wikiReferenceString');
      effects.consume(code);
      return inside;
    };
    const inside: State = (code) => {
      if (stops(code)) return nok(code);
      if (code === RIGHT_BRACKET) {
        effects.exit('wikiReferenceString');
        effects.enter('wikiReferenceMarker');
        effects.consume(code);
        return close;
      }
      effects.consume(code);
      return inside;
    };
    const close: State = (code) => {
      if (code !== RIGHT_BRACKET) return nok(code);
      effects.consume(code);
      effects.exit('wikiReferenceMarker');
      effects.exit('wikiReference');
      return ok;
    };
    return (code) => {
      effects.enter('wikiReference');
      effects.enter('wikiReferenceMarker');
      if (embed) {
        if (code !== EXCLAMATION) return nok(code);
        effects.consume(code);
        return open(1);
      }
      return open(1)(code);
    };
  };
}

const reference: Construct = { name: 'wikiReference', tokenize: tokenizer(false), add: 'before' };
const embed: Construct = { name: 'wikiEmbed', tokenize: tokenizer(true), add: 'before' };

export function wikiReference(): Extension {
  return { text: { [LEFT_BRACKET]: reference, [EXCLAMATION]: embed } };
}

export function wikiReferenceFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      wikiReference(token) {
        const embed = this.sliceSerialize(token).startsWith('!');
        this.enter({ type: 'wikiReference', value: '', embed } as never, token);
      },
    },
    exit: {
      wikiReferenceString(token) {
        const node = this.stack[this.stack.length - 1] as unknown as WikiReference;
        node.value = this.sliceSerialize(token).replace(/\\\|/g, '|');
      },
      wikiReference(token) {
        this.exit(token);
      },
    },
  };
}
