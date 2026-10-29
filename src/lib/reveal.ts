// Splits a string into visible text and hidden-character runs for the hero
// specimen. Runs of the same hidden kind collapse into one segment so 16
// zero-width characters render as a single "16 zero-width" chip.

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "zwc"; count: number; label: string }
  | { kind: "bidi"; codepoint: string; label: string };

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

export function segment(input: string): Segment[] {
  const out: Segment[] = [];
  for (const ch of input) {
    const last = out[out.length - 1];
    if (ZERO_WIDTH.has(ch)) {
      if (last?.kind === "zwc") {
        last.count++;
        last.label = `${last.count} zero-width`;
      } else {
        out.push({ kind: "zwc", count: 1, label: "1 zero-width" });
      }
    } else if (ch in BIDI_NAMES) {
      // Each override is its own segment: two in a row are two separate controls.
      out.push({ kind: "bidi", codepoint: hex(ch), label: `${hex(ch)} ${BIDI_NAMES[ch]}` });
    } else if (last?.kind === "text") {
      last.text += ch;
    } else {
      out.push({ kind: "text", text: ch });
    }
  }
  return out;
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
