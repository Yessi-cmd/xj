#!/usr/bin/env python3
"""低流量静态数据更新。仅写入新 release，不改当前线上目录。"""
import argparse
import concurrent.futures
from datetime import datetime, timedelta
import gzip
import importlib.util
import json
from pathlib import Path
import threading
import time
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

SHANGHAI = ZoneInfo("Asia/Shanghai")


def weekend_up_to_date(now, trading_date):
    if now.weekday() < 5:
        return False
    friday = now.date() - timedelta(days=now.weekday() - 4)
    return trading_date.replace("-", "") >= friday.strftime("%Y%m%d")


def read_cache(path):
    try:
        data = json.loads(path.read_text()) if path else {}
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def write_cache(path, data):
    if path:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
        temporary.replace(path)


def five_day_changes(quotes, history, sessions, current_date):
    # 用指数六根日线确定真实交易日，不能把漏跑的日期当成休市。
    if len(sessions) != 6 or len(set(sessions)) != 6 or sorted(sessions) != sessions or sessions[-1] != current_date:
        return {}
    base_prices = history.get(sessions[0], {})
    return {code: round((quote["price"] / base_prices[code] - 1) * 100, 2)
            for code, quote in quotes.items()
            if isinstance(base_prices.get(code), (int, float)) and base_prices[code] > 0
            and isinstance(quote.get("price"), (int, float)) and quote["price"] > 0}


def profiles_due(last_date, today):
    try:
        return (today - datetime.fromisoformat(last_date).date()).days >= 7
    except (ValueError, TypeError):
        return True


def company_cache_for_cycle(cache, previous_capture, now, trading_date):
    captured = cache.get("capturedAt")
    same_cycle = cache.get("baseProfilesCapturedAt") == previous_capture
    recent = captured and not profiles_due(captured, now.date())
    # 仅兼容首次初始化已经写下的当日断点；后续以周度抓取周期为界。
    legacy_same_day = not captured and cache.get("tradingDate") == trading_date
    if same_cycle and (recent or legacy_same_day):
        return cache.get("profiles", {}), captured or now.isoformat(timespec="seconds")
    return {}, now.isoformat(timespec="seconds")


def apply_detail(stock, detail, refresh_profiles):
    stock = dict(stock)
    stock["change5Percent"] = detail.get("change5")
    if refresh_profiles:
        # 网络缺失保留上次真实资料，不将成功旧值覆盖为空。
        profile = detail.get("profile") or {}
        revenue = detail.get("revenue") or {}
        for field in ["businessProfile", "businessScope", "industryCsrc", "employeeCount", "chairman"]:
            if profile.get(field) is not None:
                stock[field] = profile[field]
        for field in ["revenue", "revenueItem", "revenueReportDate"]:
            if revenue.get(field) is not None:
                stock[field] = revenue[field]
    return stock


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("release", type=Path)
    parser.add_argument("--force", action="store_true", help="初始化时允许周末抓取最近收盘")
    parser.add_argument("--history", type=Path, default=Path("/var/lib/xuanjian-updater/close-history.json"))
    parser.add_argument("--company-cache", type=Path, default=Path("/var/lib/xuanjian-updater/company-cache.json"))
    args = parser.parse_args()
    now = datetime.now(SHANGHAI)
    if now.weekday() >= 5 and not args.force:
        universe = json.loads((args.release / "data/mystic-stocks.json").read_text())
        if weekend_up_to_date(now, universe.get("factsSnapshot", {}).get("tradingDate", "")):
            print("SKIP weekend, Friday close already captured", flush=True)
            return
    spec = importlib.util.spec_from_file_location("stock_fetch", Path(__file__).with_name("fetch-stock-facts.py"))
    stock_fetch = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(stock_fetch)
    traffic = {"requests": 0, "responseBytes": 0}
    lock = threading.Lock()

    def http_get(url, timeout=15, decode="utf-8", raw=False):
        request = urllib.request.Request(url, headers=stock_fetch.UA)
        for attempt in range(3):
            with lock:
                traffic["requests"] += 1
            try:
                with urllib.request.urlopen(request, timeout=timeout) as response:
                    data = response.read()
                with lock:
                    traffic["responseBytes"] += len(data)
                break
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise
                time.sleep(1 + attempt * 2)
        if raw:
            return data
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        return data.decode(decode, errors="replace")

    stock_fetch.http_get = http_get
    try:
        refresh(args, now, stock_fetch, http_get, traffic)
    finally:
        print("TRAFFIC " + json.dumps(traffic), flush=True)


def refresh(args, now, stock_fetch, http_get, traffic):
    path = args.release / "data/mystic-stocks.json"
    universe = json.loads(path.read_text())
    api = "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001,0.399006&fields=f12,f14,f2,f3,f4,f124"
    market_source = {"name": "东方财富行情中心", "url": "https://quote.eastmoney.com/center/"}
    try:
        rows = json.loads(http_get(api))["data"]["diff"]
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError):
        # 同一真实指数的备用来源；不因东财暂时 502 阻断整条更新链路。
        print("Market primary unavailable; using Tencent index quotes", flush=True)
        index_quotes = stock_fetch.fetch_quotes([
            {"code": "000001", "exchange": "SH"},
            {"code": "399001", "exchange": "SZ"},
            {"code": "399006", "exchange": "SZ"},
        ])
        rows = [{
            "f12": code, "f14": quote["name"], "f2": quote["price"],
            "f3": quote["changePct"], "f4": round(quote["price"] - quote["prevClose"], 2),
            "f124": datetime.strptime(quote["quoteTime"], "%Y%m%d%H%M%S").replace(tzinfo=SHANGHAI).timestamp(),
        } for code, quote in index_quotes.items()]
        market_source = {"name": "腾讯行情", "url": "https://qt.gtimg.cn/"}
    if len(rows) != 3 or {row["f12"] for row in rows} != {"000001", "399001", "399006"}:
        raise ValueError("Incomplete market indices")
    for row in rows:
        if not all(isinstance(row[key], (int, float)) for key in ["f2", "f3", "f4", "f124"]):
            raise ValueError("Invalid market numbers")
    market_time = datetime.fromtimestamp(max(row["f124"] for row in rows), SHANGHAI)
    trading_date = market_time.strftime("%Y%m%d")
    last_date = universe.get("factsSnapshot", {}).get("tradingDate", "").replace("-", "")
    if trading_date <= last_date and not args.force:
        print("SKIP unchanged trading date " + trading_date, flush=True)
        return
    if market_time.date() > now.date() or market_time.date() < now.date() - timedelta(days=7):
        raise ValueError("Market trading date is stale or in the future")
    if (market_time.hour, market_time.minute) < (15, 0):
        raise ValueError("Refusing an intraday snapshot")
    stocks = universe["stocks"]
    if len(stocks) != universe["stockCount"] or len({stock["code"] for stock in stocks}) != len(stocks):
        raise ValueError("Invalid stock universe")
    quotes = stock_fetch.fetch_quotes(stocks)
    valid_quotes = {code: quote for code, quote in quotes.items()
                    if quote.get("quoteTime", "")[:8] == trading_date and quote.get("marketCap") is not None}
    if len(valid_quotes) < len(stocks) * 0.95:
        raise ValueError("Quote coverage below 95%; keeping current release")
    current_date = market_time.date().isoformat()
    history_path = getattr(args, "history", None)
    history = read_cache(history_path)
    try:
        bars = json.loads(http_get("https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh000001,day,,,6,qfq"))["data"]["sh000001"]
        sessions = [row[0] for row in (bars.get("day") or bars.get("qfqday") or [])][-6:]
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError):
        sessions = []
    change5 = five_day_changes(valid_quotes, history, sessions, current_date)
    history[current_date] = {code: quote["price"] for code, quote in valid_quotes.items() if quote.get("price") is not None}
    write_cache(history_path, {key: history[key] for key in sorted(history)[-30:]})
    last_profiles = universe.get("factsSnapshot", {}).get("profilesCapturedAt")
    weekly = profiles_due(last_profiles, now.date())
    print(f"START stocks={len(stocks)} profiles={weekly} tradingDate={trading_date}", flush=True)

    company_path = getattr(args, "company_cache", None)
    company_cache = read_cache(company_path)
    company_details, company_captured = company_cache_for_cycle(company_cache, last_profiles, now, trading_date)

    def save_company_cache():
        write_cache(company_path, {"baseProfilesCapturedAt": last_profiles, "capturedAt": company_captured, "profiles": company_details})

    def one(stock):
        prefix = stock_fetch.tencent_code(stock)
        detail = {"change5": change5.get(stock["code"])}
        if weekly:
            cached = company_details.get(stock["code"], {})
            detail["profile"] = cached.get("profile") or stock_fetch.fetch_profile(prefix)
            detail["revenue"] = cached.get("revenue") or stock_fetch.fetch_revenue(prefix)
        return stock["code"], detail

    details = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for code, detail in pool.map(one, stocks):
            details[code] = detail
            if weekly:
                company_details[code] = {"profile": detail.get("profile"), "revenue": detail.get("revenue")}
            if len(details) % 500 == 0:
                if weekly:
                    save_company_cache()
                print(f"progress={len(details)}/{len(stocks)} bytes={traffic['responseBytes']}", flush=True)
    if weekly:
        save_company_cache()
    print(f"fiveDayCoverage={len(change5)}/{len(stocks)} (missing history remains null)", flush=True)
    if weekly and sum(bool(detail.get("profile")) and bool(detail.get("revenue")) for detail in details.values()) < len(stocks) * 0.9:
        raise ValueError("Company facts coverage below 90%")
    for index, stock in enumerate(stocks):
        updated = apply_detail(stock, details[stock["code"]], weekly)
        quote = valid_quotes.get(stock["code"], {})
        for target, source in [("marketCap", "marketCap"), ("floatMarketCap", "floatCap"), ("pe", "pe"), ("changePercent", "changePct")]:
            # 停牌或缺失行情不冒充当日数值。
            updated[target] = quote.get(source)
        stocks[index] = updated
    captured = now.isoformat(timespec="seconds")
    universe["schemaVersion"] = max(4, universe.get("schemaVersion", 0))
    universe["snapshotAt"] = captured
    universe["factsSnapshot"] = {
        **universe.get("factsSnapshot", {}), "tradingDate": trading_date,
        "capturedAt": captured, "profilesCapturedAt": company_captured if weekly else last_profiles,
    }
    market = {
        "schemaVersion": 1, "tradingDate": market_time.date().isoformat(),
        "marketUpdatedAt": market_time.isoformat(timespec="seconds"), "capturedAt": captured,
        "status": "收盘快照" if market_time.date() == now.date() else "最近收盘",
        "source": market_source,
        "indices": [{"code": row["f12"], "name": row["f14"], "level": row["f2"], "change": row["f4"], "changePercent": row["f3"]} for row in rows],
    }
    write_cache(args.release / "data/market-snapshot.json", market)
    write_cache(path, universe)
    (args.release / ".data-updated").write_text(captured)
    print("READY " + captured, flush=True)


if __name__ == "__main__":
    main()
