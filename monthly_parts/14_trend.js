/* ===== 5 daily / weekly trend (null = outside any file's span: drawn as a gap, never 0) ===== */
const wkey = d => { const dt = new Date(d + "T00:00:00Z"), dow = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - dow); return dt.toISOString().slice(0, 10); };
function weekly(dates, arr){
  const out = {};
  dates.forEach((d, i) => { const k = wkey(d), o = (out[k] = out[k] || {s:null, n:0}); if (arr[i] != null) o.s = (o.s || 0) + arr[i]; o.n++; });
  return out;
}
/* per week: how many of its days lie inside a file's covered span, and which file families supply them */
function weekMeta(sc){
  const out = {};
  D.dates.forEach(d => { const k = wkey(d), o = (out[k] = out[k] || {cov:0, fams:new Set()}), m = MI[d.slice(0, 7)], s = m && m[sc];
    if (s && s.span && d >= s.span[0] && d <= s.span[1]){ o.cov++; o.fams.add(s.family); } });
  return out;
}
/* "ม.ค. 26–พ.ค. 26: Social Metric · …": consecutive months read from the same file family are merged */
function srcRuns(sc){
  const runs = [];
  D.months.forEach((m, i) => { const s = m[sc]; if (s.status === "nodata") return; const last = runs[runs.length - 1];
    if (last && last.fam === s.family && last.endIdx === i - 1){ last.end = m.mo; last.endIdx = i; } else runs.push({fam:s.family, start:m.mo, end:m.mo, endIdx:i}); });
  return runs.map(r => `${r.start === r.end ? mlabel(r.start) : mlabel(r.start) + "–" + mlabel(r.end)}: ${FAM[r.fam]}`).join(" · ");
}
function rTrend(p){
  const st = S.trend;
  let h = `<div class="controls"><div class="ctl">แพลตฟอร์ม ${sel("tPlat", platOpts(false), st.plat)}</div>
   <div class="ctl">ประเภท ${seg("tScope", [{v:"owned", t:"Owned"}, {v:"earned", t:"Earned"}], st.scope)}</div>
   <div class="ctl">ตัวชี้วัด ${seg("tMet", [{v:"eng", t:"engagement"}, {v:"posts", t:"จำนวนโพสต์ (มีข้อความ)"}], st.metric)}</div>
   <div class="ctl">ช่วง ${seg("tGran", [{v:"day", t:"รายวัน"}, {v:"week", t:"รายสัปดาห์"}], st.gran)}</div></div>
  <div class="controls">${BK.map(b => `<label class="tog"><input type="checkbox" data-b="${b}" ${st.brands.has(b) ? "checked" : ""}><i style="background:${bcol(b)}"></i>${bname(b)}</label>`).join("")}</div>
  <p class="note">ช่วงวันที่ไม่มีไฟล์ข้อมูลเป็นช่องว่างในกราฟ (ไม่ใช่ศูนย์) · รายสัปดาห์เริ่มวันจันทร์ · <b>*</b> = สัปดาห์ที่มีข้อมูลไม่ครบ 7 วัน (ขอบช่วงข้อมูลหรือติดเดือนที่ไม่มีไฟล์) เทียบกับสัปดาห์เต็มโดยตรงไม่ได้ ·
  <b>†</b> = สัปดาห์ที่รวมข้อมูลจากไฟล์ต่างประเภทกัน (Social Metric กับ Owned export นับไม่เท่ากัน)</p>
  <p class="note warn"><b>แหล่งข้อมูลรายเดือน (${st.scope === "owned" ? "Owned" : "Earned"}):</b> ${srcRuns(st.scope)} · ค่าเปลี่ยนฐานการนับเมื่อเปลี่ยนไฟล์ จึงอาจเห็น “ขั้นบันได” ตรงรอยต่อ ซึ่งไม่ใช่การเปลี่ยนแปลงจริงทั้งหมด</p>
  <div class="grid g1">${card("cT", "แนวโน้ม " + PL[st.plat] + " · " + (st.metric === "eng" ? "engagement" : "จำนวนโพสต์"), "", true)}</div>`;
  p.innerHTML = h; bindTables(p);
  bindSel("tPlat", v => { st.plat = v; render(); }); bindSeg("tScope", v => { st.scope = v; render(); }); bindSeg("tMet", v => { st.metric = v; render(); }); bindSeg("tGran", v => { st.gran = v; render(); });
  p.querySelectorAll("input[data-b]").forEach(i => i.onchange = () => { i.checked ? st.brands.add(i.dataset.b) : st.brands.delete(i.dataset.b); render(); });
  const use = BK.filter(b => st.brands.has(b) && D.daily[`${b}|${st.plat}|${st.scope}`]);
  let labels, sets;
  if (st.gran === "day"){ labels = D.dates.map(dlabel); sets = use.map(b => D.daily[`${b}|${st.plat}|${st.scope}`][st.metric]); }
  else { const ks = Object.keys(weekly(D.dates, D.dates.map(() => 0))).sort(), wm = weekMeta(st.scope);
    labels = ks.map(k => dlabel(k) + (wm[k].cov < 7 ? "*" : "") + (wm[k].fams.size > 1 ? "†" : ""));
    sets = use.map(b => { const w = weekly(D.dates, D.daily[`${b}|${st.plat}|${st.scope}`][st.metric]); return ks.map(k => w[k].s); }); }
  const missing = BK.filter(b => st.brands.has(b) && !D.daily[`${b}|${st.plat}|${st.scope}`]);
  mk("cT", "line", {labels, datasets:use.map((b, i) => ({label:bname(b), data:sets[i], borderColor:bcol(b), backgroundColor:bcol(b), borderWidth:2,
      pointRadius:st.gran === "week" ? 4 : 0, pointHoverRadius:5, pointBorderColor:cv("--surface"), pointBorderWidth:2, tension:.2, spanGaps:false}))},
    {plugins:{legend:{display:true}}, scales:{x:{ticks:{maxTicksLimit:st.gran === "day" ? 12 : 14}}}}, fmt);
  if (missing.length) p.insertAdjacentHTML("beforeend", `<p class="note">${missing.map(bname).join(", ")}: ${NA}สำหรับตัวเลือกนี้</p>`);
}
RENDER.trend = rTrend;
