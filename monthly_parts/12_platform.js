/* ===== 3 platform (owned, one month) ===== */
function rPlatform(p){
  const st = S.platform, mo = st.mo, pl = st.plat, sc = "owned", ok = hasM(mo, sc);
  const cs = BK.map(b => C(mo, b, pl, sc)), g = f => cs.map(c => c ? (c[f] ?? null) : null), miss = BK.filter((b, i) => !cs[i]);
  let h = `<div class="controls"><div class="ctl">เดือน ${moSeg("pMo", mo, sc)}</div><div class="ctl">แพลตฟอร์ม ${seg("pPlat", platOpts(false), pl)}</div></div>
   <p class="note">${sbadge(mo, sc)} <span class="msrc">แหล่งข้อมูล: ${srcOf(mo, sc)}</span> · ${MONOTE} · โพสต์ที่นับ = แถวที่มีข้อความ ·
   ค่ากลาง (median) ต้านอิทธิพลของโพสต์ไวรัลไม่กี่โพสต์${ok && miss.length ? ` · <b>${miss.map(bname).join(", ")}</b>: ${NA}บน ${PL[pl]}` : ""}</p>`;
  if (!ok) h += emptyMsg(mo, sc);
  else h += `<div class="grid g2">${card("cP1", "engagement รวม", "ตามไฟล์ต้นทาง")}${card("cP2", "ค่ากลาง engagement ต่อโพสต์", "เฉพาะโพสต์ที่มีข้อความ")}
   ${card("cP3", "จำนวนโพสต์ที่มีข้อความ", "")}${card("cP4", "ยอดดู", "เฉพาะแพลตฟอร์ม/ไฟล์ที่มีคอลัมน์ View (Facebook ในไฟล์ Social Metric ไม่มี)")}</div>
   <h2>ตารางรายละเอียด · ${PL[pl]} · ${mlabel(mo)}</h2><div class="card"><div class="tw"><table id="pT"></table></div></div>`;
  p.innerHTML = h; bindTables(p);
  bindSeg("pMo", v => { st.mo = v; render(); }); bindSeg("pPlat", v => { st.plat = v; render(); });
  if (!ok) return;
  const o = (fm, x) => ({plugins:{legend:{display:false}, vl:{on:true, fmt:fm}}, scales:{y:{ticks:{callback:x || (v => abbr(v))}}}});
  const one = (id, f, fm, lab) => {
    if (g(f).every(v => v == null)) {   /* nothing to draw: say why instead of an empty chart with a meaningless axis */
      document.getElementById(id).parentElement.innerHTML = `<p class="note" style="margin:8px 0">${NA}: ไฟล์ต้นทางของเดือนนี้ไม่มีค่า “${lab}” สำหรับ ${PL[pl]} (ไม่ใช่ศูนย์)</p>`; return;
    }
    return mk(id, "bar", {labels:BK.map(bname), datasets:[barDs(g(f), {label:lab})]}, o(fm), fm);
  };
  one("cP1", "eng", abbr, "engagement"); one("cP2", "median", v => fmt1(v), "ค่ากลาง"); one("cP3", "posts", fmt, "โพสต์"); one("cP4", "views", abbr, "ยอดดู");
  const rows = [["แถวทั้งหมดในไฟล์", "rows", fmt], ["โพสต์ที่มีข้อความ", "posts", fmt], ["แถวไม่มีข้อความ", "blank", fmt], ["engagement รวม", "eng", fmt],
    ["ค่าเฉลี่ยต่อโพสต์ (มีข้อความ)", "mean", fmt1], ["ค่ากลางต่อโพสต์", "median", fmt1], ["สัดส่วน engagement ของ 1 โพสต์บนสุด (เฉพาะโพสต์ที่มีข้อความ)", "top1", v => fpct(v)],
    ["สัดส่วน engagement ของ 3 โพสต์บนสุด (เฉพาะโพสต์ที่มีข้อความ)", "top3", v => fpct(v)], ["ยอดดู", "views", fmt], ["comment", "comment", fmt], ["share / repost", "share", fmt]];
  let t = `<thead><tr><th>ตัวชี้วัด</th>${BK.map(b => `<th>${bdot(b)}${bname(b)}</th>`).join("")}</tr></thead><tbody>`;
  rows.forEach(([n, f, ff]) => { t += `<tr><td>${n}</td>${g(f).map(v => v == null ? `<td class="na">${NA}</td>` : `<td>${ff(v)}</td>`).join("")}</tr>`; });
  $("#pT").innerHTML = t + "</tbody>";
}
RENDER.platform = rPlatform;
