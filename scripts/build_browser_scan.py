"""Stage immutable browser runtime assets and the detector from the docs checkout."""
import os
from pathlib import Path
from shutil import copyfile
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
package = Path(os.environ.get("STEGGUARD_DOCS_DIR", root.parent / "stegguard-oss/docs")).resolve().parent
out = root / "public/scan-runtime"
out.mkdir(exist_ok=True)
for name in ("pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "pyodide-lock.json", "python_stdlib.zip"):
    copyfile(root / "node_modules/pyodide" / name, out / name)
with ZipFile(out / "detector.zip", "w", ZIP_DEFLATED) as bundle:
    for pattern in ("*.py", "data/*.txt"):
        for path in sorted((package / "stegguard").glob(pattern)):
            bundle.write(path, path.relative_to(package))
    bundle.write(package / "LICENSE", "StegGuard-LICENSE")
