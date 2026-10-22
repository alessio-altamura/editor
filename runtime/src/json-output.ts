// Writes a JSON value in chunks, so a large resolved tree never becomes one string.
import { writeSync } from 'node:fs';

const CHUNK = 1 << 16;

export function writeAll(fd: number, text: string): void {
  const buffer = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < buffer.length) {
    try {
      offset += writeSync(fd, buffer, offset);
    } catch (error) {
      // A pipe may be non-blocking: wait for the reader and try again.
      if ((error as NodeJS.ErrnoException).code !== 'EAGAIN') throw error;
    }
  }
}

/** The same text as JSON.stringify(value, null, indent), followed by a line feed. */
export function writeJson(fd: number, value: unknown, indent: number): void {
  let pending = '';
  const emit = (text: string) => {
    pending += text;
    if (pending.length >= CHUNK) {
      writeAll(fd, pending);
      pending = '';
    }
  };
  const newline = (depth: number) => {
    if (indent > 0) emit('\n' + ' '.repeat(indent * depth));
  };
  const visit = (item: unknown, depth: number): void => {
    if (Array.isArray(item)) {
      if (item.length === 0) return emit('[]');
      emit('[');
      item.forEach((element, index) => {
        if (index > 0) emit(',');
        newline(depth + 1);
        visit(element === undefined ? null : element, depth + 1);
      });
      newline(depth);
      return emit(']');
    }
    if (item !== null && typeof item === 'object') {
      const entries = Object.entries(item).filter(([, element]) => element !== undefined);
      if (entries.length === 0) return emit('{}');
      emit('{');
      entries.forEach(([key, element], index) => {
        if (index > 0) emit(',');
        newline(depth + 1);
        emit(JSON.stringify(key) + (indent > 0 ? ': ' : ':'));
        visit(element, depth + 1);
      });
      newline(depth);
      return emit('}');
    }
    emit(JSON.stringify(item) ?? 'null');
  };
  visit(value, 0);
  emit('\n');
  writeAll(fd, pending);
}
