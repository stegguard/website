// Only fixed, same-origin assets are loaded. The Python function receives text as data.
self.onmessage = async ({ data: text }) => {
  try {
    if (typeof text !== "string" || text.length > 32768 || new TextEncoder().encode(text).length > 32768) {
      throw new Error("Invalid scan input");
    }
    importScripts("./scan-runtime/pyodide.js");
    const runtime = await loadPyodide({ indexURL: "./scan-runtime/" });
    const bundle = await fetch("./scan-runtime/detector.zip");
    if (!bundle.ok) throw new Error("Detector unavailable");
    runtime.unpackArchive(await bundle.arrayBuffer(), "zip");
    const scan = runtime.runPython(`
import json
from stegguard import analyze_text, ScanLimits

def scan(text):
    result = analyze_text(text, ScanLimits(max_file_bytes=32768, max_findings=100))
    findings = []
    for category in ("zero_width", "homoglyphs", "other_suspicious"):
        for item in result[category]:
            findings.append(f"Line {item.line}, column {item.col}: U+{ord(item.char):04X} ({category.replace('_', ' ')}).")
    for item in result["trailing_whitespace_lines"]:
        findings.append(f"Line {item.line}: {item.trailing_count} trailing whitespace characters.")
    if result["mixed_line_endings"]:
        findings.append("Mixed line endings.")
    return json.dumps(dict(complete=not result.get("error"), unsupported=bool(result.get("unsupported_reason")), findings=findings))

scan
`);
    self.postMessage(JSON.parse(scan(text)));
  } catch {
    self.postMessage({ failed: true });
  }
};
