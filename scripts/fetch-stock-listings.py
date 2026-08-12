"""Fetch bulk exchange listing metadata used by the static mystic tag build."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

import akshare as ak


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "var" / "stock-listings.json"


def normalize_date(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.strftime("%Y-%m-%d")
    text = str(value).strip().replace("/", "-")
    if not text or text.lower() in {"nan", "nat", "none"}:
        return None
    if len(text) == 8 and text.isdigit():
        return f"{text[:4]}-{text[4:6]}-{text[6:]}"
    return text[:10]


def add_rows(
    records: dict[str, dict[str, str | None]],
    frame: object,
    exchange: str,
    code_column: str,
    date_column: str,
    industry_column: str | None = None,
) -> None:
    for row in frame.to_dict("records"):
        code = str(row[code_column]).strip().zfill(6)
        industry = None
        if industry_column:
            raw_industry = str(row.get(industry_column, "")).strip()
            if raw_industry and raw_industry.lower() not in {"nan", "none"}:
                industry = raw_industry
        records[code] = {
            "exchange": exchange,
            "listingDate": normalize_date(row.get(date_column)),
            "industry": industry,
        }


def main() -> None:
    records: dict[str, dict[str, str | None]] = {}
    add_rows(records, ak.stock_info_sh_name_code(symbol="主板A股"), "SH", "证券代码", "上市日期")
    add_rows(records, ak.stock_info_sh_name_code(symbol="科创板"), "SH", "证券代码", "上市日期")
    add_rows(records, ak.stock_info_sz_name_code(symbol="A股列表"), "SZ", "A股代码", "A股上市日期", "所属行业")
    add_rows(records, ak.stock_info_bj_name_code(), "BJ", "证券代码", "上市日期", "所属行业")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(
            {
                "fetchedAt": datetime.now().astimezone().isoformat(),
                "source": "SSE/SZSE/BSE bulk listings via AkShare",
                "stocks": records,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"Fetched listing metadata for {len(records)} securities.")


if __name__ == "__main__":
    main()
