"""Source resolution, month status and aggregation for the monthly dashboard."""
import calendar
import re
from datetime import date, timedelta

import numpy as np
import pandas as pd


def month_bounds(mo):
    y, m = map(int, mo.split("-"))
    return f"{mo}-01", f"{mo}-{calendar.monthrange(y, m)[1]:02d}"


def file_table(posts):
    return (posts.groupby("src_file")
            .agg(family=("family", "first"), scope=("scope", "first"), generated_at=("generated_at", "first"),
                 tf_start=("tf_start", "first"), tf_end=("tf_end", "first"))
            .reset_index())


def choose_sources(posts):
    """Per (month, scope) pick the file with the newest Generated At among files that hold rows there.
    Ties break on file name so the result is deterministic."""
    gen = posts.groupby("src_file").generated_at.first().to_dict()
    chosen, cands = {}, {}
    for (mo, sc), g in posts.groupby(["month", "scope"]):
        files = sorted(g.src_file.unique(), key=lambda f: (gen[f], f), reverse=True)
        chosen[(mo, sc)] = files[0]
        cands[(mo, sc)] = files
    return chosen, cands


def month_range(posts):
    return [str(p) for p in pd.period_range(posts.month.min(), posts.month.max(), freq="M")]


def month_info(posts, chosen, months):
    ft = file_table(posts).set_index("src_file")
    info = {}
    for mo in months:
        d0, d1 = month_bounds(mo)
        row = {"mo": mo}
        for sc in ("owned", "earned"):
            f = chosen.get((mo, sc))
            if f is None:
                row[sc] = {"status": "nodata", "src": None, "family": None, "span": None}
                continue
            t = ft.loc[f]
            # an export generated on day G cannot contain a complete day G, so cap the span end at G-1
            gen_prev = (date.fromisoformat(t.generated_at[:10]) - timedelta(days=1)).isoformat()
            a, b = max(t.tf_start, d0), min(t.tf_end, gen_prev, d1)
            row[sc] = {"status": "complete" if (a == d0 and b == d1) else "partial",
                       "src": f, "family": t.family, "span": [a, b]}
        info[mo] = row
    return info


def select_rows(posts, chosen):
    """Keep only rows from the winning file of their (month, scope); drop exact duplicates
    (same brand, platform, scope, url, date, engagement - url required)."""
    keep = [chosen.get((m, s)) == f for m, s, f in zip(posts.month, posts.scope, posts.src_file)]
    sel = posts[keep].copy()
    has_url = sel.url.notna()
    dup = sel[has_url].duplicated(["brand", "platform", "scope", "url", "date", "engagement"], keep="first")
    drop_idx = dup[dup].index
    return sel.drop(index=drop_idx), int(len(drop_idx))


def _sum_or_none(series):
    return None if series.notna().sum() == 0 else float(series.sum())


def aggregate(sel):
    cells = {}
    for (mo, b, p, s), g in sel.groupby(["month", "brand", "platform", "scope"]):
        t = g[g.text.notna()]
        eng = g.engagement.fillna(0)
        tot = float(eng.sum())
        tt = t.engagement.fillna(0).sort_values(ascending=False)   # concentration is over text-bearing posts: same population as the top-posts list
        tot_t = float(tt.sum())
        cells[f"{mo}|{b}|{p}|{s}"] = dict(
            rows=int(len(g)), posts=int(len(t)), blank=int(len(g) - len(t)), eng=tot,
            views=_sum_or_none(g.views), comment=_sum_or_none(g.comment), share=_sum_or_none(g.share),
            mean=None if t.empty else round(float(t.engagement.fillna(0).mean()), 2),
            median=None if t.empty else round(float(t.engagement.fillna(0).median()), 2),
            top1=round(float(tt.iloc[0] / tot_t * 100), 1) if tot_t > 0 else None,
            top3=round(float(tt.iloc[:3].sum() / tot_t * 100), 1) if tot_t > 0 else None)
    return cells


def build_daily(sel, info, dates):
    idx = {d: i for i, d in enumerate(dates)}
    out = {}
    for sc in ("owned", "earned"):
        cov = set()
        for row in info.values():
            sp = row[sc]["span"]
            if sp:
                cov.update(d for d in dates if sp[0] <= d <= sp[1])
        for (b, p), g in sel[sel.scope == sc].groupby(["brand", "platform"]):
            eng = [0 if d in cov else None for d in dates]
            posts = [0 if d in cov else None for d in dates]
            for d, v in g.groupby("date").engagement.sum().items():
                if d in idx and eng[idx[d]] is not None:
                    eng[idx[d]] = float(v)
            for d, n in g[g.text.notna()].groupby("date").size().items():
                if d in idx and posts[idx[d]] is not None:
                    posts[idx[d]] = int(n)
            out[f"{b}|{p}|{sc}"] = dict(eng=eng, posts=posts)
    return out


def build_top(sel, n=10):
    rows = []
    t = sel[sel.text.notna()]
    for (mo, b, p, s), g in t.groupby(["month", "brand", "platform", "scope"]):
        for r in g.sort_values("engagement", ascending=False).head(n).itertuples():
            txt = re.sub(r"\s+", " ", r.text).strip()
            rows.append(dict(
                m=mo, b=b, p=p, s=s, t=r.date, e=0 if pd.isna(r.engagement) else int(r.engagement),
                v=None if pd.isna(r.views) else int(r.views),
                x=txt[:240] + ("…" if len(txt) > 240 else ""), u=r.url, a=(r.author or "")[:60] or None))
    return rows


def build_authors(sel, n=10):
    rows = []
    e = sel[(sel.scope == "earned") & sel.author.notna()]
    for (mo, b, p), g in e.groupby(["month", "brand", "platform"]):
        a = (g.groupby("author").agg(posts=("text", "count"), e=("engagement", "sum"))
             .sort_values("e", ascending=False).head(n))
        for name, r in a.iterrows():
            rows.append(dict(m=mo, b=b, p=p, n=name[:60], posts=int(r.posts), e=float(r.e)))
    return rows


def _key(date, text):
    return date + "|" + re.sub(r"\s+", "", text.lower())[:80]


def overlap_report(posts, chosen, cands):
    fam = posts.groupby("src_file").family.first().to_dict()
    rows = []
    for (mo, sc), files in cands.items():
        if len(files) < 2:
            continue
        win = files[0]
        win_all = posts[(posts.month == mo) & (posts.scope == sc) & (posts.src_file == win)]
        for other in files[1:]:
            b_all = posts[(posts.month == mo) & (posts.scope == sc) & (posts.src_file == other)]
            # compare only the days both files cover (the older export may start mid-month); otherwise the % is a coverage artefact
            d0, d1 = b_all.date.min(), b_all.date.max()
            a_all = win_all[(win_all.date >= d0) & (win_all.date <= d1)]
            combos = set(zip(a_all.brand, a_all.platform)) | set(zip(b_all.brand, b_all.platform))
            for br, pf in sorted(combos):
                ga = a_all[(a_all.brand == br) & (a_all.platform == pf)]
                gb = b_all[(b_all.brand == br) & (b_all.platform == pf)]
                ta, tb = ga[ga.text.notna()], gb[gb.text.notna()]
                ka = {_key(d, t) for d, t in zip(ta.date, ta.text)}
                kb = {_key(d, t) for d, t in zip(tb.date, tb.text)}
                rows.append(dict(
                    month=mo, scope=sc, brand=br, platform=pf, window=f"{d0}→{d1}", winner=win, winner_family=fam[win], other=other,
                    other_family=fam[other], win_rows=int(len(ga)), win_text=int(len(ta)), other_rows=int(len(gb)),
                    other_text=int(len(tb)), matched=int(len(ka & kb)),
                    win_eng=float(ga.engagement.fillna(0).sum()), other_eng=float(gb.engagement.fillna(0).sum())))
    cols = ["month", "scope", "brand", "platform", "window", "winner", "winner_family", "other", "other_family", "win_rows",
            "win_text", "other_rows", "other_text", "matched", "win_eng", "other_eng"]
    return pd.DataFrame(rows, columns=cols)
