import { readFileSync } from "node:fs";
import { join } from "node:path";

// Docs live in the sibling stegguard-oss package; Astro runs from the project root.
const DOCS_DIR = join(process.cwd(), "..", "stegguard-oss", "docs");

/** Read a markdown file from ../stegguard-oss/docs, failing the build with a clear error. */
export function readDoc(name: string): string {
  const path = join(DOCS_DIR, name);
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    throw new Error(
      `Docs source missing: could not read ${path}. ` +
        `The site derives its tables from ../stegguard-oss/docs. (${(err as Error).message})`,
    );
  }
}

const stripCode = (cell: string) => cell.trim().replace(/`/g, "");
const splitRow = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(stripCode);

/** Rows of the first table after `heading`, as objects keyed by header text. Backticks stripped. */
export function parseMarkdownTable(md: string, heading: string): Record<string, string>[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => /^#{1,6}\s/.test(l) && l.replace(/^#+\s*/, "").trim() === heading);
  if (start === -1) throw new Error(`Heading not found in markdown: "${heading}"`);

  let i = start + 1;
  while (i < lines.length && !lines[i].trim().startsWith("|")) {
    if (/^#{1,6}\s/.test(lines[i])) throw new Error(`No table under heading: "${heading}"`);
    i++;
  }
  if (i >= lines.length) throw new Error(`No table under heading: "${heading}"`);

  const headers = splitRow(lines[i]);
  const rows: Record<string, string>[] = [];
  for (i += 2; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const cells = splitRow(lines[i]);
    rows.push(Object.fromEntries(headers.map((h, j) => [h, cells[j] ?? ""])));
  }
  if (!rows.length) throw new Error(`Empty table under heading: "${heading}"`);
  return rows;
}

/** Body of the first fenced code block with the given language tag. */
export function extractCodeBlock(md: string, lang: string): string {
  const m = md.match(new RegExp("```" + lang + "\\n([\\s\\S]*?)\\n```"));
  if (!m) throw new Error(`No \`\`\`${lang} code block found in markdown`);
  return m[1];
}
