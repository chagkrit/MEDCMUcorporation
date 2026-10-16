/* ===== 6 top posts (one month) ===== */
function rTop(p){
  const st = S.top, mo = st.mo, sc = st.scope, pl = st.plat, ok = hasM(mo, sc); if (st.brand !== "all" && !BK.includes(st.brand)) st.brand = "all";
  let h = `<div class="controls"><div class="ctl">เดือน ${moSeg("xMo", mo, sc)}</div><div class="ctl">แพลตฟอร์ม ${seg("xPlat", platOpts(false), pl)}</div>
   <div class="ctl">ประเภท ${seg("xScope", [{v:"owned", t:"Owned"}, {v:"earned", t:"Earned"}], sc)}</div>
   <div class="ctl">แบรนด์ ${sel("xBr", [{v:"all", t:"ทุกแบรนด์ที่เลือก"}].concat(BK.map(b => ({v:b, t:bname(b)}))), st.brand)}</div></div>
   <p class="note">${sbadge(mo, sc)} ${MONOTE} · engagement เทียบข้ามแพลตฟอร์มไม่ได้ · โพสต์ไม่กี่โพสต์อาจครองยอดรวมเกือบทั้งหมด (ดูสัดส่วนในตารางแรก · สัดส่วนนับเฉพาะโพสต์ที่มีข้อความ) · บันทึกไว้ 10 โพสต์บนสุดต่อเดือน/แบรนด์/แพลตฟอร์ม/ประเภท ข้อความแสดง 240 ตัวอักษรแรก</p>`;
  if (!ok) h += emptyMsg(mo, sc);
  else h += `<h2>ความกระจุกตัวของ engagement · ${PL[pl]} · ${mlabel(mo)}</h2><div class="card"><div class="tw"><table id="xC"></table></div></div>
   <h2>โพสต์ engagement สูงสุด</h2><div class="card"><div class="tw"><table id="xT"></table></div></div>`;
  p.innerHTML = h;
  bindSeg("xMo", v => { st.mo = v; render(); }); bindSeg("xPlat", v => { st.plat = v; render(); }); bindSeg("xScope", v => { st.scope = v; render(); }); bindSel("xBr", v => { st.brand = v; render(); });
  if (!ok) return;
  let c = `<thead><tr><th>แบรนด์</th><th>โพสต์ที่มีข้อความ</th><th>ค่ากลาง</th><th>1 โพสต์บนสุด</th><th>3 โพสต์บนสุด</th><th>engagement รวม</th></tr></thead><tbody>`;
  BK.forEach(b => { const x = C(mo, b, pl, sc); c += x ? `<tr><td>${bdot(b)}${bname(b)}</td><td>${fmt(x.posts)}</td><td>${fmt1(x.median)}</td><td>${fpct(x.top1)}</td><td>${fpct(x.top3)}</td><td>${fmt(x.eng)}</td></tr>`
    : `<tr><td>${bname(b)}</td><td colspan="5" class="na">${NA}</td></tr>`; });
  $("#xC").innerHTML = c + "</tbody>";
  const rows = D.top.filter(r => r.m === mo && r.p === pl && r.s === sc && (st.brand === "all" ? BK.includes(r.b) : r.b === st.brand)).sort((a, b) => b.e - a.e).slice(0, st.brand === "all" ? 30 : 10);
  $("#xT").innerHTML = `<thead><tr><th>#</th><th class="l">แบรนด์</th><th class="l">วันที่</th><th>engagement</th><th>ยอดดู</th>${sc === "earned" ? '<th class="l">ผู้โพสต์</th>' : ""}<th class="l">ข้อความ</th><th class="l">ลิงก์</th></tr></thead><tbody>${rows.length ? rows.map((r, i) =>
    `<tr><td>${i + 1}</td><td class="l">${bdot(r.b)}${bname(r.b)}</td><td class="l" style="white-space:nowrap">${esc(r.t)}</td><td>${fmt(r.e)}</td><td>${r.v == null ? "–" : fmt(r.v)}</td>${sc === "earned" ? `<td class="l">${esc(r.a || "–")}</td>` : ""}<td class="ptxt">${esc(r.x)}</td><td class="l">${r.u && /^https?:\/\//.test(r.u) ? `<a href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">เปิด</a>` : "–"}</td></tr>`).join("") : `<tr><td colspan="8" class="na">${NA}</td></tr>`}</tbody>`;
}
RENDER.top = rTop;
