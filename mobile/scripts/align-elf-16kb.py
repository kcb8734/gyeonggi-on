#!/usr/bin/env python3
"""Rewrite ELF PT_LOAD p_align to 16KB for Google Play page-size checks."""
from __future__ import annotations

import os
import struct
import sys

PAGE = 16384
PT_LOAD = 1


class ElfError(RuntimeError):
    pass


def align_elf(buf: bytearray) -> bool:
    if buf[:4] != b"\x7fELF":
        raise ElfError("not ELF")
    ei_class = buf[4]
    ei_data = buf[5]
    if ei_data != 1:
        raise ElfError("only little-endian ELF is supported")
    is64 = ei_class == 2
    if ei_class not in (1, 2):
        raise ElfError("unknown ELF class")

    endian = "<"
    if is64:
        e_phoff = struct.unpack_from("<Q", buf, 32)[0]
        e_shoff = struct.unpack_from("<Q", buf, 40)[0]
        e_phentsize, e_phnum = struct.unpack_from("<HH", buf, 54)
        e_shentsize, e_shnum = struct.unpack_from("<HH", buf, 58)
        ph_off_field = 8
        ph_align_field = 48
        ph_off_fmt = "<Q"
        sh_off_field = 24
        sh_off_fmt = "<Q"
        e_phoff_off, e_shoff_off = 32, 40
        e_off_fmt = "<Q"
    else:
        e_phoff = struct.unpack_from("<I", buf, 28)[0]
        e_shoff = struct.unpack_from("<I", buf, 32)[0]
        e_phentsize, e_phnum = struct.unpack_from("<HH", buf, 42)
        e_shentsize, e_shnum = struct.unpack_from("<HH", buf, 46)
        ph_off_field = 4
        ph_align_field = 28
        ph_off_fmt = "<I"
        sh_off_field = 16
        sh_off_fmt = "<I"
        e_phoff_off, e_shoff_off = 28, 32
        e_off_fmt = "<I"

    def read_ph():
        rows = []
        for i in range(e_phnum):
            off = e_phoff + i * e_phentsize
            p_type = struct.unpack_from("<I", buf, off)[0]
            p_offset = struct.unpack_from(ph_off_fmt, buf, off + ph_off_field)[0]
            if is64:
                p_vaddr = struct.unpack_from("<Q", buf, off + 16)[0]
                p_align = struct.unpack_from("<Q", buf, off + ph_align_field)[0]
            else:
                p_vaddr = struct.unpack_from("<I", buf, off + 8)[0]
                p_align = struct.unpack_from("<I", buf, off + ph_align_field)[0]
            rows.append({
                "index": i,
                "hdr_off": off,
                "type": p_type,
                "offset": p_offset,
                "vaddr": p_vaddr,
                "align": p_align,
            })
        return rows

    def shift(threshold: int, delta: int) -> None:
        nonlocal e_phoff, e_shoff
        if e_phoff >= threshold:
            e_phoff += delta
            struct.pack_into(e_off_fmt, buf, e_phoff_off, e_phoff)
        if e_shoff >= threshold:
            e_shoff += delta
            struct.pack_into(e_off_fmt, buf, e_shoff_off, e_shoff)
        for i in range(e_phnum):
            off = e_phoff + i * e_phentsize
            cur = struct.unpack_from(ph_off_fmt, buf, off + ph_off_field)[0]
            if cur >= threshold:
                struct.pack_into(ph_off_fmt, buf, off + ph_off_field, cur + delta)
        if e_shoff and e_shnum and e_shentsize:
            for i in range(e_shnum):
                off = e_shoff + i * e_shentsize
                if off + sh_off_field + struct.calcsize(sh_off_fmt) > len(buf):
                    continue
                cur = struct.unpack_from(sh_off_fmt, buf, off + sh_off_field)[0]
                if cur >= threshold:
                    struct.pack_into(sh_off_fmt, buf, off + sh_off_field, cur + delta)

    changed = False
    for _ in range(32):
        phdrs = read_ph()
        pending = None
        for ph in sorted((p for p in phdrs if p["type"] == PT_LOAD), key=lambda row: row["offset"]):
            pad = (ph["vaddr"] % PAGE - ph["offset"] % PAGE) % PAGE
            if pad:
                pending = (ph["offset"], pad)
                break
        if not pending:
            break
        insert_at, pad = pending
        buf[insert_at:insert_at] = b"\x00" * pad
        shift(insert_at, pad)
        changed = True
    else:
        raise ElfError("could not converge on 16KB LOAD alignment")

    phdrs = read_ph()
    for ph in phdrs:
        if ph["type"] != PT_LOAD:
            continue
        if (ph["offset"] % PAGE) != (ph["vaddr"] % PAGE):
            raise ElfError(
                f"LOAD congruence failed offset={ph['offset']:#x} vaddr={ph['vaddr']:#x}"
            )
        if ph["align"] != PAGE:
            struct.pack_into(ph_off_fmt, buf, ph["hdr_off"] + ph_align_field, PAGE)
            changed = True
    return changed


def align_file(path: str) -> str:
    with open(path, "rb") as handle:
        raw = handle.read()
    if raw[:4] != b"\x7fELF":
        return "skip"
    buf = bytearray(raw)
    changed = align_elf(buf)
    if changed:
        with open(path, "wb") as handle:
            handle.write(buf)
        return "aligned"
    return "ok"


def walk(root: str) -> tuple[int, int, int]:
    aligned = ok = skipped = 0
    for dirpath, _, files in os.walk(root):
        for name in files:
            if not name.endswith(".so"):
                continue
            path = os.path.join(dirpath, name)
            status = align_file(path)
            if status == "aligned":
                aligned += 1
            elif status == "ok":
                ok += 1
            else:
                skipped += 1
            print(f"[16kb] {status:8} {path}")
    return aligned, ok, skipped


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: align-elf-16kb.py <file-or-dir> [...]", file=sys.stderr)
        return 2
    aligned = ok = skipped = 0
    for target in sys.argv[1:]:
        if os.path.isdir(target):
            a, o, s = walk(target)
            aligned += a
            ok += o
            skipped += s
        else:
            status = align_file(target)
            print(f"[16kb] {status:8} {target}")
            if status == "aligned":
                aligned += 1
            elif status == "ok":
                ok += 1
            else:
                skipped += 1
    print(f"[16kb] done aligned={aligned} already-ok={ok} skipped={skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
