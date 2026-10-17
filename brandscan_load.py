"""Load the Brand Scan score + sentiment pulled through the Zocial Eye MCP (saved by hand-off into ../ZocialEye/mcp_brand_scan_*).

These are API aggregates, not post rows, so they never mix with the xlsx-derived cells in monthly_agg:
  brand_score_timeline.csv           brand, month, brand_score, owned_score, earned_score, sentiment_score
  brand_score_platform_monthly.csv   per-platform own/earn score for every month (+ the API's *average* growth rate, not MoM)
  brand_score_*.json                 latest-month growth % (month-over-month, checked against the timeline)
  sentiment_earned_by_platform.csv   earned posts by sentiment label per brand x platform x period
Every consistency rule below raises ValueError (never silently passes): a wrong or incomplete save must stop the build.
"""
import csv
import json
from pathlib import Path

BRANDS = ["MEDCMU", "SI", "CU", "SMV"]
PLATFORMS = ["facebook", "instagram", "tiktok", "youtube", "twitter"]
OWN_W = (0.261, 0.101, 0.170, 0.231, 0.237)   # facebook, twitter, instagram, youtube, tiktok (order of PLAT_ORDER)
PLAT_ORDER = ["facebook", "twitter", "instagram", "youtube", "tiktok"]
HEAD_TOL = 1.0   # headline vs platform-derived: both sides are rounded integers
GROWTH_TOL = 0.05   # percentage points: API growth is computed from unrounded scores, ours from the rounded integers/1-dp values


def find_dir(data_dir):
    """Newest mcp_brand_scan_* folder (named by pull date), or None."""
    cands = sorted(p for p in Path(data_dir).glob("mcp_brand_scan_*") if p.is_dir())
    return cands[-1] if cands else None


def _read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def load_brandscan(data_dir):
    d = find_dir(data_dir)
    if d is None:
        return None
    tl = _read_csv(d / "brand_score_timeline.csv")
    sr = _read_csv(d / "sentiment_earned_by_platform.csv")
    js = json.loads(next(d.glob("brand_score_*.json")).read_text(encoding="utf-8"))

    # ---- Brand Score timeline ----
    vals = {b: {} for b in BRANDS}
    for r in tl:
        b, mo = r["brand"], r["month"]
        if b not in vals:
            raise ValueError(f"brand_score_timeline.csv: unknown brand {b!r}")
        if mo in vals[b]:
            raise ValueError(f"brand_score_timeline.csv: duplicate {b} {mo}")
        vals[b][mo] = [int(r["brand_score"]), int(r["owned_score"]), int(r["earned_score"]), float(r["sentiment_score"])]
    months = sorted(vals["MEDCMU"])
    for b in BRANDS:
        if sorted(vals[b]) != months:
            raise ValueError(f"brand_score_timeline.csv: {b} months differ from MEDCMU")
    if len(months) < 2:
        raise ValueError("brand_score_timeline.csv: need at least 2 months")
    latest, prev = months[-1], months[-2]

    growth = {b: [js["brands"][b]["sep_growth_pct"][k] for k in ("score", "own", "earn", "sentiment")] for b in BRANDS}
    for b in BRANDS:
        for i, name in enumerate(("score", "own", "earn", "sentiment")):
            a, c = vals[b][prev][i], vals[b][latest][i]
            calc = (c - a) / a * 100
            if abs(calc - growth[b][i]) > GROWTH_TOL:
                raise ValueError(f"growth identity fails: {b} {name} {prev}->{latest} computed {calc:.3f} vs API {growth[b][i]}")

    # ---- per-platform scores, every month ----
    plat = {b: {} for b in BRANDS}
    for r in _read_csv(d / "brand_score_platform_monthly.csv"):
        b, mo, p = r["brand"], r["month"], r["platform"]
        if b not in plat or mo not in vals[b] or p not in PLATFORMS:
            raise ValueError(f"brand_score_platform_monthly.csv: unknown brand/month/platform {b!r}/{mo!r}/{p!r}")
        if p in plat[b].setdefault(mo, {}):
            raise ValueError(f"brand_score_platform_monthly.csv: duplicate {b} {mo} {p}")
        first = mo == months[0]   # the API reports 0 growth for the first month = no previous month
        plat[b][mo][p] = [int(r["own_score"]), int(r["earn_score"]),
                          None if first else float(r["own_avg_growth_pct"]), None if first else float(r["earn_avg_growth_pct"])]
    for b in BRANDS:
        if sorted(plat[b]) != months or any(sorted(plat[b][m]) != sorted(PLATFORMS) for m in months):
            raise ValueError(f"brand_score_platform_monthly.csv: {b} must have all 5 platforms for every month")
        for i, m in enumerate(months):
            v = [plat[b][m][p] for p in PLAT_ORDER]
            # relationships seen on every brand-month when pulled (2026-10-17): headline earn = plain mean of the 5 platform
            # earn scores; headline own = weighted mean. They catch typing errors in the saved files; if the API changes them, inspect.
            if abs(sum(x[1] for x in v) / 5 - vals[b][m][2]) > HEAD_TOL:
                raise ValueError(f"platform earn scores do not average to the headline earn score: {b} {m}")
            if abs(sum(w * x[0] for w, x in zip(OWN_W, v)) - vals[b][m][1]) > HEAD_TOL:
                raise ValueError(f"platform own scores do not match the headline own score: {b} {m}")

    # ---- sentiment ----
    periods = sorted({(r["period_start"], r["period_end"]) for r in sr})
    pidx = {p: i for i, p in enumerate(periods)}
    rows, seen = [], set()
    for r in sr:
        b, p = r["brand"], r["platform"]
        if b not in BRANDS or p not in PLATFORMS:
            raise ValueError(f"sentiment_earned_by_platform.csv: unknown brand/platform {b!r}/{p!r}")
        pos, neu, neg, tot = (int(r[k]) for k in ("positive", "neutral", "negative", "total"))
        if pos + neu + neg != tot:
            raise ValueError(f"sentiment counts do not sum to total: {b} {p} {r['period_start']} {pos}+{neu}+{neg}!={tot}")
        key = (b, p, r["period_start"])
        if key in seen:
            raise ValueError(f"sentiment_earned_by_platform.csv: duplicate {key}")
        seen.add(key)
        rows.append([b, p, pidx[(r["period_start"], r["period_end"])], pos, neu, neg, tot])
    expected = len(BRANDS) * len(PLATFORMS) * len(periods)
    if len(rows) != expected:
        raise ValueError(f"sentiment_earned_by_platform.csv: {len(rows)} rows, expected {expected} (brand x platform x period)")

    return dict(
        folder=d.name, pulled=js.get("pulled"),
        score=dict(months=months, vals=vals, latest=latest, prev=prev, growth=growth, platform=plat),
        sent=dict(periods=[dict(start=s, end=e) for s, e in periods], rows=rows))


def ledger_rows(bs):
    """Flat audit copy (brandscan_ledger.csv): one row per number the Brand Scan tab can show."""
    out = []
    names = ("brand_score", "owned_score", "earned_score", "sentiment_score")
    for b, per in bs["score"]["vals"].items():
        for mo, v in per.items():
            for n, x in zip(names, v):
                out.append(dict(kind="score", brand=b, platform="", period=mo, metric=n, value=x))
    for b, per in bs["score"]["platform"].items():
        for mo, pl in per.items():
            for p, v in pl.items():
                for n, x in zip(("own_score", "earn_score"), v[:2]):
                    out.append(dict(kind="score_platform", brand=b, platform=p, period=mo, metric=n, value=x))
    for b, p, i, pos, neu, neg, tot in bs["sent"]["rows"]:
        per = bs["sent"]["periods"][i]
        label = f"{per['start']}..{per['end']}"
        for n, x in (("positive", pos), ("neutral", neu), ("negative", neg), ("total", tot)):
            out.append(dict(kind="sentiment", brand=b, platform=p, period=label, metric=n, value=x))
    return out
