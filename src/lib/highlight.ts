// Tiny shell highlighter for the code panels. Knows four things: the "$ "
// prompt, the command word, --long-flags and a trailing line-continuation.
// Whitespace is preserved exactly so <pre> output lines up with the source.

export type Token = { cls: "" | "tk-com" | "tk-cmd" | "tk-flag"; text: string };

export function highlightShell(line: string): Token[] {
  const out: Token[] = [];
  let rest = line;
  if (rest.startsWith("$ ")) {
    out.push({ cls: "tk-com", text: "$ " });
    rest = rest.slice(2);
  }
  // A line that starts with whitespace is a continuation of the previous one,
  // so its first word is an argument, not the command.
  let seenCommand = /^\s/.test(rest);
  for (const part of rest.split(/(\s+)/)) {
    if (part === "") continue;
    let cls: Token["cls"] = "";
    if (/^\s+$/.test(part)) cls = "";
    else if (!seenCommand) {
      cls = "tk-cmd";
      seenCommand = true;
    } else if (part.startsWith("--")) cls = "tk-flag";
    else if (part === "\\") cls = "tk-com";
    const last = out[out.length - 1];
    if (last && last.cls === cls) last.text += part;
    else out.push({ cls, text: part });
  }
  return out;
}
