#!/usr/bin/env python3
"""离线验证完整标签池、运行时索引与全部事实分片属于同一快照。"""
import json
from pathlib import Path
import sys


def validate(root):
    data = root / "data"
    full = json.loads((data / "mystic-stocks.json").read_text())
    index = json.loads((data / "mystic-stock-index.json").read_text())
    codes = {stock["code"] for stock in full["stocks"]}
    assert full["stockCount"] == len(full["stocks"]) == len(codes) > 0
    assert index["sourceSchemaVersion"] == full["schemaVersion"]
    assert index["stockCount"] == len(index["stocks"]) == full["stockCount"]
    assert {stock["code"] for stock in index["stocks"]} == codes
    assert index["factsSnapshot"] == full["factsSnapshot"]
    facts = {}
    for shard_path in (data / "mystic-stock-facts").glob("*.json"):
        shard = json.loads(shard_path.read_text())
        assert shard["sourceSchemaVersion"] == full["schemaVersion"]
        assert shard["factsSnapshot"] == full["factsSnapshot"]
        assert not facts.keys() & shard["stocks"].keys()
        facts.update(shard["stocks"])
    assert facts.keys() == codes
    for stock in full["stocks"]:
        assert all(stock.get(key) == value for key, value in facts[stock["code"]].items())
    assert "玄鉴每日玄签" in (root / "index.html").read_text()
    market = json.loads((data / "market-snapshot.json").read_text())
    assert {item["code"] for item in market["indices"]} == {"000001", "399001", "399006"}
    print(f"VALID release stocks={len(codes)} schema={full['schemaVersion']} tradingDate={full['factsSnapshot']['tradingDate']}")


if __name__ == "__main__":
    validate(Path(sys.argv[1]))
