#!/usr/bin/env python3
"""只清理本自动任务生成的旧构建，保留十四个及当前、上一个版本。"""
from pathlib import Path
import shutil
import sys


def prune(site, previous):
    releases = (site / "releases").resolve()
    protected = {(site / "current").resolve(), previous.resolve()}
    generated = sorted(releases.glob("auto-data-*"), reverse=True)
    for candidate in generated[14:]:
        resolved = candidate.resolve()
        if candidate.is_symlink() or not candidate.is_dir() or resolved.parent != releases or resolved in protected:
            continue
        shutil.rmtree(candidate)
        print(f"PRUNED {candidate.name}")


if __name__ == "__main__":
    prune(Path(sys.argv[1]), Path(sys.argv[2]))
