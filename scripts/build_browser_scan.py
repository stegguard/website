"""Stage immutable browser runtime assets and the website-owned detector snapshot."""
from pathlib import Path
from shutil import copyfile

root = Path(__file__).resolve().parents[1]
out = root / "public/scan-runtime"
out.mkdir(exist_ok=True)
for name in ("pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"):
    copyfile(root / "node_modules/pyodide" / name, out / name)
copyfile(root / "vendor/stegguard-browser.zip", out / "detector.zip")
