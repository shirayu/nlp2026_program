#!/usr/bin/env python3
"""JSON のキー順を安定化して書き出す。"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="JSON を安定化して保存する")
    parser.add_argument("--in", dest="input_path", required=True, help="入力 JSON ファイル")
    parser.add_argument("--out", dest="output_path", help="出力 JSON ファイル（未指定時は上書き）")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_path = Path(args.input_path)
    output_path = Path(args.output_path) if args.output_path else input_path

    data = json.loads(input_path.read_text(encoding="utf-8"))
    stabilized = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=True)
    output_path.write_text(f"{stabilized}\n", encoding="utf-8")


if __name__ == "__main__":
    main()
