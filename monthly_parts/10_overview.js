/* ===== 1 overview (one month, MEDCMU KPIs + 4-brand comparison) ===== */
function rOverview(p){
  const st = S.overview, mo = st.mo, sc = st.scope, ok = hasM(mo, sc);
  let h = `<div class="controls"><div class="ctl">เดือน ${moSeg("oMo", mo, sc)}</div>
    <div class="ctl">ประเภท ${seg("oSc", [{v:"owned", t:"Owned"}, {v:"earned", t:"Earned"}], sc)}</div></div>
   <p class="note">${sbadge(mo, sc)} <span class="msrc">แหล่งข้อมูล: ${srcOf(mo, sc)}</span> · ${MONOTE} · ลูกศร % เทียบเดือนก่อน แสดงเฉพาะเมื่อทั้งสองเดือนครบเดือนและมาจากไฟล์ประเภทเดียวกัน ·
   <b>Owned</b> = บัญชีทางการของแบรนด์ · <b>Earned</b> = โพสต์ของผู้อื่นที่กล่าวถึงแบรนด์</p>`;
  if (!ok) h += emptyMsg(mo, sc);
  else {
    const a = agg(mo, "MEDCMU", sc);
    const k = (ic, lab, val, f, cap) => `<div class="card kpi2" style="--kc:var(--b-MEDCMU)"><div class="ico">${ICON[ic]}</div><div><div class="kl">${lab}</div><div class="kv">${val}</div><div class="kcap">${f ? dHtml(momOf(mo, "MEDCMU", sc, f)) + " " : ""}${cap}</div></div></div>`;
    h += `<div class="grid g4">` +
      k("send", "โพสต์ที่มีข้อความ", a ? fmt(a.posts) : NA, "posts", `MEDCMU · ${sc === "owned" ? "Owned" : "Earned"}`) +
      k("heart", "engagement รวม", a ? fmt(a.eng) : NA, "eng", `${a ? a.np + "/" + D.platforms.length + " แพลตฟอร์ม" : "ทุกแพลตฟอร์ม"} (ใช้ดูภาพรวมเท่านั้น)`) +
      k("chart", "ยอดดู", a ? fmt(a.views) : NA, "views", `เฉพาะ IG + TikTok + YouTube${a && a.views != null ? " (" + a.nv + "/" + VIEW_PL.length + ")" : ""}`) +
      k("trend", "engagement เฉลี่ยต่อโพสต์", a ? fmt1(a.mean) : NA, "mean", "เฉพาะโพสต์ที่มีข้อความ") + `</div>
      <h2>เทียบแบรนด์ · ${mlabel(mo)}</h2><div class="grid g4">` + ALL.map(b => {
        const x = agg(mo, b, sc);
        if (!x) return `<div class="card kpi" style="--kc:${bcol(b)}"><div class="name">${esc(brLabel(b))}</div><div class="big" style="font-size:16px">${NA}</div></div>`;
        const rk = 1 + ALL.filter(o => (agg(mo, o, sc) || {eng:-1}).eng > x.eng).length;
        return `<div class="card kpi" style="--kc:${bcol(b)}"><div class="name">${esc(brLabel(b))}</div><div class="big">${fmt(x.eng)}</div>
          <dl><dt>engagement รวม</dt><dd>${dHtml(momOf(mo, b, sc, "eng"))}</dd><dt>แพลตฟอร์มที่มีข้อมูล</dt><dd>${x.np}/${D.platforms.length}</dd><dt>อันดับจาก 4 แบรนด์</dt><dd>#${rk}</dd>
          <dt>โพสต์ที่มีข้อความ</dt><dd>${fmt(x.posts)}</dd><dt>เฉลี่ย/โพสต์</dt><dd>${fmt1(x.mean)}</dd>
          <dt>ยอดดู (IG+TikTok+YouTube)</dt><dd>${fmt(x.views)}${x.views != null && x.nv < VIEW_PL.length ? ` <span class="msrc">(${x.nv}/${VIEW_PL.length})</span>` : ""}</dd></dl></div>`; }).join("") + `</div>
      <h2>engagement แยกตามแพลตฟอร์ม · ${mlabel(mo)}</h2><div class="grid g1">${card("cOv", "engagement รวม (ต่อแพลตฟอร์ม)", "เทียบภายในแพลตฟอร์มเดียวกันเท่านั้น", true)}</div>`;
  }
  p.innerHTML = h; bindTables(p);
  bindSeg("oMo", v => { st.mo = v; render(); }); bindSeg("oSc", v => { st.scope = v; render(); });
  if (!ok) return;
  const narrow = window.innerWidth < 600, SHORT = {facebook:"FB", instagram:"IG", tiktok:"TikTok", youtube:"YT", twitter:"X"};   /* every platform label must stay visible */
  mk("cOv", "bar", {labels:D.platforms.map(x => narrow ? SHORT[x] : PL[x]), datasets:BK.map(b => ({label:bname(b), data:D.platforms.map(pl => (C(mo, b, pl, sc) || {}).eng ?? null),
      backgroundColor:bcol(b), borderRadius:4, borderSkipped:false, borderColor:cv("--surface"), borderWidth:2, maxBarThickness:34}))},
    {scales:{x:{ticks:{autoSkip:false}}, y:{ticks:{callback:v => abbr(v)}}}}, fmt);
}
RENDER.overview = rOverview;
