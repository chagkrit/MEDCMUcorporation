/* ===== 4 earned (one month) ===== */
function rEarned(p){
  const st = S.earned, mo = st.mo, pl = st.plat, sc = "earned", ok = hasM(mo, sc); if (!BK.includes(st.cb)) st.cb = BK[0];
  const cs = BK.map(b => C(mo, b, pl, sc)), g = f => cs.map(c => c ? (c[f] ?? null) : null);
  let h = `<div class="controls"><div class="ctl">เดือน ${moSeg("eMo", mo, sc)}</div><div class="ctl">แพลตฟอร์ม ${seg("ePlat", platOpts(false), pl)}</div></div>
   <p class="note warn"><b>ข้อควรระวัง:</b> Earned ของ MEDCMU มีบัญชีของหน่วยงาน/ชมรมในคณะเองปนอยู่ จึงไม่ใช่เสียงจากภายนอกล้วน · ข้อมูลมีเฉพาะ engagement และจำนวนโพสต์ (ไม่มี reach/impression) ·
   ${sbadge(mo, sc)} ${MONOTE}</p>`;
  if (!ok) h += emptyMsg(mo, sc);
  else h += `<div class="grid g2">${card("cE1", "engagement จากโพสต์ที่กล่าวถึง", PL[pl])}${card("cE2", "จำนวนโพสต์ที่กล่าวถึง (มีข้อความ)", PL[pl])}</div>
   <h2>ผู้โพสต์อันดับต้น (ตาม engagement)</h2><div class="controls">${sel("eCb", BK.map(b => ({v:b, t:bname(b)})), st.cb)}</div>
   <div class="card"><div class="tw"><table id="eT"></table></div></div>`;
  p.innerHTML = h; bindTables(p);
  bindSeg("eMo", v => { st.mo = v; render(); }); bindSeg("ePlat", v => { st.plat = v; render(); }); bindSel("eCb", v => { st.cb = v; render(); });
  if (!ok) return;
  const o = fm => ({plugins:{legend:{display:false}, vl:{on:true, fmt:fm}}});
  mk("cE1", "bar", {labels:BK.map(bname), datasets:[barDs(g("eng"), {label:"engagement"})]}, o(abbr), fmt);
  mk("cE2", "bar", {labels:BK.map(bname), datasets:[barDs(g("posts"), {label:"โพสต์"})]}, o(fmt), fmt);
  const rows = D.authors.filter(a => a.m === mo && a.b === st.cb && a.p === pl).sort((a, b) => b.e - a.e);
  $("#eT").innerHTML = `<thead><tr><th>#</th><th class="l">ชื่อผู้โพสต์</th><th>โพสต์</th><th>engagement</th></tr></thead><tbody>${rows.length
    ? rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r.n)}</td><td>${fmt(r.posts)}</td><td>${fmt(r.e)}</td></tr>`).join("") : `<tr><td colspan="4" class="na">${NA}</td></tr>`}</tbody>`;
}
RENDER.earned = rEarned;
