"""Buat ulang shared/model-fixtures/golden.json dari mesin Python.

Jalankan HANYA setelah mengubah teks langkah secara sengaja:
    python scripts/gen_golden.py
Lalu jalankan tes frontend agar mesin TypeScript disesuaikan.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services import modeling as eng  # noqa: E402

FIX = ROOT / "shared" / "model-fixtures"


def main() -> None:
    cases = json.loads((FIX / "cases.json").read_text(encoding="utf-8"))
    golden = {}
    for c in cases:
        if "error" in c:
            continue
        out = eng.solve(c["model"])
        golden[c["name"]] = {"steps": out["steps"], "describe": eng.describe(c["model"])}
    (FIX / "golden.json").write_text(json.dumps(golden, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"golden.json ditulis: {len(golden)} kasus")


if __name__ == "__main__":
    main()
