import csv, json, shutil, sys, tempfile, unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(HERE))
import brandscan_load as B

REAL = HERE.parent / "ZocialEye"


def clone():
    """Copy the real saved MCP folder into a temp ZocialEye-like dir so a test can tamper with it."""
    src = B.find_dir(REAL)
    tmp = Path(tempfile.mkdtemp())
    shutil.copytree(src, tmp / src.name)
    return tmp, tmp / src.name


def edit_csv(path, fn):
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    fn(rows)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)


class BrandScanLoad(unittest.TestCase):
    def test_real_folder_loads(self):
        bs = B.load_brandscan(REAL)
        self.assertEqual(bs["score"]["months"][0], "2026-01")
        self.assertEqual(bs["score"]["latest"], bs["score"]["months"][-1])
        self.assertEqual(len(bs["sent"]["rows"]), 4 * 5 * len(bs["sent"]["periods"]))
        self.assertEqual(set(bs["score"]["vals"]), set(B.BRANDS))

    def test_no_folder_is_none(self):
        self.assertIsNone(B.load_brandscan(tempfile.mkdtemp()))

    def test_sentiment_total_mismatch_stops(self):
        tmp, d = clone()
        edit_csv(d / "sentiment_earned_by_platform.csv", lambda r: r[0].update(total=str(int(r[0]["total"]) + 1)))
        with self.assertRaisesRegex(ValueError, "do not sum"):
            B.load_brandscan(tmp)

    def test_score_typo_breaks_growth_identity(self):
        tmp, d = clone()
        def f(rows):
            r = next(x for x in rows if x["brand"] == "MEDCMU" and x["month"] == "2026-09")
            r["brand_score"] = str(int(r["brand_score"]) + 3)
        edit_csv(d / "brand_score_timeline.csv", f)
        with self.assertRaisesRegex(ValueError, "growth identity"):
            B.load_brandscan(tmp)

    def test_missing_brand_month_stops(self):
        tmp, d = clone()
        edit_csv(d / "brand_score_timeline.csv", lambda rows: rows.pop(0))
        with self.assertRaises(ValueError):
            B.load_brandscan(tmp)

    def test_missing_sentiment_row_stops(self):
        tmp, d = clone()
        edit_csv(d / "sentiment_earned_by_platform.csv", lambda rows: rows.pop())
        with self.assertRaisesRegex(ValueError, "expected"):
            B.load_brandscan(tmp)

    def test_duplicate_sentiment_row_stops(self):
        tmp, d = clone()
        edit_csv(d / "sentiment_earned_by_platform.csv", lambda rows: rows.append(dict(rows[0])))
        with self.assertRaises(ValueError):
            B.load_brandscan(tmp)

    def test_platform_earn_typo_stops(self):
        tmp, d = clone()
        def f(rows):
            r = next(x for x in rows if x["brand"] == "SI" and x["month"] == "2026-05" and x["platform"] == "youtube")
            r["earn_score"] = str(int(r["earn_score"]) + 20)
        edit_csv(d / "brand_score_platform_monthly.csv", f)
        with self.assertRaisesRegex(ValueError, "earn scores"):
            B.load_brandscan(tmp)

    def test_platform_own_typo_stops(self):
        tmp, d = clone()
        def f(rows):
            r = next(x for x in rows if x["brand"] == "CU" and x["month"] == "2026-03" and x["platform"] == "tiktok")
            r["own_score"] = str(int(r["own_score"]) + 25)
        edit_csv(d / "brand_score_platform_monthly.csv", f)
        with self.assertRaisesRegex(ValueError, "own scores"):
            B.load_brandscan(tmp)

    def test_platform_missing_row_stops(self):
        tmp, d = clone()
        edit_csv(d / "brand_score_platform_monthly.csv", lambda rows: rows.pop(7))
        with self.assertRaises(ValueError):
            B.load_brandscan(tmp)

    def test_first_month_growth_is_none(self):
        bs = B.load_brandscan(REAL)
        first = bs["score"]["months"][0]
        self.assertTrue(all(v[2] is None and v[3] is None for v in bs["score"]["platform"]["MEDCMU"][first].values()))
        self.assertTrue(all(v[2] is not None for v in bs["score"]["platform"]["MEDCMU"][bs["score"]["latest"]].values()))

    def test_ledger_counts(self):
        bs = B.load_brandscan(REAL)
        led = B.ledger_rows(bs)
        n_months = len(bs["score"]["months"]); n_per = len(bs["sent"]["periods"])
        self.assertEqual(sum(1 for r in led if r["kind"] == "score"), 4 * n_months * 4)
        self.assertEqual(sum(1 for r in led if r["kind"] == "score_platform"), 4 * n_months * 5 * 2)
        self.assertEqual(sum(1 for r in led if r["kind"] == "sentiment"), 4 * 5 * n_per * 4)


if __name__ == "__main__":
    unittest.main()
