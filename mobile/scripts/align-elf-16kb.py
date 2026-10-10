#!/usr/bin/env python3
"""Align ELF PT_LOAD and GNU_RELRO to 16KB for Google Play page-size checks."""
from __future__ import annotations

import os
import struct
import sys
import zipfile

PAGE = 16384
PT_LOAD = 1
PT_GNU_RELRO = 0x6474E552


class ElfError(RuntimeError):
    pass


def _phdr_layout(is64: bool):
    if is64:
        return {
            "ph_off_field": 8,
            "ph_vaddr_field": 16,
            "ph_filesz_field": 32,
            "ph_memsz_field": 40,
            "ph_align_field": 48,
            "ph_off_fmt": "<Q",
            "sh_off_field": 24,
            "sh_off_fmt": "<Q",
            "e_phoff_off": 32,
            "e_shoff_off": 40,
            "e_off_fmt": "<Q",
            "e_phoff_from": 32,
            "e_shoff_from": 40,
            "e_ph_from": 54,
            "e_sh_from": 58,
        }
    return {
        "ph_off_field": 4,
        "ph_vaddr_field": 8,
        "ph_filesz_field": 16,
        "ph_memsz_field": 20,
        "ph_align_field": 28,
        "ph_off_fmt": "<I",
        "sh_off_field": 16,
        "sh_off_fmt": "<I",
        "e_phoff_off": 28,
        "e_shoff_off": 32,
        "e_off_fmt": "<I",
        "e_phoff_from": 28,
        "e_shoff_from": 32,
        "e_ph_from": 42,
        "e_sh_from": 46,
    }


def _parse_header(buf: bytearray):
    if buf[:4] != b"\x7fELF":
        raise ElfError("not ELF")
    ei_class = buf[4]
    ei_data = buf[5]
    if ei_data != 1:
        raise ElfError("only little-endian ELF is supported")
    if ei_class not in (1, 2):
        raise ElfError("unknown ELF class")
    is64 = ei_class == 2
    layout = _phdr_layout(is64)
    e_phoff = struct.unpack_from(layout["e_off_fmt"], buf, layout["e_phoff_from"])[0]
    e_shoff = struct.unpack_from(layout["e_off_fmt"], buf, layout["e_shoff_from"])[0]
    e_phentsize, e_phnum = struct.unpack_from("<HH", buf, layout["e_ph_from"])
    e_shentsize, e_shnum = struct.unpack_from("<HH", buf, layout["e_sh_from"])
    return is64, layout, e_phoff, e_shoff, e_phentsize, e_phnum, e_shentsize, e_shnum


def _read_ph(buf, is64, layout, e_phoff, e_phentsize, e_phnum):
    rows = []
    for i in range(e_phnum):
        off = e_phoff + i * e_phentsize
        p_type = struct.unpack_from("<I", buf, off)[0]
        p_offset = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_off_field"])[0]
        p_vaddr = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_vaddr_field"])[0]
        p_filesz = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_filesz_field"])[0]
        p_memsz = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_memsz_field"])[0]
        p_align = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_align_field"])[0]
        rows.append({
            "index": i,
            "hdr_off": off,
            "type": p_type,
            "offset": p_offset,
            "vaddr": p_vaddr,
            "filesz": p_filesz,
            "memsz": p_memsz,
            "align": p_align,
        })
    return rows


def align_elf(buf: bytearray) -> bool:
    is64, layout, e_phoff, e_shoff, e_phentsize, e_phnum, e_shentsize, e_shnum = _parse_header(buf)

    def read_ph():
        return _read_ph(buf, is64, layout, e_phoff, e_phentsize, e_phnum)

    def shift(threshold: int, delta: int) -> None:
        nonlocal e_phoff, e_shoff
        if e_phoff >= threshold:
            e_phoff += delta
            struct.pack_into(layout["e_off_fmt"], buf, layout["e_phoff_off"], e_phoff)
        if e_shoff >= threshold:
            e_shoff += delta
            struct.pack_into(layout["e_off_fmt"], buf, layout["e_shoff_off"], e_shoff)
        for i in range(e_phnum):
            off = e_phoff + i * e_phentsize
            cur = struct.unpack_from(layout["ph_off_fmt"], buf, off + layout["ph_off_field"])[0]
            if cur >= threshold:
                struct.pack_into(layout["ph_off_fmt"], buf, off + layout["ph_off_field"], cur + delta)
        if e_shoff and e_shnum and e_shentsize:
            for i in range(e_shnum):
                off = e_shoff + i * e_shentsize
                if off + layout["sh_off_field"] + struct.calcsize(layout["sh_off_fmt"]) > len(buf):
                    continue
                cur = struct.unpack_from(layout["sh_off_fmt"], buf, off + layout["sh_off_field"])[0]
                if cur >= threshold:
                    struct.pack_into(layout["sh_off_fmt"], buf, off + layout["sh_off_field"], cur + delta)

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
            struct.pack_into(
                layout["ph_off_fmt"], buf, ph["hdr_off"] + layout["ph_align_field"], PAGE
            )
            changed = True

    phdrs = read_ph()
    for ph in phdrs:
        if ph["type"] != PT_GNU_RELRO:
            continue
        rem = (ph["vaddr"] + ph["memsz"]) % PAGE
        if rem == 0:
            continue
        new_end = ph["vaddr"] + ph["memsz"] - rem
        new_memsz = max(0, new_end - ph["vaddr"])
        struct.pack_into(
            layout["ph_off_fmt"], buf, ph["hdr_off"] + layout["ph_memsz_field"], new_memsz
        )
        if new_memsz == 0:
            # Google: no RELRO segment is trivially 16KB compliant.
            struct.pack_into("<I", buf, ph["hdr_off"], 0)
        changed = True
    return changed


def inspect_elf(data: bytes) -> dict:
    info = {
        "elf": data[:4] == b"\x7fELF",
        "is64": False,
        "load_ok": True,
        "relro_ok": True,
        "relro_present": False,
        "load_bad": 0,
        "relro_bad": 0,
        "issues": [],
    }
    if not info["elf"] or data[4] not in (1, 2) or data[5] != 1:
        info["load_ok"] = False
        info["issues"].append("not little-endian ELF")
        return info
    buf = bytearray(data)
    is64, layout, e_phoff, e_shoff, e_phentsize, e_phnum, *_ = _parse_header(buf)
    info["is64"] = is64
    for ph in _read_ph(buf, is64, layout, e_phoff, e_phentsize, e_phnum):
        if ph["type"] == PT_LOAD:
            if ph["align"] < PAGE or (ph["offset"] % PAGE) != (ph["vaddr"] % PAGE):
                info["load_ok"] = False
                info["load_bad"] += 1
                info["issues"].append(
                    f"LOAD align={ph['align']:#x} off={ph['offset']:#x} vaddr={ph['vaddr']:#x}"
                )
        elif ph["type"] == PT_GNU_RELRO:
            if ph["memsz"] == 0:
                continue
            info["relro_present"] = True
            if (ph["vaddr"] + ph["memsz"]) % PAGE:
                info["relro_ok"] = False
                info["relro_bad"] += 1
                info["issues"].append(
                    f"RELRO vaddr={ph['vaddr']:#x} memsz={ph['memsz']:#x} rem={(ph['vaddr'] + ph['memsz']) % PAGE:#x}"
                )
    return info


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


def _decode_varint(data: bytes, i: int) -> tuple[int, int]:
    value = shift = 0
    while True:
        byte = data[i]
        i += 1
        value |= (byte & 0x7F) << shift
        if byte < 0x80:
            return value, i
        shift += 7


def _iter_fields(data: bytes, base: int = 0):
    i = 0
    while i < len(data):
        start = i
        key, i = _decode_varint(data, i)
        field, wtype = key >> 3, key & 7
        if wtype == 0:
            val_at = i
            val, i = _decode_varint(data, i)
            yield field, wtype, base + start, base + i, val, b"", val_at + base
        elif wtype == 2:
            ln, i = _decode_varint(data, i)
            blob_at = i
            blob = data[i : i + ln]
            i += ln
            yield field, wtype, base + start, base + i, ln, blob, blob_at + base
        elif wtype == 1:
            i += 8
            yield field, wtype, base + start, base + i, 0, data[start:i], base + start
        elif wtype == 5:
            i += 4
            yield field, wtype, base + start, base + i, 0, data[start:i], base + start
        else:
            break


def disable_uncompress_native_libs(data: bytes) -> tuple[bytes, bool]:
    """Set BundleConfig.optimizations.uncompress_native_libraries.enabled = false."""
    buf = bytearray(data)
    for field, wtype, _s, _e, _ln, blob, blob_at in _iter_fields(data):
        if field != 2 or wtype != 2:
            continue
        for ifield, iwtype, _is, _ie, _iln, iblob, iblob_at in _iter_fields(blob, blob_at):
            if ifield != 2 or iwtype != 2:
                continue
            for nfield, nwtype, nstart, nend, nval, _nb, _nat in _iter_fields(iblob, iblob_at):
                if nfield != 1 or nwtype != 0 or nval == 0:
                    continue
                if nend - nstart >= 2 and buf[nstart] == 0x08:
                    buf[nstart + 1] = 0
                    return bytes(buf), True
            return data, False
        return data, False
    return data, False


def uncompress_native_libs_enabled(data: bytes) -> bool | None:
    for field, wtype, _s, _e, _ln, blob, _ba in _iter_fields(data):
        if field != 2 or wtype != 2:
            continue
        for ifield, iwtype, _is, _ie, _iln, iblob, _iba in _iter_fields(blob):
            if ifield != 2 or iwtype != 2:
                continue
            found = False
            enabled = False
            for nfield, nwtype, _ns, _ne, nval, _nb, _nat in _iter_fields(iblob):
                if nfield == 1 and nwtype == 0:
                    found = True
                    enabled = bool(nval)
            return enabled if found else False
        return False
    return None


def align_aab(aab_path: str) -> tuple[int, int]:
    tmp_path = f"{aab_path}.16kb-tmp"
    aligned = ok = 0
    with zipfile.ZipFile(aab_path, "r") as src, zipfile.ZipFile(tmp_path, "w") as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename == "BundleConfig.pb":
                data, cfg_changed = disable_uncompress_native_libs(data)
                if cfg_changed:
                    print("[16kb] BundleConfig.pb uncompress_native_libraries=false")
            elif info.filename.endswith(".so") and data[:4] == b"\x7fELF":
                buf = bytearray(data)
                if align_elf(buf):
                    data = bytes(buf)
                    aligned += 1
                    print(f"[16kb] aligned  {info.filename}")
                else:
                    ok += 1
            item = zipfile.ZipInfo(info.filename, info.date_time)
            item.compress_type = info.compress_type
            item.external_attr = info.external_attr
            item.create_system = info.create_system
            dst.writestr(item, data)
    os.replace(tmp_path, aab_path)
    print(f"[16kb] aab rewritten aligned={aligned} already-ok={ok} path={aab_path}")
    return aligned, ok


def check_aab(aab_path: str) -> int:
    load_bad = relro_bad = count = uncompressed_unaligned = 0
    with zipfile.ZipFile(aab_path) as bundle:
        try:
            cfg = bundle.read("BundleConfig.pb")
            enabled = uncompress_native_libs_enabled(cfg)
            print(f"uncompress_native_libraries={enabled}")
            if enabled:
                print("FAIL BundleConfig still requests uncompressed native libraries", file=sys.stderr)
                return 1
        except KeyError:
            print("WARN BundleConfig.pb missing", file=sys.stderr)
        for info in bundle.infolist():
            name = info.filename
            if not name.endswith(".so"):
                continue
            abi64 = ("arm64-v8a" in name) or ("x86_64" in name)
            if not abi64:
                continue
            data = bundle.read(name)
            if data[:4] != b"\x7fELF" or data[4] != 2:
                continue
            count += 1
            if info.compress_type == zipfile.ZIP_STORED and (info.header_offset % PAGE):
                uncompressed_unaligned += 1
                print(f"FAIL zip {name} header_offset={info.header_offset:#x}", file=sys.stderr)
            result = inspect_elf(data)
            if not result["load_ok"]:
                load_bad += 1
                print("FAIL LOAD", name, *result["issues"], file=sys.stderr)
            if not result["relro_ok"]:
                relro_bad += 1
                print("FAIL RELRO", name, *result["issues"], file=sys.stderr)
    print(
        f"64bit-so={count} load_bad={load_bad} relro_bad={relro_bad} "
        f"uncompressed_zip_unaligned={uncompressed_unaligned}"
    )
    return 1 if load_bad or relro_bad or uncompressed_unaligned or count == 0 else 0


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
        print("usage: align-elf-16kb.py [--aab|--check] <file-or-dir> [...]", file=sys.stderr)
        return 2
    args = sys.argv[1:]
    mode = "align"
    if args and args[0] in ("--aab", "--check"):
        mode = args[0][2:]
        args = args[1:]
    if mode in ("aab", "check"):
        if not args:
            print(f"usage: align-elf-16kb.py --{mode} <bundle.aab>", file=sys.stderr)
            return 2
        status = 0
        for target in args:
            if mode == "aab":
                align_aab(target)
            status = max(status, check_aab(target) if mode == "check" else 0)
        return status
    aligned = ok = skipped = 0
    for target in args:
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
