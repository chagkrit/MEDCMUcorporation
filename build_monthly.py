#!/usr/bin/env python3
"""Build the monthly dashboard from the Brand Scan exports in ../ZocialEye.

Pipeline: xlsx -> monthly_load -> monthly_agg -> monthly_data.json + monthly_ledger.csv
          + monthly_overlap_report.csv -> inline into monthly_parts/*  (+ vendored Chart.js) -> index.html
Every number the page shows comes from monthly_data.json; the ledger is the flat audit copy.
"""
import json
import os
from pathlib import Path

import pandas as pd

import monthly_agg as A
import monthly_load as L

HERE = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("MEDCMU_ZE_DIR", HERE.parent / "ZocialEye"))


def to_payload(obj):
    """JSON for inlining in a <script>: strict (no NaN) and with '</' escaped."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"), allow_nan=False).replace("</", "<\\/")


def build_data(data_dir):
    posts = L.load_all(data_dir)
    chosen, cands = A.choose_sources(posts)
    months = A.month_range(posts)
    info = A.month_info(posts, chosen, months)
    sel, dropped = A.select_rows(posts, chosen)
    cells = A.aggregate(sel)
    dates = pd.date_range(f"{months[0]}-01", sel.date.max()).strftime("%Y-%m-%d").tolist()
    ov = A.overlap_report(posts, chosen, cands)
    files = A.file_table(posts)
    rows_by_file = posts.groupby("src_file").size()
    data = dict(
        meta=dict(
            sources=[dict(file=r.src_file, family=r.family, scope=r.scope, generated_at=r.generated_at,
                          tf=[r.tf_start, r.tf_end], rows=int(rows_by_file[r.src_file])) for r in files.itertuples()],
            dup_dropped=dropped, rows_used=int(len(sel)),
            derived=[dict(file=f, platform="youtube", rows=int(n)) for f, n in
                     posts[posts.eng_derived.fillna(False).astype(bool)].groupby("src_file").size().items()]),
        brands=[dict(key=b[0], short=b[1], label=b[2]) for b in L.BRANDS],
        platforms=L.PLATFORMS,
        months=[info[m] for m in months],
        cells=cells, dates=dates, daily=A.build_daily(sel, info, dates),
        top=A.build_top(sel), authors=A.build_authors(sel),
        quality=dict(overlap=ov.to_dict("records")))
    led = []
    for k, c in cells.items():
        mo, b, p, s = k.split("|")
        for metric, v in c.items():
            if v is not None:
                led.append(dict(month=mo, brand=b, platform=p, scope=s, metric=metric, value=v, source=info[mo][s]["src"]))
    return data, pd.DataFrame(led), ov


def assemble_html(data):
    parts = sorted((HERE / "monthly_parts").glob("*"))
    if not parts:
        raise FileNotFoundError("monthly_parts/ is empty")
    tpl = "".join(p.read_text(encoding="utf-8") for p in parts)
    chart = (HERE / "vendor" / "chart.umd.min.js").read_text(encoding="utf-8")
    return tpl.replace("/*__CHARTJS__*/", chart).replace("/*__DATA__*/null", to_payload(data))


def main():
    data, ledger, ov = build_data(DATA_DIR)
    (HERE / "monthly_data.json").write_text(to_payload(data), encoding="utf-8")
    ledger.to_csv(HERE / "monthly_ledger.csv", index=False, encoding="utf-8-sig")
    ov.to_csv(HERE / "monthly_overlap_report.csv", index=False, encoding="utf-8-sig")
    print("months", [(m["mo"], m["owned"]["status"], m["earned"]["status"]) for m in data["months"]])
    print("cells", len(data["cells"]), "ledger rows", len(ledger), "overlap rows", len(ov), "dup dropped", data["meta"]["dup_dropped"])
    if list((HERE / "monthly_parts").glob("*")):
        html = assemble_html(data)
        for name in ("index.html", "MEDCMU_Dashboard.html"):
            (HERE / name).write_text(html, encoding="utf-8")
            print(name, "bytes", len(html.encode("utf-8")))


if __name__ == "__main__":
    main()
