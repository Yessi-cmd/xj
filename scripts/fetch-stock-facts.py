#!/usr/bin/env python3
"""抓取 A 股基本面快照（玄鉴数据管线，在 VPS 上运行）。

数据源：
- 腾讯行情批量接口：最新价、涨跌幅、市盈率、总市值、流通市值
- 腾讯 5 日 K 线：5 日涨跌幅
- 东方财富 F10 公司概况：主营业务简介、经营范围、证监会行业、员工数
- 东方财富 F10 主营构成：最近报告期主营收入与构成项

用法：python3 fetch-stock-facts.py [universe.json 路径] [limit]
输出：/tmp/stock-facts.json，中途断点保存在 /tmp/stock-facts-partial.json
"""

import concurrent.futures
import gzip
import json
import sys
import time
import urllib.request

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Encoding": "gzip"}

UNIVERSE_PATH = sys.argv[1] if len(sys.argv) > 1 else "/var/www/xj.norliva.top/current/data/mystic-stocks.json"
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 0
PARTIAL_PATH = "/tmp/stock-facts-partial.json"
OUTPUT_PATH = "/tmp/stock-facts.json"
BATCH = 70
WORKERS = 16
QUOTE_FIELDS = {
    "price": 3, "prevClose": 4, "time": 30, "change": 31, "changePct": 32,
    "pe": 39, "floatCap": 44, "marketCap": 45,
}


def http_get(url, timeout=15, decode="utf-8", raw=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
        if raw:
            return data
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        return data.decode(decode, errors="replace")


def number(value):
    try:
        parsed = float(value)
        return parsed if parsed == parsed else None
    except (TypeError, ValueError):
        return None


def tencent_code(stock):
    return {"SH": "sh", "SZ": "sz", "BJ": "bj"}[stock["exchange"]] + stock["code"]


def fetch_quotes(stocks):
    quotes = {}
    codes = [tencent_code(stock) for stock in stocks]
    for start in range(0, len(codes), BATCH):
        chunk = codes[start:start + BATCH]
        url = "https://qt.gtimg.cn/q=" + ",".join(chunk)
        text = http_get(url, decode="gbk")
        for line in text.split(";"):
            line = line.strip()
            if "=" not in line or '="' not in line:
                continue
            key, _, payload = line.partition("=")
            prefix = key.strip().lstrip("v_")
            payload = payload.strip().strip('"')
            fields = payload.split("~")
            if len(fields) < 46:
                continue
            code = prefix[2:] if prefix[:2] in ("sh", "sz", "bj") else ""
            quotes[code] = {
                "name": fields[1],
                "price": number(fields[QUOTE_FIELDS["price"]]),
                "prevClose": number(fields[QUOTE_FIELDS["prevClose"]]),
                "changePct": number(fields[QUOTE_FIELDS["changePct"]]),
                "pe": number(fields[QUOTE_FIELDS["pe"]]),
                "marketCap": number(fields[QUOTE_FIELDS["marketCap"]]),
                "floatCap": number(fields[QUOTE_FIELDS["floatCap"]]),
                "quoteTime": fields[QUOTE_FIELDS["time"]],
            }
        time.sleep(0.15)
    return quotes


def fetch_change5(prefix):
    url = f"https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={prefix},day,,,6,qfq"
    try:
        data = json.loads(http_get(url, timeout=12))
        node = data.get("data", {}).get(prefix, {})
        rows = node.get("qfqday") or node.get("day") or []
        if len(rows) >= 2:
            first_close = number(rows[0][2])
            last_close = number(rows[-1][2])
            if first_close:
                return round((last_close - first_close) / first_close * 100, 2)
    except Exception:
        pass
    return None


def fetch_profile(prefix):
    """返回 (业务简介, 经营范围, 行业, 员工数) 或 None。"""
    url = f"https://emweb.securities.eastmoney.com/PC_HSF10/CompanySurvey/PageAjax?code={prefix.upper()}"
    try:
        data = json.loads(http_get(url, timeout=15))
        rows = data.get("jbzl") or []
        if not rows:
            return None
        row = rows[0]
        return {
            "businessProfile": row.get("ORG_PROFILE") or None,
            "businessScope": row.get("BUSINESS_SCOPE") or None,
            "industryCsrc": row.get("INDUSTRYCSRC1") or None,
            "employeeCount": row.get("EMP_NUM") or None,
            "chairman": row.get("CHAIRMAN") or None,
        }
    except Exception:
        return None


def fetch_revenue(prefix):
    """返回 (报告期, 主营构成项, 主营收入) 或 None。"""
    url = f"https://emweb.securities.eastmoney.com/PC_HSF10/BusinessAnalysis/PageAjax?code={prefix.upper()}"
    try:
        data = json.loads(http_get(url, timeout=15))
        rows = data.get("zygcfx") or []
        if not rows:
            return None
        latest_date = max((row.get("REPORT_DATE") or "") for row in rows)
        latest = [row for row in rows if row.get("REPORT_DATE") == latest_date]
        ranked = sorted(latest, key=lambda row: number(row.get("RANK")) or 999)
        top = ranked[0] if ranked else latest[0]
        return {
            "revenue": number(top.get("MAIN_BUSINESS_INCOME")),
            "revenueItem": top.get("ITEM_NAME") or None,
            "revenueReportDate": latest_date or None,
        }
    except Exception:
        return None


def fetch_one(prefix):
    profile = None
    revenue = None
    change5 = fetch_change5(prefix)
    for attempt in range(3):
        try:
            if profile is None:
                profile = fetch_profile(prefix)
            if revenue is None:
                revenue = fetch_revenue(prefix)
            break
        except Exception:
            time.sleep(0.6)
    return {"profile": profile, "revenue": revenue, "change5": change5}


def main():
    with open(UNIVERSE_PATH, encoding="utf-8") as handle:
        universe = json.load(handle)
    stocks = universe.get("stocks", [])
    if LIMIT:
        stocks = stocks[:LIMIT]
    print(f"universe: {len(stocks)} stocks", flush=True)

    partial = {}
    try:
        with open(PARTIAL_PATH, encoding="utf-8") as handle:
            partial = json.load(handle).get("stocks", {})
    except Exception:
        pass
    print(f"resume: {len(partial)} stocks already done", flush=True)

    quotes = fetch_quotes(stocks)
    print(f"quotes: {len(quotes)} fetched", flush=True)

    todo = [stock for stock in stocks if stock["code"] not in partial]
    done = 0
    errors = 0
    start = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(fetch_one, tencent_code(stock)): stock for stock in todo}
        for future in concurrent.futures.as_completed(futures):
            stock = futures[future]
            try:
                result = future.result()
            except Exception:
                result = {"profile": None, "revenue": None, "change5": None}
                errors += 1
            partial[stock["code"]] = result
            done += 1
            if done % 100 == 0:
                elapsed = time.time() - start
                print(f"progress: {done}/{len(todo)} errors={errors} elapsed={elapsed:.0f}s", flush=True)
                with open(PARTIAL_PATH, "w", encoding="utf-8") as handle:
                    json.dump({"stocks": partial}, handle, ensure_ascii=False)

    with open(PARTIAL_PATH, "w", encoding="utf-8") as handle:
        json.dump({"stocks": partial}, handle, ensure_ascii=False)

    quote_time = max((item.get("quoteTime") or "") for item in quotes.values() if item.get("quoteTime")) or ""
    output = {
        "schemaVersion": 1,
        "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%S+08:00"),
        "tradingDate": quote_time[:8] if len(quote_time) >= 8 else "",
        "quotes": quotes,
        "profiles": partial,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False)
    print(f"DONE quotes={len(quotes)} profiles={len(partial)} errors={errors}", flush=True)


if __name__ == "__main__":
    main()
