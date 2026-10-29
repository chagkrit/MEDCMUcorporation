/* ===== 1 overview (one month, MEDCMU KPIs + sparklines + insights + 4-brand comparison + heatmap + ranking) ===== */
/* sparkline of one MEDCMU metric over every month: no-data months are gaps, partial months are hollow points,
   and a segment is dashed when it touches a partial month or crosses a change of file family (not on the same basis) */
function spark(id, f, sc, mo){
  const el = document.getElementById(id); if (!el) return;
  const vals = D.months.map(m => { if (!hasM(m.mo, sc)) return null; const a = agg(m.mo, "MEDCMU", sc); return a && a[f] != null ? a[f] : null; });
  const part = D.months.map(m => ms(m.mo, sc).status === "partial"), i0 = D.months.findIndex(m => m.mo === mo);
  const col = cv("--b-MEDCMU"), surf = cv("--surface"), hex = /^#[0-9a-f]{6}$/i.test(col);
  const brk = c => part[c.p0DataIndex] || part[c.p1DataIndex] || ms(D.months[c.p0DataIndex].mo, sc).family !== ms(D.months[c.p1DataIndex].mo, sc).family;
  charts[id] = new Chart(el, {type:"line",
    data:{labels:D.months.map(m => moTag(m.mo, sc)), datasets:[{data:vals, borderColor:col, borderWidth:2, tension:.35, spanGaps:false, fill:"origin",
      backgroundColor:c => { const ca = c.chart.chartArea; if (!ca || !hex) return "transparent"; const g = c.chart.ctx.createLinearGradient(0, ca.top, 0, ca.bottom); g.addColorStop(0, col + "55"); g.addColorStop(1, col + "00"); return g; },
      pointRadius:vals.map((v, i) => v == null ? 0 : (i === i0 || part[i]) ? 3.5 : 0), pointHoverRadius:4,
      pointBackgroundColor:vals.map((v, i) => part[i] ? surf : col), pointBorderColor:col, pointBorderWidth:2,
      segment:{borderDash:c => brk(c) ? [4, 3] : undefined}}]},
    options:{responsive:true, maintainAspectRatio:false, animation:false, layout:{padding:{top:5, bottom:3, left:4, right:4}},
      plugins:{legend:{display:false}, tooltip:{displayColors:false, backgroundColor:cv("--surface-2"), titleColor:cv("--text-1"), bodyColor:cv("--text-1"), borderColor:cv("--border"), borderWidth:1,
        callbacks:{label:c => c.parsed.y == null ? NA : (f === "mean" ? fmt1(c.parsed.y) : fmt(c.parsed.y))}}},
      scales:{x:{display:false}, y:{display:false, beginAtZero:true}}, interaction:{mode:"index", intersect:false}}});
}
/* why no month-over-month % is shown (mirrors momOf) */
function momWhy(mo, sc){
  const i = D.months.findIndex(m => m.mo === mo); if (i < 1) return "เป็นเดือนแรกของข้อมูล";
  const pm = D.months[i - 1].mo;
  if (!fullM(mo, sc)) return `${mlabel(mo)} ยังไม่ครบเดือน`;
  if (!fullM(pm, sc)) return `${mlabel(pm)} ไม่ครบเดือนหรือไม่มีข้อมูล`;
  if (ms(mo, sc).family !== ms(pm, sc).family) return "สองเดือนมาจากไฟล์คนละประเภท";
  return "ข้อมูลไม่เพียงพอ";
}
function insights(mo, sc){
  const li = (ic, html, warn) => `<li class="${warn ? "warn" : ""}"><span class="ii">${ICON[ic]}</span><span>${html}</span></li>`, out = [];
  const a = agg(mo, "MEDCMU", sc), scT = sc === "owned" ? "Owned" : "Earned";
  if (ms(mo, sc).status === "partial") out.push(li("alert", `<b>${mlabel(mo)}</b> เป็นข้อมูลบางส่วน (${spanTxt(ms(mo, sc).span)}) ยอดรวมจึงยังเทียบกับเดือนที่ครบเดือนไม่ได้`, true));
  if (!a){ out.push(li("alert", `MEDCMU ไม่มีข้อมูล ${scT} ในเดือนนี้ (${NA})`, true)); return out; }
  const ranked = ALL.map(b => [b, agg(mo, b, sc)]).filter(x => x[1]).sort((x, y) => y[1].eng - x[1].eng), rk = 1 + ranked.findIndex(x => x[0] === "MEDCMU");
  out.push(li("spark", `MEDCMU (${scT}) ${mlabel(mo)}: engagement รวม <b>${fmt(a.eng)}</b> จาก <b>${fmt(a.posts)}</b> โพสต์ที่มีข้อความ · อันดับ <b>#${rk}</b> จาก ${ranked.length} แบรนด์ที่มีข้อมูล`));
  const d = momOf(mo, "MEDCMU", sc, "eng"), i = D.months.findIndex(m => m.mo === mo);
  out.push(d == null ? li("trend", `ไม่แสดง % เทียบเดือนก่อน: ${momWhy(mo, sc)}`)
    : li("trend", `เทียบ ${mlabel(D.months[i - 1].mo)}: engagement ${dHtml(d)} · โพสต์ ${dHtml(momOf(mo, "MEDCMU", sc, "posts"))} · เฉลี่ย/โพสต์ ${dHtml(momOf(mo, "MEDCMU", sc, "mean"))}`));
  const pls = D.platforms.map(p => [p, C(mo, "MEDCMU", p, sc)]).filter(x => x[1]).sort((x, y) => y[1].eng - x[1].eng);
  if (pls.length && a.eng > 0){
    const [tp, tc] = pls[0];
    out.push(li("target", `แพลตฟอร์มที่ engagement สูงสุดของ MEDCMU คือ <b>${PL[tp]}</b> (${fpct(tc.eng / a.eng * 100)} ของ engagement รวม MEDCMU)${tc.top1 != null ? ` · 1 โพสต์บนสุดคิดเป็น ${fpct(tc.top1)} ของ engagement แพลตฟอร์มนี้ (เฉพาะโพสต์ที่มีข้อความ)` : ""}`));
  }
  const bm = ranked.filter(x => x[1].mean != null).sort((x, y) => y[1].mean - x[1].mean);
  if (bm.length && a.mean != null) out.push(li("chart", bm[0][0] === "MEDCMU"
    ? `engagement เฉลี่ยต่อโพสต์ของ MEDCMU <b>${fmt1(a.mean)}</b> สูงสุดใน ${bm.length} แบรนด์`
    : `engagement เฉลี่ยต่อโพสต์ของ MEDCMU <b>${fmt1(a.mean)}</b> · สูงสุดคือ ${esc(bname(bm[0][0]))} <b>${fmt1(bm[0][1].mean)}</b>`));
  return out;
}
const HMM = {eng:{t:"engagement รวม", f:fmt}, posts:{t:"โพสต์ที่มีข้อความ", f:fmt}, mean:{t:"เฉลี่ย/โพสต์", f:fmt1}};
function heatmap(mo, sc, m){
  const vals = ALL.map(b => D.platforms.map(p => { const c = C(mo, b, p, sc); return c && c[m] != null ? c[m] : null; }));
  const mx = D.platforms.map((p, j) => Math.max(0, ...vals.map(r => r[j]).filter(v => v != null)));
  return `<div class="tw"><table class="hm" id="oHm"><thead><tr><th>แบรนด์ \\ แพลตฟอร์ม</th>${D.platforms.map(p => `<th>${PL[p]}</th>`).join("")}</tr></thead><tbody>` +
    ALL.map((b, i) => `<tr><td>${bdot(b)}${esc(bname(b))}</td>${vals[i].map((v, j) => {
      if (v == null) return `<td class="na">${NA}</td>`;
      const t = mx[j] > 0 ? v / mx[j] : 0;
      return `<td style="background:color-mix(in srgb,#14989d ${Math.round(10 + 70 * t)}%,transparent);${t > .55 ? "color:#fff" : ""}">${HMM[m].f(v)}</td>`; }).join("")}</tr>`).join("") + `</tbody></table></div>`;
}
function ranking(mo, sc){
  const pairs = [];
  ALL.forEach(b => D.platforms.forEach(p => { const c = C(mo, b, p, sc); if (c && c.posts >= 5 && c.mean != null) pairs.push({b, p, c}); }));
  pairs.sort((x, y) => y.c.mean - x.c.mean);
  const top = pairs.slice(0, 5), bot = pairs.slice(5).reverse().slice(0, 5), mx = pairs.length ? pairs[0].c.mean : 0;
  const tb = (id, rows) => rows.length ? `<div class="tw"><table class="rk" id="${id}"><thead><tr><th>#</th><th class="l">แบรนด์ · แพลตฟอร์ม</th><th>โพสต์</th><th>engagement รวม</th><th class="l">เฉลี่ย/โพสต์</th></tr></thead><tbody>` +
      rows.map(r => `<tr><td class="rank">${pairs.indexOf(r) + 1}</td><td class="l">${bdot(r.b)}${esc(bname(r.b))} · ${PL[r.p]}</td><td>${fmt(r.c.posts)}</td><td>${fmt(r.c.eng)}</td>
        <td class="l"><span class="rbar" style="width:${mx > 0 ? Math.max(3, Math.round(80 * r.c.mean / mx)) : 3}px"></span>${fmt1(r.c.mean)}</td></tr>`).join("") + `</tbody></table></div>`
    : `<p class="sub">${NA} (ต้องมีคู่แบรนด์ × แพลตฟอร์มที่มีอย่างน้อย 5 โพสต์มากกว่า 5 คู่)</p>`;
  const sub = `engagement เฉลี่ยต่อโพสต์ (เฉพาะโพสต์ที่มีข้อความ) · เฉพาะคู่ที่มีอย่างน้อย 5 โพสต์ · ผู้ชมแต่ละแพลตฟอร์มต่างกัน เทียบข้ามแพลตฟอร์มด้วยความระวัง`;
  return `<div class="grid g2"><figure class="card"><h3 class="rk-h"><span style="color:var(--accent-2)">${ICON.trend.replace("<svg", '<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"')}</span>Top 5 · แบรนด์ × แพลตฟอร์ม</h3><p class="sub">${sub}</p>${tb("oRkT", top)}</figure>
    <figure class="card"><h3 class="rk-h"><span style="color:#d97706">${ICON.alert.replace("<svg", '<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"')}</span>5 อันดับท้าย · แบรนด์ × แพลตฟอร์ม</h3><p class="sub">${sub} · ไม่ซ้ำกับ Top 5</p>${tb("oRkB", bot)}</figure></div>`;
}
function rOverview(p){
  const st = S.overview, mo = st.mo, sc = st.scope, ok = hasM(mo, sc);
  if (!HMM[st.hm]) st.hm = "eng";
  let h = `<div class="controls"><div class="ctl">เดือน ${moSeg("oMo", mo, sc)}</div>
    <div class="ctl">ประเภท ${seg("oSc", [{v:"owned", t:"Owned"}, {v:"earned", t:"Earned"}], sc)}</div></div>
   <p class="note">${sbadge(mo, sc)} <span class="msrc">แหล่งข้อมูล: ${srcOf(mo, sc)}</span> · ${MONOTE} · ลูกศร % เทียบเดือนก่อน แสดงเฉพาะเมื่อทั้งสองเดือนครบเดือนและมาจากไฟล์ประเภทเดียวกัน ·
   <b>Owned</b> = บัญชีทางการของแบรนด์ · <b>Earned</b> = โพสต์ของผู้อื่นที่กล่าวถึงแบรนด์</p>`;
  if (!ok) h += emptyMsg(mo, sc);
  else {
    const a = agg(mo, "MEDCMU", sc);
    const k = (ic, lab, val, f, cap) => `<div class="card kpi2" style="--kc:var(--b-MEDCMU)"><div class="ico">${ICON[ic]}</div><div class="kl">${lab}</div><div class="kv">${val}</div><div class="kcap">${f ? dHtml(momOf(mo, "MEDCMU", sc, f)) + " " : ""}${cap}</div><div class="spk"><canvas id="spk-${f}" role="img" aria-label="แนวโน้มรายเดือน ${esc(lab)}"></canvas></div></div>`;
    const used = D.months.filter(m => hasM(m.mo, sc));
    h += `<div class="grid g4">` +
      k("send", "โพสต์ที่มีข้อความ", a ? fmt(a.posts) : NA, "posts", `MEDCMU · ${sc === "owned" ? "Owned" : "Earned"}`) +
      k("heart", "engagement รวม", a ? fmt(a.eng) : NA, "eng", `${a ? a.np + "/" + D.platforms.length + " แพลตฟอร์ม" : "ทุกแพลตฟอร์ม"} (ใช้ดูภาพรวมเท่านั้น)`) +
      k("chart", "ยอดดู", a ? fmt(a.views) : NA, "views", `เฉพาะ IG + TikTok + YouTube${a && a.views != null ? " (" + a.nv + "/" + VIEW_PL.length + ")" : ""}`) +
      k("trend", "engagement เฉลี่ยต่อโพสต์", a ? fmt1(a.mean) : NA, "mean", "เฉพาะโพสต์ที่มีข้อความ") + `</div>
      <p class="hnote">เส้นในการ์ด = MEDCMU ${used.length ? mlabel(used[0].mo) + " – " + mlabel(used[used.length - 1].mo) : ""} (${sc === "owned" ? "Owned" : "Earned"}) · จุดทึบ = เดือนที่เลือก · จุดกลวง/เส้นประ = ข้อมูลบางส่วน หรือเปลี่ยนประเภทไฟล์ (ใช้ดูทิศทาง ไม่ใช่เทียบตัวเลข) · เดือนที่ไม่มีข้อมูลเว้นว่าง</p>
      <div class="g21">${card("cOv", `engagement แยกตามแพลตฟอร์ม · ${mlabel(mo)}`, "เทียบภายในแพลตฟอร์มเดียวกันเท่านั้น", true)}
        <figure class="card ins"><h3>${ICON.spark}Key Insights อัตโนมัติ</h3><p class="sub">คำนวณจากข้อมูลเดือนที่เลือกทุกครั้งที่เปิดหน้า · ${sc === "owned" ? "Owned" : "Earned"}</p><ul>${insights(mo, sc).join("")}</ul></figure></div>
      <h2>เทียบแบรนด์ · ${mlabel(mo)}</h2><div class="grid g4">` + ALL.map(b => {
        const x = agg(mo, b, sc);
        if (!x) return `<div class="card kpi" style="--kc:${bcol(b)}"><div class="name">${esc(brLabel(b))}</div><div class="big" style="font-size:16px">${NA}</div></div>`;
        const rk = 1 + ALL.filter(o => (agg(mo, o, sc) || {eng:-1}).eng > x.eng).length;
        return `<div class="card kpi" style="--kc:${bcol(b)}"><div class="name">${esc(brLabel(b))}</div><div class="big">${fmt(x.eng)}</div>
          <dl><dt>engagement รวม</dt><dd>${dHtml(momOf(mo, b, sc, "eng"))}</dd><dt>แพลตฟอร์มที่มีข้อมูล</dt><dd>${x.np}/${D.platforms.length}</dd><dt>อันดับจาก 4 แบรนด์</dt><dd>#${rk}</dd>
          <dt>โพสต์ที่มีข้อความ</dt><dd>${fmt(x.posts)}</dd><dt>เฉลี่ย/โพสต์</dt><dd>${fmt1(x.mean)}</dd>
          <dt>ยอดดู (IG+TikTok+YouTube)</dt><dd>${fmt(x.views)}${x.views != null && x.nv < VIEW_PL.length ? ` <span class="msrc">(${x.nv}/${VIEW_PL.length})</span>` : ""}</dd></dl></div>`; }).join("") + `</div>
      <h2>Heatmap · แบรนด์ × แพลตฟอร์ม · ${mlabel(mo)}</h2>
      <figure class="card"><figcaption><div><h3>${HMM[st.hm].t}</h3><p class="sub">สีเข้ม = ค่าสูงสุดในแพลตฟอร์มเดียวกัน (เทียบภายในคอลัมน์เท่านั้น) · ช่องลายเส้น = ${NA}</p></div>
        ${seg("oHmM", Object.keys(HMM).map(v => ({v, t:HMM[v].t})), st.hm)}</figcaption>${heatmap(mo, sc, st.hm)}</figure>
      <h2>อันดับ engagement เฉลี่ยต่อโพสต์ · ${mlabel(mo)}</h2>${ranking(mo, sc)}`;
  }
  p.innerHTML = h; bindTables(p);
  bindSeg("oMo", v => { st.mo = v; render(); }); bindSeg("oSc", v => { st.scope = v; render(); }); bindSeg("oHmM", v => { st.hm = v; render(); });
  if (!ok) return;
  ["posts", "eng", "views", "mean"].forEach(f => spark("spk-" + f, f, sc, mo));
  const narrow = window.innerWidth < 600, SHORT = {facebook:"FB", instagram:"IG", tiktok:"TikTok", youtube:"YT", twitter:"X"};   /* every platform label must stay visible */
  mk("cOv", "bar", {labels:D.platforms.map(x => narrow ? SHORT[x] : PL[x]), datasets:BK.map(b => ({label:bname(b), data:D.platforms.map(pl => (C(mo, b, pl, sc) || {}).eng ?? null),
      backgroundColor:bcol(b), borderRadius:6, borderSkipped:false, borderColor:"transparent", borderWidth:2, maxBarThickness:34}))},
    {scales:{x:{ticks:{autoSkip:false}}, y:{ticks:{callback:v => abbr(v)}}}}, fmt);
}
RENDER.overview = rOverview;
