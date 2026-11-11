"""Buat ikon PNG aplikasi (PWA) tanpa library tambahan.

Jalankan: python scripts/make_icons.py
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "icons"

BRAND = (0x43, 0x51, 0xA8)
WHITE = (255, 255, 255)
PINK = (0xF5, 0x67, 0x8D)


def png(size: int, pixels: list[list[tuple[int, int, int]]]) -> bytes:
    raw = b"".join(b"\x00" + bytes(c for px in row for c in px) for row in pixels)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def draw(size: int) -> bytes:
    s = size / 64  # desain asli 64×64 (lihat favicon.svg), ikon penuh (maskable)
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            x, y = (px + 0.5) / s, (py + 0.5) / s
            c = BRAND
            if 10 <= x <= 54 and abs(y - 40) <= 2:
                c = WHITE
            if 22 <= x <= 26 and 10 <= y <= 54:
                c = WHITE
            if (x - 42) ** 2 + (y - 22) ** 2 <= 49:
                c = PINK
            row.append(c)
        rows.append(row)
    return png(size, rows)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
        (OUT / name).write_bytes(draw(size))
        print("ditulis", OUT / name)


if __name__ == "__main__":
    main()
