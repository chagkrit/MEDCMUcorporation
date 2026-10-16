/* ===== 2 monthly trend (all months; gaps stay gaps) ===== */
function rMonthly(p){
  const st = S.monthly, sc = st.scope, pl = st.plat, perday = st.mode === "perday";
  const val = (mo, b) => {
    if (!hasM(mo, sc)) return null;
    const x = pl === "all" ? agg(mo, b, sc) : (C(mo, b, pl, sc) ? {eng:C(mo, b, pl, sc).eng, posts:C(mo, b, pl, sc).posts} : null);
    if (!x) return null; const r = x[st.metric]; return r != null && perday ? r / mdays(mo, sc) : r;
  };
  const ef = x => perday ? fmt1(x) : fmt(x);
  /* two-line axis labels: month, then the file the month was read from (the source changes between months and the files are not on the same basis) */
  const labels = D.months.map(m => hasM(m.mo, sc) ? [moTag(m.mo, sc), srcOf(m.mo, sc)] : [moTag(m.mo, sc)]);
  let h = `<div class="controls"><div class="ctl">แพลตฟอร์ม ${seg("mPl", platOpts(true), pl)}</div>
    <div class="ctl">ประเภท ${seg("mSc", [{v:"owned", t:"Owned"}, {v:"earned", t:"Earned"}], sc)}</div>
    <div class="ctl">ตัวชี้วัด ${seg("mMe", [{v:"eng", t:"engagement"}, {v:"posts", t:"โพสต์ที่มีข้อความ"}], st.metric)}</div>
    <div class="ctl">รูปแบบ ${seg("mMd", [{v:"total", t:"รวมทั้งเดือน"}, {v:"perday", t:"เฉลี่ยต่อวัน"}], st.mode)}</div>
    <div class="ctl">กราฟ ${seg("mCe", [{v:"line", t:"เส้น"}, {v:"bar", t:"แท่ง"}], st.ce)}</div></div>
   <p class="note">${MONOTE} · เดือนที่ไม่มีข้อมูลเป็นช่องว่างในกราฟ ไม่ลากเส้นเชื่อม · เดือนบางส่วนเทียบกับเดือนเต็มโดยตรงไม่ได้ ให้ใช้ “เฉลี่ยต่อวัน” ·
   engagement เทียบข้ามแพลตฟอร์มไม่ได้ (นิยามต่างกัน)</p>
   <p class="note warn"><b>แหล่งข้อมูลเปลี่ยนตามเดือน</b> (ใต้ชื่อเดือนในกราฟ/ตาราง): Social Metric กับ Owned export นับไม่เท่ากัน (ดูส่วนต่างจริงรายแบรนด์ในหน้า “คุณภาพข้อมูล”) จึงอาจเห็นเส้น “กระโดด” ตรงเดือนที่เปลี่ยนไฟล์ ซึ่งไม่ใช่การเปลี่ยนแปลงจริงทั้งหมด</p>
   <div class="grid g1">${card("cMo", (st.metric === "eng" ? "engagement" : "โพสต์ที่มีข้อความ") + (perday ? " (เฉลี่ยต่อวัน)" : "") + " · " + (pl === "all" ? "ทุกแพลตฟอร์ม" : PL[pl]) + " · " + (sc === "owned" ? "Owned" : "Earned"), "แยกตามเดือนตามแบรนด์ที่เลือก", true)}</div>
   <h2>ตาราง</h2><div class="card"><div class="tw"><table id="mT"></table></div></div>`;
  p.innerHTML = h; bindTables(p);
  bindSeg("mPl", v => { st.plat = v; render(); }); bindSeg("mSc", v => { st.scope = v; render(); }); bindSeg("mMe", v => { st.metric = v; render(); });
  bindSeg("mMd", v => { st.mode = v; render(); }); bindSeg("mCe", v => { st.ce = v; render(); });
  const ds = BK.map(b => ({label:bname(b), data:D.months.map(m => val(m.mo, b)), borderColor:bcol(b), backgroundColor:bcol(b), borderWidth:2, pointRadius:4,
      pointHoverRadius:6, pointBorderColor:cv("--surface"), pointBorderWidth:2, tension:.25, spanGaps:false}));
  if (st.ce === "line") mk("cMo", "line", {labels, datasets:ds}, {layout:{padding:{right:64}}, plugins:{endl:{on:true}}, scales:{y:{ticks:{callback:v => abbr(v)}}}}, ef);
  else mk("cMo", "bar", {labels, datasets:ds.map(d => Object.assign({}, d, {borderRadius:4, borderSkipped:false, borderColor:cv("--surface"), borderWidth:2, maxBarThickness:38}))},
    {scales:{y:{ticks:{callback:v => abbr(v)}}}}, ef);
  let t = `<thead><tr><th>แบรนด์</th>${D.months.map(m => `<th>${moTag(m.mo, sc)}${hasM(m.mo, sc) ? `<br><span class="msrc">${srcOf(m.mo, sc)}</span>` : ""}</th>`).join("")}</tr></thead><tbody>`;
  BK.forEach(b => { t += `<tr><td>${bdot(b)}${bname(b)}</td>${D.months.map(m => { const x = val(m.mo, b);
    return x == null ? `<td class="na">${hasM(m.mo, sc) ? NA : "ไม่มีข้อมูล"}</td>` : `<td>${ef(x)}</td>`; }).join("")}</tr>`; });
  $("#mT").innerHTML = t + "</tbody>";
}
RENDER.monthly = rMonthly;
