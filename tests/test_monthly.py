import os
import sys
import tempfile
import unittest
from pathlib import Path

import openpyxl
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import monthly_load as L  # noqa: E402

MED = "คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่"
SI = "คณะแพทยศาสตร์ศิริราชพยาบาล"
HDR_FB = ["Date", "Brand Name", "Platform", "Author", "Message", "Post URL", "Engagement", "Reaction", "Like", "Comment", "Share", "View"]
HDR_FB_SM = HDR_FB[:-1] + ["Tag Friend"]
HDR_X = ["Date", "Brand Name", "Platform", "Author", "Message", "Post URL", "Engagement", "Like", "Reply", "Repost", "Quote"]


def make(dirpath, kind, tf, gen, sheets):
    """Write a minimal Brand Scan workbook. sheets = {sheet_name: (header, rows)}."""
    label = {"owned": "Owned", "earned": "Earned", "social_metric": "Social Metric"}[kind]
    path = os.path.join(dirpath, f"Brand Scan export data {label} from {tf}.xlsx")
    wb = openpyxl.Workbook()
    ov = wb.active
    ov.title = "Overview"
    ov.append([None, "Brand Scan, Brand Intelligence"])
    ov.append([None, "Timeframe", tf])
    ov.append([None, "Generated At", gen])
    for title, (hdr, rows) in sheets.items():
        ws = wb.create_sheet(title)
        ws.append(hdr)
        for r in rows:
            ws.append(r)
    wb.save(path)
    return path


class LoadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name

    def test_normalise(self):
        p = make(self.d, "owned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:13.548Z", {
            "Facebook": (HDR_FB, [
                ["2026-07-16", MED, "FACEBOOK", "a", "hello", "u1", "10", 0, 0, "NaN", 2, None],
                ["2026-07-16", MED, "FACEBOOK", "a", "", "u2", 5, 0, 0, 1, 0, 100]]),
            "X": (HDR_X, [["2026-07-17", MED, "X", "a", "t", "x1", 9, 1, 2, 3, 4]])})
        df = L.read_file(p)
        fb = df[df.platform == "facebook"].reset_index(drop=True)
        self.assertEqual(fb.engagement.tolist(), [10.0, 5.0])      # numeric string parsed
        self.assertTrue(pd.isna(fb.comment[0]))                     # "NaN" string -> missing, not 0
        self.assertIsNone(fb.text[1])                               # blank message -> None
        self.assertTrue(pd.isna(fb.views[0]) and fb.views[1] == 100)
        x = df[df.platform == "twitter"].iloc[0]
        self.assertEqual((x.comment, x.share), (2.0, 7.0))          # Reply ; Repost+Quote
        self.assertEqual(set(df.scope), {"owned"})
        self.assertEqual(df.generated_at.iloc[0], "2026-10-16T00:37:13.548Z")
        self.assertEqual((df.tf_start.iloc[0], df.tf_end.iloc[0]), ("2026-07-15", "2026-10-16"))
        self.assertEqual(list(df.columns), L.COLS)

    def test_social_metric_has_no_facebook_views(self):
        p = make(self.d, "social_metric", "2026-09-01 to 2026-09-30", "2026-10-16T00:50:09.799Z", {
            "Facebook": (HDR_FB_SM, [["2026-09-01", MED, "Facebook", "a", "hi", "u1", 7, 0, 0, 0, 0, 0]])})
        df = L.read_file(p)
        self.assertTrue(df.views.isna().all())       # missing column -> NaN, never 0
        self.assertEqual(set(df.scope), {"owned"})
        self.assertEqual(set(df.family), {"social_metric"})

    def test_earned_scope(self):
        p = make(self.d, "earned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:27.753Z", {
            "Facebook": (HDR_FB, [["2026-07-16", SI, "FACEBOOK", "a", "x", "u", 1, 0, 0, 0, 0, 0]])})
        self.assertEqual(set(L.read_file(p).scope), {"earned"})

    def test_unmapped_brand_fails_loudly(self):
        p = make(self.d, "owned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:13.548Z", {
            "Facebook": (HDR_FB, [["2026-07-16", "Some New Hospital", "FACEBOOK", "a", "x", "u", 1, 0, 0, 0, 0, 0]])})
        with self.assertRaisesRegex(ValueError, "unmapped brand"):
            L.read_file(p)

    def test_unknown_sheet_fails_loudly(self):
        p = make(self.d, "owned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:13.548Z", {
            "Threads": (HDR_FB, [["2026-07-16", MED, "THREADS", "a", "x", "u", 1, 0, 0, 0, 0, 0]])})
        with self.assertRaisesRegex(ValueError, "unknown platform sheet"):
            L.read_file(p)

    def test_renamed_required_column_fails_loudly(self):
        for missing in ("Engagement", "Message", "Post URL", "Date", "Brand Name"):
            hdr = [h + "s" if h == missing else h for h in HDR_FB]          # e.g. "Engagements": a renamed header
            p = make(self.d, "owned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:13.548Z", {
                "Facebook": (hdr, [["2026-07-16", MED, "FACEBOOK", "a", "x", "u", 500, 0, 0, 0, 0, 0]])})
            with self.assertRaisesRegex(ValueError, "missing required column"):
                L.read_file(p)
            os.remove(p)

    def test_youtube_zero_engagement_column_is_derived_from_like_plus_comment(self):
        hdr = ["Date", "Brand Name", "Platform", "Author", "Message", "Post URL", "View", "Engagement", "Like", "Comment", "Share"]
        p = make(self.d, "social_metric", "2026-06-01 to 2026-06-30", "2026-10-16T01:00:00.000Z", {
            "YouTube": (hdr, [["2026-06-02", MED, "YouTube", "a", "v1", "y1", 1000, 0, 20, 3, 9],
                              ["2026-06-03", MED, "YouTube", "a", "v2", "y2", 50, 0, 4, 0, 0]]),
            "Facebook": (HDR_FB_SM, [["2026-06-02", MED, "Facebook", "a", "f", "f1", 0, 0, 0, 0, 0, 0]])})
        df = L.read_file(p)
        yt = df[df.platform == "youtube"]
        self.assertEqual(yt.engagement.tolist(), [23.0, 4.0])      # Like + Comment (Share excluded: the Owned export identity)
        self.assertTrue(yt.eng_derived.all())
        self.assertEqual((set(yt.tf_start), set(yt.tf_end), set(yt.family), set(yt.generated_at)),     # no other column is disturbed
                         ({"2026-06-01"}, {"2026-06-30"}, {"social_metric"}, {"2026-10-16T01:00:00.000Z"}))
        fb = df[df.platform == "facebook"]
        self.assertEqual(fb.engagement.tolist(), [0.0])            # only YouTube is repaired
        self.assertFalse(fb.eng_derived.any())

    def test_youtube_engagement_untouched_when_the_column_is_filled(self):
        hdr = ["Date", "Brand Name", "Platform", "Author", "Message", "Post URL", "View", "Engagement", "Like", "Comment", "Share"]
        p = make(self.d, "owned", "2026-07-15 to 2026-10-16", "2026-10-16T00:37:13.548Z", {
            "YouTube": (hdr, [["2026-07-20", MED, "YouTube", "a", "v1", "y1", 1000, 25, 20, 5, 0],
                              ["2026-07-21", MED, "YouTube", "a", "v2", "y2", 50, 0, 4, 0, 0]])})
        yt = L.read_file(p)
        self.assertEqual(yt.engagement.tolist(), [25.0, 0.0])      # at least one filled value: never overwritten
        self.assertFalse(yt.eng_derived.any())

    def test_unrecognised_filename_fails(self):
        with self.assertRaisesRegex(ValueError, "unrecognised export file name"):
            L.family_of("something_else.xlsx")


import monthly_agg as A  # noqa: E402

GEN_NEW, GEN_OLD = "2026-10-16T00:48:03.879Z", "2026-10-16T00:37:13.548Z"
NAN = float("nan")


def P(date, brand="MEDCMU", platform="facebook", scope="owned", text="t", url=None, eng=1.0, views=NAN,
      family="owned", src="o.xlsx", gen=GEN_OLD, tf=("2026-07-15", "2026-10-16"), author="a", comment=NAN, share=NAN, derived=False):
    return dict(date=date, month=date[:7], brand=brand, platform=platform, scope=scope, author=author, text=text, url=url,
                engagement=eng, views=views, comment=comment, share=share, family=family, src_file=src,
                generated_at=gen, tf_start=tf[0], tf_end=tf[1], eng_derived=derived)


def table(rows):
    return pd.DataFrame(rows, columns=L.COLS)


class SourceTests(unittest.TestCase):
    def test_latest_file_wins_and_is_not_hardcoded(self):
        rows = [P("2026-08-05", src="ow.xlsx", gen=GEN_OLD), P("2026-08-05", src="sm.xlsx", family="social_metric", gen=GEN_NEW, tf=("2026-08-01", "2026-08-31"))]
        chosen, cands = A.choose_sources(table(rows))
        self.assertEqual(chosen[("2026-08", "owned")], "sm.xlsx")
        self.assertEqual(cands[("2026-08", "owned")], ["sm.xlsx", "ow.xlsx"])
        rows[0]["generated_at"], rows[1]["generated_at"] = GEN_NEW, GEN_OLD   # a newer re-export of the Owned file
        chosen, _ = A.choose_sources(table(rows))
        self.assertEqual(chosen[("2026-08", "owned")], "ow.xlsx")

    def test_scopes_resolve_independently(self):
        rows = [P("2026-08-05", scope="owned", src="o.xlsx"), P("2026-08-05", scope="earned", src="e.xlsx", family="earned")]
        chosen, _ = A.choose_sources(table(rows))
        self.assertEqual(chosen[("2026-08", "owned")], "o.xlsx")
        self.assertEqual(chosen[("2026-08", "earned")], "e.xlsx")

    def test_month_status_and_gap(self):
        rows = [P("2026-05-10", src="sm5.xlsx", family="social_metric", tf=("2026-05-01", "2026-05-31")),
                P("2026-07-20", src="ow.xlsx"), P("2026-10-05", src="ow.xlsx")]
        df = table(rows)
        chosen, _ = A.choose_sources(df)
        months = A.month_range(df)
        self.assertEqual(months[0], "2026-05")
        self.assertEqual(months[-1], "2026-10")
        info = A.month_info(df, chosen, months)
        self.assertEqual(info["2026-05"]["owned"]["status"], "complete")
        self.assertEqual(info["2026-06"]["owned"]["status"], "nodata")        # gap month: no rows anywhere
        self.assertIsNone(info["2026-06"]["owned"]["src"])
        self.assertEqual(info["2026-07"]["owned"]["status"], "partial")
        self.assertEqual(info["2026-07"]["owned"]["span"], ["2026-07-15", "2026-07-31"])
        self.assertEqual(info["2026-10"]["owned"]["span"], ["2026-10-01", "2026-10-15"])   # tf says 10-16 but file generated 10-16 00:37 -> last full day is 10-15
        self.assertEqual(info["2026-07"]["earned"]["status"], "nodata")        # no earned rows given

    def test_span_end_capped_only_when_generated_inside_the_month(self):
        # an old, complete Social Metric month generated much later must stay "complete"
        sm = P("2026-08-05", src="sm.xlsx", family="social_metric", gen="2026-10-16T00:48:03.879Z", tf=("2026-08-01", "2026-08-31"))
        # an export generated on the 20th of its own month, timeframe running to the 30th: only 1-19 are complete days
        ow = P("2026-09-05", src="ow2.xlsx", gen="2026-09-20T09:00:00.000Z", tf=("2026-09-01", "2026-09-30"))
        df = table([sm, ow])
        chosen, _ = A.choose_sources(df)
        info = A.month_info(df, chosen, ["2026-08", "2026-09"])
        self.assertEqual(info["2026-08"]["owned"]["status"], "complete")
        self.assertEqual(info["2026-09"]["owned"]["status"], "partial")
        self.assertEqual(info["2026-09"]["owned"]["span"], ["2026-09-01", "2026-09-19"])

    def test_aggregate_counts_and_missing(self):
        rows = [P("2026-08-01", text="a", eng=10), P("2026-08-02", text="b", eng=30), P("2026-08-03", text=None, eng=5)]
        cells = A.aggregate(table(rows))
        c = cells["2026-08|MEDCMU|facebook|owned"]
        self.assertEqual((c["rows"], c["posts"], c["blank"], c["eng"]), (3, 2, 1, 45.0))
        self.assertIsNone(c["views"])                      # all NaN -> None, not 0
        self.assertEqual((c["mean"], c["median"]), (20.0, 20.0))
        self.assertEqual((c["top1"], c["top3"]), (75.0, 100.0))        # concentration over the 2 text-bearing posts: 30/40 and 40/40

    def test_concentration_uses_text_bearing_rows_only(self):
        rows = [P("2026-08-01", text=None, eng=1000), P("2026-08-02", text="a", eng=10), P("2026-08-03", text="b", eng=20)]
        c = A.aggregate(table(rows))["2026-08|MEDCMU|facebook|owned"]
        self.assertEqual(c["eng"], 1030.0)                      # the total still includes the text-less row (the file's engagement)
        self.assertEqual((c["top1"], c["top3"]), (66.7, 100.0))   # 20/30 and 30/30: same population as the top-posts list
        only_blank = A.aggregate(table([P("2026-08-01", text=None, eng=5)]))["2026-08|MEDCMU|facebook|owned"]
        self.assertIsNone(only_blank["top1"])                   # no text-bearing post -> not enough data, not 0

    def test_missing_combination_absent(self):
        cells = A.aggregate(table([P("2026-08-01")]))
        self.assertNotIn("2026-08|SI|facebook|owned", cells)       # no zero-filled cell: UI shows "not enough data"
        self.assertNotIn("2026-08|MEDCMU|youtube|owned", cells)

    def test_exact_duplicates_dropped_other_kept(self):
        rows = [P("2026-08-01", url="u1", eng=5), P("2026-08-01", url="u1", eng=5),      # exact duplicate
                P("2026-08-01", url="u1", eng=9),                                          # same url, different engagement: keep
                P("2026-08-01", url=None, eng=2), P("2026-08-01", url=None, eng=2)]        # no url: never deduped
        df = table(rows)
        chosen, _ = A.choose_sources(df)
        sel, dropped = A.select_rows(df, chosen)
        self.assertEqual((len(sel), dropped), (4, 1))

    def test_select_rows_uses_winning_file_only(self):
        rows = [P("2026-08-05", src="ow.xlsx", gen=GEN_OLD, eng=100), P("2026-08-05", src="sm.xlsx", family="social_metric", gen=GEN_NEW, eng=7, tf=("2026-08-01", "2026-08-31"))]
        df = table(rows)
        chosen, _ = A.choose_sources(df)
        sel, _ = A.select_rows(df, chosen)
        self.assertEqual(sel.engagement.tolist(), [7.0])

    def test_daily_null_outside_coverage(self):
        rows = [P("2026-07-20", eng=4), P("2026-07-20", eng=6)]
        df = table(rows)
        chosen, _ = A.choose_sources(df)
        info = A.month_info(df, chosen, ["2026-07"])
        sel, _ = A.select_rows(df, chosen)
        dates = ["2026-07-10", "2026-07-20", "2026-07-21"]
        d = A.build_daily(sel, info, dates)["MEDCMU|facebook|owned"]
        self.assertEqual(d["eng"], [None, 10.0, 0])            # 07-10 is before the file's span -> None, 07-21 covered with no rows -> 0
        self.assertEqual(d["posts"], [None, 2, 0])

    def test_overlap_report_matches_by_date_and_text(self):
        rows = [P("2026-08-05", text="Hello  World", src="ow.xlsx", url="https://a/1", eng=100, gen=GEN_OLD),
                P("2026-08-05", text="hello world", src="sm.xlsx", family="social_metric", url="https://b/9", eng=90, gen=GEN_NEW, tf=("2026-08-01", "2026-08-31"))]
        df = table(rows)
        chosen, cands = A.choose_sources(df)
        r = A.overlap_report(df, chosen, cands).iloc[0]
        self.assertEqual((r.winner_family, r.other_family), ("social_metric", "owned"))
        self.assertEqual((r.win_text, r.other_text, r.matched), (1, 1, 1))     # urls differ between files: match on date+text
        self.assertEqual((r.win_eng, r.other_eng), (90.0, 100.0))

    def test_top_and_authors(self):
        rows = [P("2026-08-01", text="x" * 300, eng=50, url="u1"), P("2026-08-02", text="y", eng=70, url="u2"),
                P("2026-08-02", scope="earned", family="earned", src="e.xlsx", text="z", eng=8, author="Bob"),
                P("2026-08-03", scope="earned", family="earned", src="e.xlsx", text="w", eng=4, author="Bob")]
        sel = table(rows)
        top = [t for t in A.build_top(sel) if t["s"] == "owned"]
        self.assertEqual([t["e"] for t in top], [70, 50])
        self.assertTrue(top[1]["x"].endswith("…") and len(top[1]["x"]) == 241)
        au = A.build_authors(sel)
        self.assertEqual(au, [dict(m="2026-08", b="MEDCMU", p="facebook", n="Bob", posts=2, e=12.0)])


import json  # noqa: E402
import build_monthly as B  # noqa: E402


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.d = self.tmp.name

    def test_payload_is_script_safe(self):
        s = B.to_payload({"x": "</script><img src=x onerror=alert(1)>", "n": None})
        self.assertNotIn("</", s)
        self.assertEqual(json.loads(s.replace("<\\/", "</"))["x"], "</script><img src=x onerror=alert(1)>")

    def test_payload_rejects_nan(self):
        with self.assertRaises(ValueError):
            B.to_payload({"x": float("nan")})

    def test_build_data_end_to_end(self):
        make(self.d, "social_metric", "2026-08-01 to 2026-08-31", GEN_NEW, {
            "Facebook": (HDR_FB_SM, [["2026-08-02", MED, "Facebook", "a", "hello", "u1", 7, 0, 0, 0, 0, 0]])})
        make(self.d, "owned", "2026-07-15 to 2026-10-16", GEN_OLD, {
            "Facebook": (HDR_FB, [["2026-07-20", MED, "FACEBOOK", "a", "x", "u2", 3, 0, 0, 0, 0, 55],
                                  ["2026-08-02", MED, "FACEBOOK", "a", "hello", "u9", 9, 0, 0, 0, 0, 5]])})
        data, ledger, ov = B.build_data(self.d)
        self.assertEqual([m["mo"] for m in data["months"]], ["2026-07", "2026-08"])
        self.assertEqual(data["months"][0]["owned"]["status"], "partial")
        self.assertEqual(data["months"][1]["owned"]["family"], "social_metric")      # newer file wins Aug
        self.assertEqual(data["cells"]["2026-08|MEDCMU|facebook|owned"]["eng"], 7.0)
        self.assertEqual(data["cells"]["2026-07|MEDCMU|facebook|owned"]["views"], 55.0)
        self.assertEqual(len(ov), 1)
        self.assertEqual(set(ledger.columns), {"month", "brand", "platform", "scope", "metric", "value", "source"})
        self.assertTrue(((ledger.metric == "eng") & (ledger.month == "2026-08") & (ledger.value == 7.0)).any())
        B.to_payload(data)                                                          # must be strictly JSON-safe


if __name__ == "__main__":
    unittest.main()
