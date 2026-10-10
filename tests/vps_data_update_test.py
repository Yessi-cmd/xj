"""离线数据维护测试：python3 -m unittest discover -s tests -p '*test.py'。"""
from datetime import date
import importlib.util
from pathlib import Path
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("updater", Path(__file__).parents[1] / "scripts/update-vps-data.py")
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


class UpdateTests(unittest.TestCase):
    def test_manual_fetch_resumes_only_the_same_trading_date(self):
        from datetime import datetime
        import json
        import sys
        import tempfile
        spec = importlib.util.spec_from_file_location("manual_fetch", Path(__file__).parents[1] / "scripts/fetch-stock-facts.py")
        manual = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(manual)
        for cached_date in ["20261008", "20261009", None]:
            with self.subTest(cached_date=cached_date), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                universe = root / "universe.json"
                universe.write_text(json.dumps({"stocks": [{"code": "600000", "exchange": "SH"}]}))
                cache = root / "partial.json"
                cache.write_text(json.dumps({"tradingDate": cached_date, "stocks": {"600000": {"change5": 999}}}))
                output = root / "facts.json"
                fetch_one = Mock(return_value={"change5": 1})
                fixed = datetime.fromisoformat("2026-10-09T16:30:00+08:00")
                with patch.object(sys, "argv", ["fetch", str(universe)]), patch.object(manual, "PARTIAL_PATH", str(cache)), patch.object(manual, "OUTPUT_PATH", str(output)), patch.object(manual, "fetch_quotes", return_value={"600000": {"quoteTime": "20261009150000"}}), patch.object(manual, "fetch_one", fetch_one), patch.object(manual, "datetime", Mock(now=Mock(return_value=fixed))):
                    manual.main()
                facts = json.loads(output.read_text())
                self.assertEqual(facts["profiles"]["600000"]["change5"], 999 if cached_date == "20261009" else 1)
                self.assertEqual(fetch_one.call_count, 0 if cached_date == "20261009" else 1)
                self.assertEqual(facts["capturedAt"], "2026-10-09T16:30:00+08:00")

    def test_weekend_skips_only_when_friday_close_is_already_present(self):
        from datetime import datetime
        saturday = datetime.fromisoformat("2026-10-10T16:30:00+08:00")
        self.assertTrue(updater.weekend_up_to_date(saturday, "20261009"))
        self.assertFalse(updater.weekend_up_to_date(saturday, "20261008"))
        self.assertFalse(updater.weekend_up_to_date(datetime.fromisoformat("2026-10-12T16:30:00+08:00"), "20261009"))

    def test_release_retention_preserves_manual_current_and_previous_versions(self):
        import tempfile
        spec = importlib.util.spec_from_file_location("pruner", Path(__file__).parents[1] / "scripts/prune-auto-releases.py")
        pruner = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(pruner)
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder)
            releases = site / "releases"
            releases.mkdir()
            for number in range(17):
                (releases / f"auto-data-{number:03d}").mkdir()
            (releases / "manual-release").mkdir()
            (site / "current").symlink_to(releases / "auto-data-000")
            pruner.prune(site, releases / "auto-data-001")
            self.assertTrue((releases / "auto-data-000").exists())
            self.assertTrue((releases / "auto-data-001").exists())
            self.assertFalse((releases / "auto-data-002").exists())
            self.assertTrue((releases / "manual-release").exists())

    def test_company_retry_reuses_same_week_cycle_across_trading_days(self):
        from datetime import datetime
        cache = {"baseProfilesCapturedAt": "2026-10-01T16:30:00+08:00", "capturedAt": "2026-10-09T16:30:00+08:00", "profiles": {"000001": {"profile": {"businessProfile": "真实资料"}}}}
        values, captured = updater.company_cache_for_cycle(cache, "2026-10-01T16:30:00+08:00", datetime.fromisoformat("2026-10-12T16:30:00+08:00"), "20261012")
        self.assertIn("000001", values)
        self.assertEqual(captured, cache["capturedAt"])
        values, _ = updater.company_cache_for_cycle(cache, "2026-10-01T16:30:00+08:00", datetime.fromisoformat("2026-10-16T16:30:00+08:00"), "20261016")
        self.assertEqual(values, {})
        values, _ = updater.company_cache_for_cycle(cache, "2026-10-09T16:30:00+08:00", datetime.fromisoformat("2026-10-12T16:30:00+08:00"), "20261012")
        self.assertEqual(values, {})

    def test_five_day_return_requires_exact_exchange_sessions(self):
        quotes = {"000001": {"price": 12}}
        dates = ["2026-09-30", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]
        history = {"2026-09-30": {"000001": 10}, "2026-09-29": {"000001": 8}}
        self.assertEqual(updater.five_day_changes(quotes, history, dates, "2026-10-15"), {"000001": 20})
        self.assertEqual(updater.five_day_changes(quotes, {"2026-09-29": {"000001": 8}}, dates, "2026-10-15"), {})
        self.assertEqual(updater.five_day_changes(quotes, history, dates, "2026-10-16"), {})
        self.assertEqual(updater.five_day_changes(quotes, history, list(reversed(dates)), "2026-10-15"), {})

    def test_weekly_cache_uses_explicit_date(self):
        self.assertFalse(updater.profiles_due("2026-10-09T16:30:00+08:00", date(2026, 10, 15)))
        self.assertTrue(updater.profiles_due("2026-10-09T16:30:00+08:00", date(2026, 10, 16)))
        self.assertTrue(updater.profiles_due(None, date(2026, 10, 16)))

    def test_daily_refresh_uses_local_closes_without_company_or_stock_kline_requests(self):
        from datetime import datetime
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            universe = {"stockCount": 1, "stocks": [{"code": "000001", "businessProfile": "真实旧资料", "revenue": 123}], "factsSnapshot": {"tradingDate": "20261014", "profilesCapturedAt": "2026-10-10T16:30:00+08:00"}}
            (root / "data/mystic-stocks.json").write_text(json.dumps(universe))
            cache = root / "history.json"
            cache.write_text(json.dumps({"2026-09-30": {"000001": 10}}))
            stamp = int(datetime.fromisoformat("2026-10-15T15:01:00+08:00").timestamp())
            market = {"data": {"diff": [{"f12": code, "f14": code, "f2": 100, "f3": 1, "f4": 1, "f124": stamp} for code in ["000001", "399001", "399006"]]}}
            dates = ["2026-09-30", "2026-10-09", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]
            bars = {"data": {"sh000001": {"day": [[day, "1", "1"] for day in dates]}}}
            fetcher = Mock()
            fetcher.fetch_quotes.return_value = {"000001": {"quoteTime": "20261015150100", "marketCap": 100, "floatCap": 90, "pe": 10, "changePct": 1, "price": 12}}
            updater.refresh(SimpleNamespace(release=root, force=False, history=cache), datetime.fromisoformat("2026-10-15T16:30:00+08:00"), fetcher, lambda url: json.dumps(market if "push2" in url else bars), {"responseBytes": 100})
            result = json.loads((root / "data/mystic-stocks.json").read_text())
            self.assertEqual(result["stocks"][0]["change5Percent"], 20)
            self.assertEqual(result["stocks"][0]["revenue"], 123)
            self.assertEqual(result["factsSnapshot"]["tradingDate"], "20261015")
            self.assertTrue((root / ".data-updated").exists())
            self.assertEqual(json.loads(cache.read_text())["2026-10-15"]["000001"], 12)
            fetcher.fetch_profile.assert_not_called()
            fetcher.fetch_revenue.assert_not_called()
            fetcher.fetch_change5.assert_not_called()

    def test_quote_only_update_preserves_company_facts(self):
        stock = {"businessProfile": "完整公司资料", "revenue": 123, "change5Percent": 9}
        result = updater.apply_detail(stock, {"change5": 2}, False)
        self.assertEqual(result["revenue"], 123)
        self.assertEqual(result["businessProfile"], "完整公司资料")
        self.assertEqual(result["change5Percent"], 2)
        self.assertEqual(stock["change5Percent"], 9)

    def test_missing_company_response_preserves_verified_facts(self):
        stock = {"businessProfile": "旧资料", "revenue": 123, "change5Percent": 9}
        result = updater.apply_detail(stock, {"profile": None, "revenue": None, "change5": None}, True)
        self.assertEqual(result["businessProfile"], "旧资料")
        self.assertEqual(result["revenue"], 123)
        self.assertIsNone(result["change5Percent"])

    def test_weekly_update_keeps_entire_business_description(self):
        text = "真实业务介绍" * 100
        result = updater.apply_detail({}, {"profile": {"businessProfile": text}, "revenue": {"revenue": 999}}, True)
        self.assertEqual(result["businessProfile"], text)
        self.assertEqual(result["revenue"], 999)

    def test_unchanged_trading_date_skips_all_stock_requests(self):
        from datetime import datetime
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            (root / "data/mystic-stocks.json").write_text(json.dumps({"factsSnapshot": {"tradingDate": "20261009"}}))
            market_time = int(datetime.fromisoformat("2026-10-09T15:01:00+08:00").timestamp())
            payload = {"data": {"diff": [{"f12": code, "f2": 100, "f3": 1, "f4": 1, "f124": market_time} for code in ["000001", "399001", "399006"]]}}
            fetcher = Mock()
            updater.refresh(SimpleNamespace(release=root, force=False), datetime.fromisoformat("2026-10-09T16:30:00+08:00"), fetcher, lambda _: json.dumps(payload), {})
            fetcher.fetch_quotes.assert_not_called()
            self.assertFalse((root / ".data-updated").exists())

    def test_sparse_quotes_abort_before_company_requests_or_writes(self):
        from datetime import datetime
        import json
        import tempfile
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            original = json.dumps({"stockCount": 1, "stocks": [{"code": "000001"}], "factsSnapshot": {"tradingDate": "20261008"}})
            (root / "data/mystic-stocks.json").write_text(original)
            stamp = int(datetime.fromisoformat("2026-10-09T15:01:00+08:00").timestamp())
            payload = {"data": {"diff": [{"f12": code, "f2": 100, "f3": 1, "f4": 1, "f124": stamp} for code in ["000001", "399001", "399006"]]}}
            fetcher = Mock()
            fetcher.fetch_quotes.return_value = {}
            with self.assertRaisesRegex(ValueError, "95%"):
                updater.refresh(SimpleNamespace(release=root, force=False), datetime.fromisoformat("2026-10-09T16:30:00+08:00"), fetcher, lambda _: json.dumps(payload), {})
            self.assertEqual((root / "data/mystic-stocks.json").read_text(), original)
            fetcher.fetch_profile.assert_not_called()

    def test_market_outage_uses_real_backup_indices(self):
        from datetime import datetime
        import json
        import tempfile
        import urllib.error
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "data").mkdir()
            (root / "data/mystic-stocks.json").write_text(json.dumps({"stockCount": 1, "stocks": [{"code": "600000"}], "factsSnapshot": {"tradingDate": "20261008"}}))
            quotes = {code: {"name": code, "price": 100, "prevClose": 99, "changePct": 1, "quoteTime": "20261009150100"} for code in ["000001", "399001", "399006"]}
            fetcher = Mock()
            fetcher.fetch_quotes.side_effect = [quotes, {}]
            def unavailable(_):
                raise urllib.error.URLError("offline fixture")
            with self.assertRaisesRegex(ValueError, "95%"):
                updater.refresh(SimpleNamespace(release=root, force=False), datetime.fromisoformat("2026-10-09T16:30:00+08:00"), fetcher, unavailable, {})
            self.assertEqual(fetcher.fetch_quotes.call_count, 2)
            self.assertEqual(fetcher.fetch_quotes.call_args_list[0].args[0][0], {"code": "000001", "exchange": "SH"})


if __name__ == "__main__":
    unittest.main()
