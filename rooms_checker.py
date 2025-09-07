from __future__ import annotations
"""
Charlotte — Rooms Checker & Import-Map Patcher
Usage (run from repo root):
  python rooms_checker.py --root .
- Ensures .nojekyll exists
- Injects import map + es-module-shims into HTML files missing it
- Reports files changed
"""
import os, argparse, re, pathlib, sys

IM_SNIPPET = """<!-- Polyfill for older Safari/iPadOS so import maps work -->
<script async src="https://cdn.jsdelivr.net/npm/es-module-shims@1.10.0/dist/es-module-shims.min.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.152.2/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.152.2/examples/jsm/",
    "@pixiv/three-vrm": "https://unpkg.com/@pixiv/three-vrm@2.0.3/lib/three-vrm.module.js"
  }
}
</script>
"""

def has_importmap(html: str) -> bool:
    return ("type=\"importmap\"" in html) or ("@pixiv/three-vrm" in html) or ("three/addons/" in html)

def patch_file(path: pathlib.Path) -> bool:
    txt = path.read_text(encoding="utf-8", errors="ignore")
    if has_importmap(txt):
        return False
    # insert after <head>
    new = re.sub(r"<head([^>]*)>", lambda m: m.group(0) + "\n" + IM_SNIPPET, txt, count=1, flags=re.IGNORECASE)
    if new == txt:
        return False
    path.write_text(new, encoding="utf-8")
    return True

def ensure_nojekyll(root: pathlib.Path):
    f = root / ".nojekyll"
    if not f.exists():
        f.write_text("", encoding="utf-8")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".", help="Repo root")
    args = ap.parse_args()
    root = pathlib.Path(args.root).resolve()
    ensure_nojekyll(root)
    changed = []
    for p in root.rglob("*.html"):
        try:
            if patch_file(p):
                changed.append(str(p.relative_to(root)))
        except Exception as e:
            print("Skip", p, e)
    print("✅ .nojekyll ensured at repo root")
    if changed:
        print("✅ Import map injected into:")
        for c in changed:
            print(" -", c)
    else:
        print("ℹ️  All HTML files already had import maps.")

if __name__ == "__main__":
    main()
