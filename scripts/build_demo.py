"""Regenerate the /demo page data from the sample files.

Copies a curated set of samples into a temp folder, runs the real StegGuard
CLI over them with relative paths (so no local paths end up in the output),
and writes:

    public/demo/report.html   the HTML report, served as-is
    src/data/demo.json        numbers the /demo page renders at build time

Run from the site root:

    python3 scripts/build_demo.py [--samples DIR] [--stegguard DIR]
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tempfile
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent

# Only files published in github.com/stegguard/samples, so readers can rerun
# the scan. Left out on purpose: evil_hello.py and its copy hit the 10,000-finding limit
# and end the run as incomplete, and llm_data/ is 30-byte stubs whose media
# extensions trip structural checks without containing anything.
SAMPLES = [
    "release_notes.md",
    "calculator_2.py",
    "nothing_hidden.py",
    "sample.snowed_2.txt",
    "hello.py",
    "calculator.py",
    "example.txt",
]
WALKTHROUGH = "release_notes.md"
HIDDEN = ("\u200b", "\u200c", "\u200d")


def run(stegguard: Path, cwd: Path, *args: str, ok=(0,)) -> str:
    proc = subprocess.run(
        ["uv", "run", "--project", str(stegguard), "stegguard", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if proc.returncode not in ok:
        raise SystemExit(f"stegguard {' '.join(args)} exited {proc.returncode}:\n{proc.stderr}")
    return proc.stdout


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--samples", type=Path, default=SITE.parent.parent / "stegno_samples")
    parser.add_argument("--stegguard", type=Path, default=SITE.parent / "stegguard-oss")
    args = parser.parse_args()
    stegguard = args.stegguard.resolve()

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        (work / "samples").mkdir()
        for name in SAMPLES:
            shutil.copy2(args.samples / name, work / "samples" / name)

        # detect exits 1 when it flags something, which it should here.
        run(stegguard, work, "detect", "samples", "-r", "--html", "report.html", "--json", "findings.json", ok=(1,))
        findings = json.loads((work / "findings.json").read_text(encoding="utf-8"))
        detect_out = run(stegguard, work, "detect", f"samples/{WALKTHROUGH}", ok=(1,))
        decoded = json.loads(run(stegguard, work, "decode", f"samples/{WALKTHROUGH}"))
        lines = (work / "samples" / WALKTHROUGH).read_text(encoding="utf-8").splitlines()
        line_no, line = next((i, ln) for i, ln in enumerate(lines, 1) if any(c in ln for c in HIDDEN))
        sanitized = json.loads(run(stegguard, work, "sanitize", f"samples/{WALKTHROUGH}"))

        out_report = SITE / "public" / "demo" / "report.html"
        out_report.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(work / "report.html", out_report)

    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "clean": 4}
    files = sorted(
        (
            {
                "file": r["file"].removeprefix("samples/"),
                "severity": r["severity"],
                "hidden": r["total_hidden"],
                "trailing_lines": len(r["trailing_whitespace_lines"]),
            }
            for r in findings["results"]
        ),
        key=lambda f: (severity_rank[f["severity"]], f["file"]),
    )
    data = {
        "generated": date.today().isoformat(),
        "stegguard_version": findings["stegguard_version"],
        "total_files": findings["total_files"],
        "flagged_files": findings["flagged_files"],
        "files": files,
        "walkthrough": {
            "file": WALKTHROUGH,
            "line_number": line_no,
            "line": line,
            # Summary lines of the human-readable detect output, verbatim.
            "detect_lines": [
                ln.strip()
                for ln in detect_out.splitlines()
                if re.match(r"• \d", ln.strip()) or "file(s) flagged" in ln
            ],
            "decoded": decoded["zero_width"]["decoded"],
            "confidence": decoded["zero_width"]["confidence"],
            "occurrences": decoded["zero_width"]["occurrences"],
            "changes": sanitized["changes"],
            "original_preserved": sanitized["original_preserved"],
            "sanitized_path": sanitized["sanitized_path"].removeprefix("samples/"),
        },
    }
    out_data = SITE / "src" / "data" / "demo.json"
    out_data.parent.mkdir(parents=True, exist_ok=True)
    out_data.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out_report.relative_to(SITE)} and {out_data.relative_to(SITE)}")


if __name__ == "__main__":
    main()
