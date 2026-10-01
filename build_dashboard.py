#!/usr/bin/env python3
"""Build MEDCMU_Dashboard.html from the two Wisesight/ZocialEye workbooks.

Pipeline:  xlsx -> aggregate (this file) -> dashboard_data.json + metrics_ledger.csv
           -> inline into dashboard_template.html (+ vendored Chart.js) -> index.html (= MEDCMU_Dashboard.html)

Every number the dashboard shows comes from dashboard_data.json; the ledger is a flat CSV
copy of the per-(brand, platform, scope) metrics for audit / grep-sweep.
"""
import json
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("MEDCMU_DATA_DIR", HERE.parent / "MEDCMU DATA 2026"))  # folder holding the two .xlsx files
EXPORT = DATA_DIR / "MEDCMU_4Brands_Export_28Jun-27Sep2026_v2_corrected.xlsx"  # v2 = completeness-checked 2026-09-30 (see change_log sheet)
SCORE = DATA_DIR / "Brand_Score_Jan-Sep2026.xlsx"

BRANDS = [  # display order == categorical slot order (blue, orange, aqua, yellow)
    ("MEDCMU", "MEDCMU", "คณะแพทยศาสตร์ มช.", "คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่"),
    ("SI", "ศิริราช", "คณะแพทยศาสตร์ศิริราชพยาบาล", "คณะแพทยศาสตร์ศิริราชพยาบาล"),
    ("CU", "จุฬาฯ", "โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย", "โรงพยาบาลจุฬาลงกรณ์ สภากาชาดไทย"),
    ("SMV", "สมิติเวช", "โรงพยาบาลสมิติเวช", "โรงพยาบาลสมิติเวช"),
]
FULL2KEY = {b[3]: b[0] for b in BRANDS}
PLATFORMS = ["facebook", "instagram", "tiktok", "youtube", "twitter"]
SCOPES = ["owned", "earned"]
SCORE_KEY = {"MEDCMU": "MEDCMU", "SI (Siriraj)": "SI",
             "CU (King Chulalongkorn Memorial Hospital)": "CU", "Smitivej": "SMV"}
TOP_N = 25
TEXT_CUT = 240


def num(v):
    """NaN/inf -> None, numpy scalars -> python."""
    if v is None:
        return None
    if isinstance(v, (float, np.floating)):
        if np.isnan(v) or np.isinf(v):
            return None
        return float(v)
    if isinstance(v, (np.integer,)):
        return int(v)
    return v


def rnd(v, n=2):
    v = num(v)
    return None if v is None else round(v, n)


def brand_key(series):
    return series.map(FULL2KEY)


def load():
    x = pd.read_excel(EXPORT, sheet_name=None)
    for k in ("summary", "sentiment", "audience_size", "top_creators", "messages", "daily_trend"):
        if "brand" in x[k].columns:
            x[k]["bk"] = brand_key(x[k]["brand"])
            assert x[k]["bk"].notna().all(), f"unmapped brand in {k}"
    return x


def build_cells(x):
    s, m, dt = x["summary"], x["messages"], x["daily_trend"]
    m = m.copy()
    m["has_text"] = m["text"].notna()
    cells = {}
    for _, r in s.iterrows():
        key = f'{r.bk}|{r.platform}|{r.scope}'
        g = m[(m.bk == r.bk) & (m.platform == r.platform) & (m.scope == r.scope)]
        gt = g[g.has_text]
        gb = g[~g.has_text]
        comment = num(r.get("total_comment"))
        if comment is None:
            comment = num(r.get("total_reply"))
        share = num(r.get("total_share"))
        if share is None and num(r.get("total_retweet")) is not None:
            share = (num(r.get("total_retweet")) or 0) + (num(r.get("total_quote")) or 0)
        eng_sum_msgs = float(g.engagement_total.sum())
        top = g.engagement_total.sort_values(ascending=False)
        c = dict(
            brand=r.bk, platform=r.platform, scope=r.scope,
            engagement=num(r.total_engagement),
            posts_raw=num(r.total_post),
            views=num(r.get("total_view")),
            follower=num(r.get("follower")),
            comment=comment, share=share,
            avg_eng_raw=rnd(r.avg_engagement),
            # message-level (derived)
            msg_rows=int(len(g)),
            msg_eng_sum=eng_sum_msgs,
            posts_text=int(len(gt)),
            blank_rows=int(len(gb)),
            blank_eng=float(gb.engagement_total.sum()),
            mean_eng_text=rnd(gt.engagement_total.mean()) if len(gt) else None,
            median_eng_text=rnd(gt.engagement_total.median()) if len(gt) else None,
            top1_share=rnd(top.iloc[0] / eng_sum_msgs * 100, 1) if eng_sum_msgs > 0 else None,
            top3_share=rnd(top.iloc[:3].sum() / eng_sum_msgs * 100, 1) if eng_sum_msgs > 0 else None,
        )
        # per-post engagement rate by followers (owned only, text-bearing posts)
        if r.scope == "owned" and c["follower"] and c["mean_eng_text"] is not None:
            c["er_follower_pct"] = rnd(c["mean_eng_text"] / c["follower"] * 100, 3)
        else:
            c["er_follower_pct"] = None
        cells[key] = c

    # follower growth: first/last non-null follower value per owned (brand, platform)
    o = dt[(dt.scope == "owned") & dt.follower.notna()].sort_values("date")
    for (bk, pf), g in o.groupby(["bk", "platform"]):
        c = cells[f"{bk}|{pf}|owned"]
        f0, f1 = float(g.follower.iloc[0]), float(g.follower.iloc[-1])
        c.update(follower_start=f0, follower_end=f1, follower_delta=f1 - f0,
                 follower_pct=rnd((f1 - f0) / f0 * 100, 2),
                 follower_d0=str(g.date.iloc[0])[:10], follower_d1=str(g.date.iloc[-1])[:10])
    return cells


def build_daily(x):
    dt, m = x["daily_trend"], x["messages"].copy()
    d0, d1 = str(x["summary"]["start"].min())[:10], str(x["summary"]["end"].max())[:10]
    m["d"] = m.posted_time.str[:10]
    m["has_text"] = m["text"].notna()
    dates = pd.date_range(d0, d1).strftime("%Y-%m-%d").tolist()
    idx = {d: i for i, d in enumerate(dates)}
    dt = dt.copy()
    dt["d"] = pd.to_datetime(dt.date).dt.strftime("%Y-%m-%d")
    out = {}
    for (bk, pf, sc), g in dt.groupby(["bk", "platform", "scope"]):
        eng = [0] * len(dates)
        for _, r in g.iterrows():
            if r.d in idx:
                eng[idx[r.d]] = num(r.total_engagement) or 0
        pm = m[(m.bk == bk) & (m.platform == pf) & (m.scope == sc) & m.has_text]
        posts = [0] * len(dates)
        for d, n in pm.groupby("d").size().items():
            if d in idx:
                posts[idx[d]] = int(n)
        out[f"{bk}|{pf}|{sc}"] = dict(eng=eng, posts=posts)
    return dates, out


def build_monthly(x, dates):
    """Monthly engagement per (brand, platform, scope), summed from daily_trend (same basis as the
    summary sheet). `days` = number of days of the export window that fall in each month, so the UI
    can flag partial months and offer a per-day view."""
    dt = x["daily_trend"].copy()
    dt["mo"] = pd.to_datetime(dt.date).dt.strftime("%Y-%m")
    months = sorted({d[:7] for d in dates})
    days = [sum(1 for d in dates if d[:7] == mo) for mo in months]
    eng = {}
    for (bk, pf, sc), g in dt.groupby(["bk", "platform", "scope"]):
        eng[f"{bk}|{pf}|{sc}"] = [float(g[g.mo == mo].total_engagement.fillna(0).sum()) for mo in months]
    return dict(months=months, days=days, eng=eng)


def build_top_posts(x):
    m = x["messages"]
    rows = []
    for (bk, pf, sc), g in m[m.text.notna()].groupby(["bk", "platform", "scope"]):
        g = g.drop_duplicates("message_id").sort_values("engagement_total", ascending=False).head(TOP_N)
        for _, r in g.iterrows():
            txt = re.sub(r"\s+", " ", str(r.text)).strip()
            rows.append(dict(
                b=bk, p=pf, s=sc, t=str(r.posted_time)[:10], e=int(r.engagement_total),
                v=num(r.get("view_count")) or num(r.get("play_count")),
                x=txt[:TEXT_CUT] + ("…" if len(txt) > TEXT_CUT else ""),
                u=None if pd.isna(r.permalink) else str(r.permalink),
                k=None if pd.isna(r.post_type) else str(r.post_type),
                a=None if pd.isna(r.author_display_name) else str(r.author_display_name)[:60],
                sn=None if pd.isna(r.sentiment) else str(r.sentiment),
            ))
    return rows


def build_scores():
    raw = pd.read_excel(SCORE, sheet_name=0, header=None)
    hdr_row = raw.index[raw[0] == "Brand"][0]
    months = [str(v) for v in raw.iloc[hdr_row, 2:].tolist() if pd.notna(v)]
    out, cur = {}, None
    for i in range(hdr_row + 1, len(raw)):
        b, metric = raw.iloc[i, 0], raw.iloc[i, 1]
        if pd.notna(b):
            cur = SCORE_KEY.get(str(b).strip())
        if cur and pd.notna(metric):
            vals = [num(v) for v in raw.iloc[i, 2:2 + len(months)].tolist()]
            out.setdefault(cur, {})[str(metric).strip()] = vals
    note = ""
    for i in range(len(raw)):
        if isinstance(raw.iloc[i, 0], str) and raw.iloc[i, 0].strip().startswith("Note"):
            note = " ".join(str(v) for v in raw.iloc[i, 1:].tolist() if isinstance(v, str)).strip()
    return months, out, note


def build_misc(x):
    sent = [dict(b=r.bk, p=r.platform, pos=int(r.positive), neg=int(r.negative), neu=int(r.neutral))
            for _, r in x["sentiment"].iterrows()]
    tiers = ["pico", "nano", "micro", "mid-tier", "macro", "mega", "elite"]
    aud = []
    for _, r in x["audience_size"].iterrows():
        d = dict(b=r.bk, p=r.platform)
        for t in tiers:
            d[t] = num(r.get(t)) or 0
        d["unlabeled"] = num(r.get("unlabeled_tier", r.get("Unnamed: 9"))) or 0
        aud.append(d)
    cr = []
    for _, r in x["top_creators"].iterrows():
        cr.append(dict(b=r.bk, p=r.platform, by=r.ranked_by, rank=int(r["rank"]),
                       n=str(r.display_name)[:60], posts=num(r.total_posts), e=num(r.total_engagement)))
    return sent, aud, cr, tiers


def build_reconciliation(x, cells):
    rows = []
    for k, c in cells.items():
        rows.append(dict(
            k=k, eng_summary=c["engagement"], eng_msgs=c["msg_eng_sum"],
            posts_summary=c["posts_raw"], rows_msgs=c["msg_rows"]))
    return rows


def main():
    x = load()
    cells = build_cells(x)
    dates, daily = build_daily(x)
    tops = build_top_posts(x)
    monthly = build_monthly(x, dates)
    months, scores, score_note = build_scores()
    sent, aud, cr, tiers = build_misc(x)
    recon = build_reconciliation(x, cells)
    m = x["messages"]
    dup_ids = int(m.message_id.duplicated(keep=False).sum())
    dup_cross = int(m[m.message_id.duplicated(keep=False)].groupby("message_id").bk.nunique().gt(1).sum())
    dup_ids_unique = int(m[m.message_id.duplicated(keep=False)].message_id.nunique())
    data = dict(
        meta=dict(
            export_period=[str(x["summary"]["start"].min())[:10], str(x["summary"]["end"].max())[:10]],
            score_period=[months[0], months[-1]],
            score_note=score_note,
            messages_rows=int(len(m)),
            dup_rows=dup_ids, dup_ids=dup_ids_unique, dup_cross_brand_ids=dup_cross,
            source_export=EXPORT.name, source_score=SCORE.name,
        ),
        brands=[dict(key=b[0], short=b[1], label=b[2]) for b in BRANDS],
        platforms=PLATFORMS,
        cells=cells,
        dates=dates, daily=daily, monthly=monthly,
        top_posts=tops,
        score_months=months, scores=scores,
        sentiment=sent, audience=aud, audience_tiers=tiers, creators=cr,
        recon=recon,
    )
    (HERE / "dashboard_data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # metrics ledger: flat CSV of per-cell metrics + score table
    led = []
    for k, c in cells.items():
        for mname, v in c.items():
            if mname in ("brand", "platform", "scope") or v is None or isinstance(v, str):
                continue
            led.append(dict(brand=c["brand"], platform=c["platform"], scope=c["scope"], metric=mname,
                            value=v, source="summary+messages+daily_trend"))
    for k, vals in monthly["eng"].items():
        bk, pf, sc = k.split("|")
        for mo, v in zip(monthly["months"], vals):
            led.append(dict(brand=bk, platform=pf, scope=sc, metric=f"month_engagement@{mo}", value=v, source="daily_trend"))
    for b, mets in scores.items():
        for mname, vals in mets.items():
            for mo, v in zip(months, vals):
                led.append(dict(brand=b, platform="all", scope="score", metric=f"{mname}@{mo}", value=v,
                                source=SCORE.name))
    pd.DataFrame(led).to_csv(HERE / "metrics_ledger.csv", index=False, encoding="utf-8-sig")

    # assemble single-file HTML (index.html is what Vercel serves; MEDCMU_Dashboard.html is the same file)
    chart = (HERE / "vendor" / "chart.umd.min.js").read_text(encoding="utf-8")
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    tpl = (HERE / "dashboard_template.html").read_text(encoding="utf-8")
    html = tpl.replace("/*__CHARTJS__*/", chart).replace("/*__DATA__*/null", payload)
    for out_name in ("index.html", "MEDCMU_Dashboard.html"):
        (HERE / out_name).write_text(html, encoding="utf-8")
        print(out_name, "bytes", len(html.encode("utf-8")))
    print("cells", len(cells), "daily series", len(daily), "top posts", len(tops), "ledger rows", len(led))


if __name__ == "__main__":
    main()
