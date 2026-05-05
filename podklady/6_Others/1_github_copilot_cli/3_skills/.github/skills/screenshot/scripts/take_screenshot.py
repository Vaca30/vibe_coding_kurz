#!/usr/bin/env python3
"""Cross-platform screenshot helper for the screenshot skill.

Usage:
  take_screenshot.py [--path PATH | --mode {default,temp}] [--region X,Y,W,H] [--active-window]

Prints the saved file path(s) — one per line — on success.
"""

from __future__ import annotations

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path


def default_save_path() -> Path:
    home = Path.home()
    if platform.system() == "Darwin":
        return home / "Desktop" / f"screenshot-{timestamp()}.png"
    pictures = home / "Pictures"
    if pictures.is_dir():
        return pictures / f"screenshot-{timestamp()}.png"
    return home / f"screenshot-{timestamp()}.png"


def temp_save_path() -> Path:
    return Path(tempfile.gettempdir()) / f"screenshot-{timestamp()}.png"


def timestamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def resolve_output(args: argparse.Namespace) -> Path:
    if args.path:
        return Path(args.path).expanduser().resolve()
    if args.mode == "temp":
        return temp_save_path()
    return default_save_path()


def capture_macos(out: Path, region: str | None, active_window: bool) -> list[Path]:
    cmd = ["screencapture", "-x"]
    if region:
        cmd.extend(["-R", region])
    elif active_window:
        cmd.append("-W")
    cmd.append(str(out))
    subprocess.run(cmd, check=True)
    return [out]


def capture_linux(out: Path, region: str | None, active_window: bool) -> list[Path]:
    if shutil.which("scrot"):
        cmd = ["scrot"]
        if region:
            cmd.extend(["-a", region])
        elif active_window:
            cmd.append("-u")
        cmd.append(str(out))
    elif shutil.which("gnome-screenshot"):
        cmd = ["gnome-screenshot", "-f", str(out)]
        if active_window:
            cmd.insert(1, "-w")
    elif shutil.which("import"):
        cmd = ["import"]
        if region:
            x, y, w, h = region.split(",")
            cmd.extend(["-window", "root", "-crop", f"{w}x{h}+{x}+{y}"])
        else:
            cmd.extend(["-window", "root"])
        cmd.append(str(out))
    else:
        raise RuntimeError(
            "No screenshot tool found. Install scrot, gnome-screenshot, or imagemagick."
        )
    subprocess.run(cmd, check=True)
    return [out]


def capture_windows(out: Path, region: str | None, active_window: bool) -> list[Path]:
    ps = (
        "Add-Type -AssemblyName System.Windows.Forms;"
        "$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds;"
        "$bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height);"
        "$g=[System.Drawing.Graphics]::FromImage($bmp);"
        f"$g.CopyFromScreen(0,0,0,0,$bmp.Size);"
        f"$bmp.Save('{out}');"
    )
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
    return [out]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--path")
    parser.add_argument("--mode", choices=["default", "temp"], default="default")
    parser.add_argument("--region", help="x,y,w,h pixel region")
    parser.add_argument("--active-window", action="store_true")
    args = parser.parse_args()

    out = resolve_output(args)
    out.parent.mkdir(parents=True, exist_ok=True)

    system = platform.system()
    if system == "Darwin":
        paths = capture_macos(out, args.region, args.active_window)
    elif system == "Linux":
        paths = capture_linux(out, args.region, args.active_window)
    elif system == "Windows":
        paths = capture_windows(out, args.region, args.active_window)
    else:
        print(f"Unsupported OS: {system}", file=sys.stderr)
        return 1

    for p in paths:
        print(p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
