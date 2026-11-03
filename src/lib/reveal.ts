// Splits a string into visible text and hidden-character runs for the hero
// specimen. Runs of the same hidden kind collapse into one segment so 16
// zero-width characters render as a single "16 zero-width" chip. Each hidden
// segment keeps its `raw` characters so the page can emit the real thing.

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "zwc"; count: number; label: string; raw: string }
  | { kind: "bidi"; codepoint: string; label: string; raw: string }
  // A look-alike letter inside a Latin word; only produced with { homoglyphs: true }.
  | { kind: "glyph"; char: string; label: string };

const ZERO_WIDTH = new Set(["​", "‌", "‍", "⁠", "﻿"]);

const BIDI_NAMES: Record<string, string> = {
  "‪": "LRE",
  "‫": "RLE",
  "‬": "PDF",
  "‭": "LRO",
  "‮": "RLO",
  "⁦": "LRI",
  "⁧": "RLI",
  "⁨": "FSI",
  "⁩": "PDI",
};

const hex = (ch: string) => "U+" + ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");

export interface SegmentOptions {
  /** Also flag Cyrillic or Greek letters sitting inside words that contain Latin letters. */
  homoglyphs?: boolean;
}

export function segment(input: string, options: SegmentOptions = {}): Segment[] {
  const out: Segment[] = [];
  for (const ch of input) {
    const last = out[out.length - 1];
    if (ZERO_WIDTH.has(ch)) {
      if (last?.kind === "zwc") {
        last.count++;
        last.raw += ch;
        last.label = `${last.count} zero-width`;
      } else {
        out.push({ kind: "zwc", count: 1, label: "1 zero-width", raw: ch });
      }
    } else if (ch in BIDI_NAMES) {
      // Each override is its own segment: two in a row are two separate controls.
      out.push({ kind: "bidi", codepoint: hex(ch), label: `${hex(ch)} ${BIDI_NAMES[ch]}`, raw: ch });
    } else if (last?.kind === "text") {
      last.text += ch;
    } else {
      out.push({ kind: "text", text: ch });
    }
  }
  return options.homoglyphs ? out.flatMap(splitHomoglyphs) : out;
}

const LATIN = /[A-Za-zÀ-ɏ]/;
const lookalikeScript = (ch: string): string | null => {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x0400 && cp <= 0x04ff) return "Cyrillic";
  if (cp >= 0x0370 && cp <= 0x03ff) return "Greek";
  return null;
};

// Within a text segment, pull out Cyrillic/Greek letters that share a word with
// Latin letters. A word written entirely in one script is left alone.
function splitHomoglyphs(seg: Segment): Segment[] {
  if (seg.kind !== "text") return [seg];
  const out: Segment[] = [];
  const push = (text: string) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last?.kind === "text") last.text += text;
    else out.push({ kind: "text", text });
  };
  for (const part of seg.text.split(/([\p{L}\p{N}]+)/u)) {
    if (!LATIN.test(part)) {
      push(part);
      continue;
    }
    for (const ch of part) {
      const script = lookalikeScript(ch);
      if (script) out.push({ kind: "glyph", char: ch, label: `${script} ${hex(ch)}` });
      else push(ch);
    }
  }
  return out;
}

const ZERO = "​";
const ONE = "‌";

/**
 * Reverse of encodeZeroWidth. Returns null unless the run is only U+200B/U+200C,
 * its length is a multiple of 8, and every byte is printable ASCII.
 */
export function decodeZeroWidth(raw: string): string | null {
  if (raw.length === 0 || raw.length % 8 !== 0) return null;
  let out = "";
  for (let i = 0; i < raw.length; i += 8) {
    let byte = 0;
    for (const ch of raw.slice(i, i + 8)) {
      if (ch !== ZERO && ch !== ONE) return null;
      byte = (byte << 1) | (ch === ONE ? 1 : 0);
    }
    if (byte < 0x20 || byte > 0x7e) return null;
    out += String.fromCharCode(byte);
  }
  return out;
}

export interface Analysis {
  segments: Segment[];
  /** One plain-language sentence per hidden segment, in reading order. */
  findings: string[];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Segments plus a sentence for each finding; shared by the page render and the live sandbox. */
export function analyze(input: string): Analysis {
  const segments = segment(input, { homoglyphs: true });
  const findings: string[] = [];
  for (const s of segments) {
    if (s.kind === "zwc") {
      const message = decodeZeroWidth(s.raw);
      const base = plural(s.count, "zero-width character", "zero-width characters");
      findings.push(
        message === null
          ? `${base}. They don't decode to a plain ASCII message, but invisible characters rarely belong in text.`
          : `${base} spell "${message}" in binary.`,
      );
    } else if (s.kind === "bidi") {
      findings.push(
        s.codepoint === "U+202E"
          ? "A right-to-left override (U+202E) reverses how the text after it is drawn."
          : `A bidirectional control (${s.label}) changes the order text is drawn in.`,
      );
    } else if (s.kind === "glyph") {
      findings.push(`${s.label.split(" ")[0]} letter "${s.char}" (${s.label.split(" ")[1]}) inside a Latin word. It looks like a Latin letter but isn't one.`);
    }
  }
  return { segments, findings };
}

/** Encode ASCII text as zero-width characters, 8 bits per byte: U+200B is 0, U+200C is 1. */
export function encodeZeroWidth(message: string): string {
  let out = "";
  for (const ch of message) {
    const code = ch.charCodeAt(0);
    if (code > 0x7f) throw new Error(`encodeZeroWidth only takes ASCII, got ${JSON.stringify(ch)}`);
    for (const bit of code.toString(2).padStart(8, "0")) out += bit === "0" ? "​" : "‌";
  }
  return out;
}
