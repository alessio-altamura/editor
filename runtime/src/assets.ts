// The images of an export: read once, only from the files the runtime listed, and
// recognised by their first bytes, never by the extension (§11.4).
import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { join } from 'node:path';
import type { FileIdentity } from './resolve-tree.js';
import type { ExportAsset } from './static-export.js';

/** An image is embedded up to 64 MiB (§11.1). */
export const MAX_ASSET_BYTES = 64 * 1024 * 1024;

/** Reads a listed file without following links; null when it does not read or is not the listed file. */
function readListed(folder: string, path: string, identity: FileIdentity): Uint8Array | 'size' | null {
  let fd: number;
  try {
    fd = openSync(join(folder, path), constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  } catch {
    return null;
  }
  try {
    const stat = fstatSync(fd, { bigint: true });
    if (!stat.isFile() || stat.dev !== identity.dev || stat.ino !== identity.ino) return null;
    if (stat.size > BigInt(MAX_ASSET_BYTES)) return 'size';
    // Up to one byte past the limit, in case the file grew after fstat.
    const buffer = Buffer.alloc(Number(stat.size) + 1);
    let length = 0;
    for (;;) {
      if (length === buffer.length) {
        if (length > MAX_ASSET_BYTES) return 'size';
        break;
      }
      const read = readSync(fd, buffer, length, buffer.length - length, null);
      if (read === 0) break;
      length += read;
    }
    if (length > MAX_ASSET_BYTES) return 'size';
    return buffer.subarray(0, length);
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

const startsWith = (bytes: Uint8Array, prefix: number[], at = 0) => prefix.every((b, i) => bytes[at + i] === b);
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));
const utf8 = new TextDecoder('utf-8', { fatal: true });

/** The SVG rule: valid UTF-8, then past spaces, PIs, comments and one doctype, an svg tag in the SVG namespace. */
function isSvg(bytes: Uint8Array): boolean {
  let text: string;
  try {
    text = utf8.decode(startsWith(bytes, [0xef, 0xbb, 0xbf]) ? bytes.subarray(3) : bytes);
  } catch {
    return false;
  }
  let i = 0;
  let doctype = false;
  for (;;) {
    while (/[ \t\r\n]/.test(text[i] ?? '')) i++;
    if (text.startsWith('<?', i)) {
      const end = text.indexOf('?>', i + 2);
      if (end < 0) return false;
      i = end + 2;
    } else if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end < 0) return false;
      i = end + 3;
    } else if (!doctype && /^<!DOCTYPE[ \t\r\n]+svg[ \t\r\n>]/.test(text.slice(i, i + 15))) {
      // Without an internal subset: up to the first >.
      const end = text.indexOf('>', i);
      if (end < 0 || text.slice(i, end).includes('[')) return false;
      i = end + 1;
      doctype = true;
    } else break;
  }
  const tag = /^<svg([ \t\r\n][^>]*)?\/?>/.exec(text.slice(i, i + 65536));
  if (!tag) return false;
  return /[ \t\r\n]xmlns[ \t\r\n]*=[ \t\r\n]*("http:\/\/www\.w3\.org\/2000\/svg"|'http:\/\/www\.w3\.org\/2000\/svg')/.test(tag[1] ?? '');
}

/** The media type from the first bytes, from a closed list. */
export function sniffImage(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, ascii('GIF87a')) || startsWith(bytes, ascii('GIF89a'))) return 'image/gif';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp';
  if (isSvg(bytes)) return 'image/svg+xml';
  return null;
}

/** Reads an asset of the tree, a path from the document folder. */
export function readAsset(folder: string, path: string, listed: ReadonlyMap<string, FileIdentity>): ExportAsset {
  const identity = listed.get(path);
  if (identity === undefined) return { fallback: 'unreadable' };
  const bytes = readListed(folder, path, identity);
  if (bytes === null) return { fallback: 'unreadable' };
  if (bytes === 'size') return { fallback: 'size' };
  const mime = sniffImage(bytes);
  return mime === null ? { fallback: 'format' } : { mime, bytes };
}
