/* ===== 8 Brand Scan (Brand Score + earned sentiment, pulled through the Zocial Eye MCP; separate source from the post files) ===== */
const SMALL_N = 30;                                   /* below this many earned posts a % is shown but flagged as unstable */
const SC_METRICS = [{v:"0", t:"Brand Score"}, {v:"1", t:"Owned Score"}, {v:"2", t:"Earned Score"}, {v:"3", t:"Sentiment Score"}];
const SC_NAME = ["Brand Score", "Owned Score", "Earned Score", "Sentiment Score"];
const perLabel = pr => spanTxt([pr.start, pr.end]);
const perOpts = () => BS.sent.periods.map((pr, i) => ({v:String(i), t:perLabel(pr) + (partialPer(pr) ? "*" : "")}));
/* a period is partial when it is not a whole calendar month (Jul starts at the 92-day retention floor, Oct ends at the export date) */
function partialPer(pr){
  const [y, m] = pr.start.split("-").map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return pr.start.slice(8) !== "01" || +pr.end.slice(8) !== last;
}
const nextMo = mo => { const [y, m] = mo.split("-").map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`; };
/* earned-post sentiment counts for one brand, one period, one platform ("all" = sum of the five) -> {pos, neu, neg, n} */
function sentOf(b, pi, pl){
  const rs = BS.sent.rows.filter(r => r[0] === b && r[2] === pi && (pl === "all" || r[1] === pl));
  return {pos:sum(rs.map(r => r[3])), neu:sum(rs.map(r => r[4])), neg:sum(rs.map(r => r[5])), n:sum(rs.map(r => r[6]))};
}
const spct = (x, f) => x.n ? x[f] / x.n * 100 : null;      /* n = 0 -> null (not 0 %) */
const nTag = n => n < SMALL_N ? ` <span class="msrc" title="ตัวอย่างน้อยกว่า ${SMALL_N} โพสต์ สัดส่วนผันผวนมาก ใช้ดูทิศทางเท่านั้น">⚠ n น้อย</span>` : "";

function rBrandScan(p){
  const st = S.brandscan, sc = BS.score, lt = sc.latest, pv = sc.prev, mi = +st.metric, pi = +st.per, pl = st.plat, scope = st.pscope, pmo = sc.months.includes(st.pmo) ? st.pmo : lt;
  const plats = D.platforms, per = BS.sent.periods[pi];
  const rise = {up:0, n:0}; ALL.forEach(b => sc.months.slice(1).forEach((m, i) => { rise.n++; if (sc.vals[b][m][0] > sc.vals[b][sc.months[i]][0]) rise.up++; }));
  /* next month has no official score yet: when a forecast exists it is drawn dashed/hollow and every label says คาดการณ์ (owner request 2026-11-01);
     sentiment score is never forecast. The forecast is replaced once Brand Scan publishes the month. */
  const fc = sc.forecast && sc.forecast.month === nextMo(lt) ? sc.forecast : null, FCL = "คาดการณ์";
  const moLabels = sc.months.map(mlabel).concat([mlabel(nextMo(lt)) + (fc && mi !== 3 ? ` (${FCL})` : "")]);
  let h = `<p class="note"><b>แหล่งข้อมูลของแท็บนี้แยกจากไฟล์โพสต์:</b> ดึงผ่าน Zocial Eye MCP เมื่อ ${esc(BS.pulled || "–")} (โฟลเดอร์ <code>${esc(BS.folder)}</code>) ·
    <b>Brand Score</b> = คะแนนรายเดือนที่ Brand Scan คำนวณ (${mlabel(sc.months[0])} – ${mlabel(lt)}; ${mlabel(nextMo(lt))} ยังไม่เผยแพร่${fc ? ` — แสดง <b>ค่าคาดการณ์</b> (เส้นประ/จุดกลวง) จะแทนด้วยค่าทางการเมื่อ Brand Scan เผยแพร่` : " จึงเป็นช่องว่าง"}) ·
    <b>สูตรคะแนนไม่ได้เปิดเผย</b> และ Brand Score เพิ่มขึ้นในเดือนถัดไป ${rise.up} จาก ${rise.n} ครั้ง (แบรนด์ × เดือน) จึงเทียบ <b>ระหว่างแบรนด์ในเดือนเดียวกัน</b> ไม่ควรอ่านการเพิ่มรายเดือนเป็นผลงาน ·
    <b>Sentiment Score</b> (ดัชนีใน Brand Score) <b>ไม่ใช่</b> สัดส่วนบวก/กลาง/ลบด้านล่าง</p>
   <h2>Brand Score · ${mlabel(lt)}</h2><div class="grid g4">` + ALL.map(b => {
      const v = sc.vals[b][lt], g = sc.growth[b], rk = 1 + ALL.filter(o => sc.vals[o][lt][0] > v[0]).length;
      const gh = x => x == null ? NA : `<span class="dl">${x >= 0 ? "▲ +" : "▼ −"}${fpct(Math.abs(x))}</span>`;
      return `<div class="card kpi" style="--kc:${bcol(b)}"><div class="name">${esc(brLabel(b))}</div><div class="big">${fmt(v[0])}</div>
        <dl><dt>เทียบ ${mlabel(pv)}</dt><dd>${gh(g[0])}</dd><dt>อันดับจาก 4 แบรนด์</dt><dd>#${rk}</dd><dt>Owned Score</dt><dd>${fmt(v[1])} ${gh(g[1])}</dd>
        <dt>Earned Score</dt><dd>${fmt(v[2])} ${gh(g[2])}</dd><dt>Sentiment Score</dt><dd>${fmt1(v[3])} ${gh(g[3])}</dd></dl></div>`; }).join("") + `</div>
   ${fc ? fcBlock(fc) : ""}
   <h2>แนวโน้มคะแนนรายเดือน</h2>
   <div class="controls"><div class="ctl">ตัวชี้วัด ${seg("bMe", SC_METRICS, st.metric)}</div></div>
   <div class="grid g1">${card("cBs1", SC_NAME[mi] + " · รายเดือน", `${mlabel(sc.months[0])} – ${mlabel(lt)} · ${mlabel(nextMo(lt))} ยังไม่เผยแพร่${fc && mi !== 3 ? ` (เส้นประ = ${FCL} ไม่ใช่ค่าทางการ)` : ""}`, true)}</div>
   <h2>คะแนนแยกแพลตฟอร์ม · ${mlabel(pmo)}</h2>
   <div class="controls"><div class="ctl">เดือน ${seg("bPm", sc.months.map(m => ({v:m, t:mlabel(m)})), pmo)}</div><div class="ctl">ประเภท ${seg("bPs", [{v:"own", t:"Owned"}, {v:"earn", t:"Earned"}], scope)}</div></div>
   <p class="note">ในวงเล็บ = <b>อัตราเติบโตเฉลี่ย</b> ที่ Brand Scan รายงาน (นิยามไม่เปิดเผย <b>ไม่เท่ากับ</b> การเปลี่ยนจากเดือนก่อน; เดือนแรกไม่มี) · คะแนน Earned รวมของแบรนด์ = ค่าเฉลี่ยของ 5 แพลตฟอร์ม · เทียบระหว่างแบรนด์ในเดือนเดียวกัน</p>
   <div class="grid g1">${card("cBs2", "คะแนน " + (scope === "own" ? "Owned" : "Earned") + " ต่อแพลตฟอร์ม", mlabel(pmo))}</div>
   <div class="card"><div class="tw"><table id="bPt"></table></div></div>
   <h2>Sentiment ของโพสต์ Earned (บวก / กลาง / ลบ)</h2>
   <div class="controls"><div class="ctl">ช่วง ${seg("bPer", perOpts(), st.per)}</div><div class="ctl">แพลตฟอร์ม ${seg("bPl", platOpts(true), pl)}</div></div>
   <p class="note warn"><b>อ่านก่อนใช้:</b> นับเฉพาะโพสต์ Earned (ผู้อื่นพูดถึงแบรนด์) ไม่ใช่โพสต์ของแบรนด์เอง · Brand Scan เก็บย้อนหลังได้ราว 92 วัน จึงเริ่ม ${spanTxt([BS.sent.periods[0].start, BS.sent.periods[0].end])} (ก่อนหน้านั้นดึงไม่ได้) ·
    ช่วงที่ติด * ไม่ใช่เดือนเต็ม · ต้องดู <b>n</b> ทุกครั้ง: ต่ำกว่า ${SMALL_N} โพสต์ติดป้าย ⚠ และ n = 0 แสดง “ไม่มีข้อมูล” (ไม่ใช่ 0%) · ป้ายบวก/กลาง/ลบเป็นผลของระบบอัตโนมัติ ไม่ได้ตรวจด้วยคน</p>
   <div class="grid g2">${card("cBs3", "สัดส่วน sentiment · " + perLabel(per), pl === "all" ? "ทุกแพลตฟอร์มรวมกัน" : PL[pl])}${card("cBs4", "แนวโน้มสัดส่วน", "เลือกประเภทด้านล่าง · ช่องว่าง = ไม่มีโพสต์ในช่วงนั้น")}</div>
   <div class="controls" style="margin-top:12px"><div class="ctl">แนวโน้ม ${seg("bSm", [{v:"pos", t:"% บวก"}, {v:"neg", t:"% ลบ"}], st.sm)}</div></div>
   <div class="card"><div class="tw"><table id="bSt"></table></div></div>`;
  p.innerHTML = h; bindTables(p);
  bindSeg("bMe", v => { st.metric = v; render(); }); bindSeg("bPm", v => { st.pmo = v; render(); }); bindSeg("bPs", v => { st.pscope = v; render(); });
  bindSeg("bPer", v => { st.per = v; render(); }); bindSeg("bPl", v => { st.plat = v; render(); }); bindSeg("bSm", v => { st.sm = v; render(); });
  /* score timeline: the unpublished next month is an empty slot */
  const mm = mi === 3 ? fmt1 : fmt;
  const nOff = sc.months.length;                                 /* index of the forecast slot */
  mk("cBs1", "line", {labels:moLabels, datasets:BK.map(b => ({label:bname(b), data:sc.months.map(m => sc.vals[b][m][mi]).concat([fc && mi !== 3 ? fc.vals[b].mid[mi] : null]), borderColor:bcol(b), backgroundColor:bcol(b),
      borderWidth:2, pointRadius:4, pointHoverRadius:6, pointBorderColor:sc.months.map(() => cv("--surface")).concat([bcol(b)]),
      pointBackgroundColor:sc.months.map(() => bcol(b)).concat([cv("--surface")]), pointBorderWidth:2, tension:.25, spanGaps:false,
      segment:{borderDash:ctx => ctx.p1DataIndex === nOff ? [6, 5] : undefined}}))},
    {layout:{padding:{right:64}}, plugins:{endl:{on:true}}, scales:{y:{beginAtZero:mi !== 3, ticks:{callback:v => mi === 3 ? fmt1(v) : abbr(v)}}}}, mm);
  /* per-platform scores (latest month) */
  const ix = scope === "own" ? 0 : 1, gx = scope === "own" ? 2 : 3;
  mk("cBs2", "bar", {labels:plats.map(x => window.innerWidth < 600 ? {facebook:"FB", instagram:"IG", tiktok:"TikTok", youtube:"YT", twitter:"X"}[x] : PL[x]), datasets:BK.map(b => ({label:bname(b), data:plats.map(x => sc.platform[b][pmo][x][ix]), backgroundColor:bcol(b), borderRadius:4, borderSkipped:false,
      borderColor:cv("--surface"), borderWidth:2, maxBarThickness:34}))}, {scales:{x:{ticks:{autoSkip:false}}}, plugins:{vl:{on:true, fmt:fmt}}}, fmt);
  $("#bPt").innerHTML = `<thead><tr><th>แบรนด์</th>${plats.map(x => `<th>${PL[x]}</th>`).join("")}</tr></thead><tbody>${BK.map(b => `<tr><td>${bdot(b)}${bname(b)}</td>${plats.map(x => {
    const v = sc.platform[b][pmo][x], g = v[gx]; return `<td>${fmt(v[ix])} ${g == null ? `<span class="msrc">(–)</span>` : `<span class="msrc">(${g >= 0 ? "+" : "−"}${fpct(Math.abs(g))})</span>`}</td>`; }).join("")}</tr>`).join("")}</tbody>`;
  /* sentiment: stacked 100 % per brand, n in the label */
  const xs = BK.map(b => sentOf(b, pi, pl)), lab = BK.map((b, i) => `${bname(b)} (n=${fmt(xs[i].n)})`);
  const sd = (t, f, c) => ({label:t, data:xs.map(x => spct(x, f)), backgroundColor:c, borderRadius:0, borderSkipped:false, maxBarThickness:56});
  const o3 = {scales:{x:{stacked:true, ticks:{autoSkip:false}}, y:{stacked:true, max:100, ticks:{callback:v => v + "%"}}},
    plugins:{tooltip:{callbacks:{label:c => ` ${c.dataset.label}: ${c.parsed.y == null ? "ไม่มีข้อมูล" : fpct(c.parsed.y)}`}}}};
  mk("cBs3", "bar", {labels:lab, datasets:[sd("บวก", "pos", cv("--pos")), sd("กลาง", "neu", cv("--neu")), sd("ลบ", "neg", cv("--neg"))]}, o3, fpct);
  const f = st.sm;
  mk("cBs4", "line", {labels:BS.sent.periods.map((q, i) => perLabel(q) + (partialPer(q) ? "*" : "")), datasets:BK.map(b => ({label:bname(b), data:BS.sent.periods.map((q, i) => spct(sentOf(b, i, pl), f)),
      borderColor:bcol(b), backgroundColor:bcol(b), borderWidth:2, pointRadius:4, pointHoverRadius:6, pointBorderColor:cv("--surface"), pointBorderWidth:2, tension:0, spanGaps:false}))},
    {scales:{y:{ticks:{callback:v => v + "%"}}}}, fpct);
  const cellS = x => !x.n ? `<td class="na">ไม่มีข้อมูล</td>` : `<td>${fmt(x.n)}${nTag(x.n)}</td>`;
  $("#bSt").innerHTML = `<thead><tr><th>แบรนด์</th><th>n (${perLabel(per)})</th><th>บวก</th><th>กลาง</th><th>ลบ</th><th class="l">% ${f === "pos" ? "บวก" : "ลบ"} (n) ตามช่วง: ${BS.sent.periods.map(perLabel).join(" · ")}</th></tr></thead><tbody>${BK.map((b, i) => {
    const x = xs[i], c = k => x.n ? `<td>${fmt(x[k])} <span class="msrc">(${fpct(spct(x, k))})</span></td>` : `<td class="na">${NA}</td>`;
    return `<tr><td>${bdot(b)}${bname(b)}</td>${cellS(x)}${c("pos")}${c("neu")}${c("neg")}<td class="l" style="white-space:nowrap">${BS.sent.periods.map((q, j) => { const y = sentOf(b, j, pl);
      return y.n ? `${fpct(spct(y, f), 0)} <span class="msrc">(${fmt(y.n)})</span>` : `<span class="msrc">–</span>`; }).join(" · ")}</td></tr>`; }).join("")}</tbody>`;
}
/* forecast table (คาดการณ์ — not a Brand Scan number) */
function fcBlock(fc){
  const rk = b => 1 + ALL.filter(o => fc.vals[o].mid[0] > fc.vals[b].mid[0]).length;
  return `<h2>Brand Score · ${mlabel(fc.month)} <span class="msrc">(${"คาดการณ์"})</span></h2>
   <p class="note warn"><b>คาดการณ์ ไม่ใช่ค่าทางการ</b> — Brand Scan ยังไม่เผยแพร่ ${mlabel(fc.month)} · จะแทนด้วยค่าทางการเมื่อออก ·
    วิธี: Owned และ Earned ของแต่ละแบรนด์เปลี่ยนเท่าค่าเฉลี่ย (ต่ำสุด–สูงสุด) ของการเปลี่ยนรายเดือนช่วง ${mlabel(fc.window[0])}–${mlabel(fc.window[1])}
    แล้วรวมเป็น Brand Score = ${fc.w[0]} × Owned + ${fc.w[1]} × Earned (สูตรถอดจากตัวเลข ม.ค.–ก.ย. คลาดไม่เกิน ~1 แต้ม ไม่ใช่สูตรที่ Brand Scan ประกาศ) · ไม่คาดการณ์ Sentiment Score</p>
   <div class="card"><div class="tw"><table id="bFc"><thead><tr><th>แบรนด์</th><th>Brand Score (${"คาดการณ์"})</th><th>ช่วง ต่ำ–สูง</th><th>Owned (${"คาดการณ์"})</th><th>Earned (${"คาดการณ์"})</th><th>อันดับ (${"คาดการณ์"})</th></tr></thead><tbody>${ALL.map(b => {
    const v = fc.vals[b]; return `<tr><td>${bdot(b)}${bname(b)}</td><td>~${fmt(Math.round(v.mid[0]))} <span class="msrc">(${"คาดการณ์"})</span></td><td>${fmt(Math.round(v.low[0]))}–${fmt(Math.round(v.high[0]))}</td>
      <td>~${fmt(Math.round(v.mid[1]))}</td><td>~${fmt(Math.round(v.mid[2]))}</td><td>#${rk(b)}</td></tr>`; }).join("")}</tbody></table></div></div>`;
}
RENDER.brandscan = rBrandScan;
