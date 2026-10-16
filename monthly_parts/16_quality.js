/* ===== 7 data quality ===== */
function rQuality(p){
  const M = D.meta, ym = m => `${THM[+m.mo.slice(5) - 1]} ${m.mo.slice(0, 4)}`;
  const stat = D.months.map(m => `<tr><td>${ym(m)}</td>` + ["owned", "earned"].map(sc => { const s = m[sc];
    return `<td class="l">${sbadge(m.mo, sc)}</td><td class="l">${s.family ? FAM[s.family] : "–"}</td><td class="l" style="white-space:nowrap">${s.span ? s.span[0] + " → " + s.span[1] : "–"}</td>`; }).join("") + `</tr>`).join("");
  const og = {};
  D.quality.overlap.forEach(r => { const k = `${r.month}|${r.brand}|${r.scope}`, o = og[k] = og[k] || {month:r.month, brand:r.brand, scope:r.scope, window:r.window, wf:r.winner_family, of:r.other_family, w:0, o:0, mt:0, we:0, oe:0};
    o.w += r.win_text; o.o += r.other_text; o.mt += r.matched; o.we += r.win_eng; o.oe += r.other_eng; });
  const ovr = Object.values(og).sort((a, b) => a.month.localeCompare(b.month) || ALL.indexOf(a.brand) - ALL.indexOf(b.brand)).filter(r => BK.includes(r.brand));
  p.innerHTML = `<div class="note warn"><b>อ่านก่อนใช้ตัวเลข:</b> ไฟล์ Brand Scan ไม่มี reach, impression, click, ผู้ติดตาม, Sentiment หรือ Brand Score จึงไม่แสดงตัวชี้วัดเหล่านี้ ·
   ยอดดู Facebook มีเฉพาะไฟล์ Owned/Earned (ไม่มีในไฟล์ Social Metric) · X ไม่มียอดดู · KPI “ยอดดู” จึงรวมเฉพาะ IG + TikTok + YouTube</div>
  ${(D.meta.derived || []).length ? `<div class="note warn"><b>ค่าที่คำนวณขึ้น (YouTube engagement):</b> คอลัมน์ Engagement ของ YouTube ในไฟล์ Social Metric เป็น 0 ทุกแถวแม้มี Like/Comment จึงคำนวณ <b>Engagement = Like + Comment</b> (ไม่รวม Share) · ในไฟล์ Owned export ที่กรอกครบ ค่านี้ตรงกับ Like + Comment ทุกแถว (173/173) · เดือนที่ถูกคำนวณ: ${D.meta.derived.map(d => { const m = (d.file.match(/from (\d{4}-\d{2})/) || [])[1]; return m ? mlabel(m) : esc(d.file); }).join(", ")} (รวม ${fmt(sum(D.meta.derived.map(d => d.rows)))} แถว)<br><b>ข้อควรระวัง:</b> สำหรับโพสต์เดียวกัน ไฟล์ Social Metric รายงานไลก์และยอดดู YouTube <b>สูงกว่า</b> ไฟล์ Owned export (ตรวจเมื่อ 16 ต.ค. 2026: MEDCMU ส.ค. จับคู่ได้ 25/25 โพสต์ ไลก์ 24,006 เทียบ 14,861 ส่วนใหญ่มาจากคลิปเดียวที่ไวรัล) จึงส่วนต่างของ YouTube ในตารางเทียบไฟล์ด้านล่างอาจสูงกว่าแพลตฟอร์มอื่น ไม่ทราบว่าสองไฟล์นิยามตัวเลขต่างกันอย่างไร</div>` : ""}
  <h2>สถานะข้อมูลรายเดือน</h2><div class="card"><div class="tw"><table><thead><tr><th rowspan="2">เดือน</th><th class="l" colspan="3">Owned</th><th class="l" colspan="3">Earned</th></tr>
   <tr><th class="l">สถานะ</th><th class="l">แหล่ง</th><th class="l">ช่วงวันที่</th><th class="l">สถานะ</th><th class="l">แหล่ง</th><th class="l">ช่วงวันที่</th></tr></thead><tbody>${stat}</tbody></table></div></div>
  <p class="note">เดือนที่ไม่มีไฟล์ (เช่น มิ.ย.) ไม่ถูกประมาณค่า · เดือนที่ไฟล์ครอบคลุมบางส่วนติดป้าย “ข้อมูลบางส่วน” และไม่แสดง % เทียบเดือนก่อน</p>
  <h2>กติกาเลือกแหล่งข้อมูล</h2><ul class="clean"><li>เดือนที่มีหลายไฟล์ทับกัน ใช้ <b>ไฟล์ที่สร้างล่าสุด</b> (Generated At) ของแต่ละประเภท (Owned/Earned) · ตัดสินด้วยเวลาในไฟล์ ไม่ได้กำหนดรายเดือน</li>
   <li>แถวซ้ำที่แบรนด์ แพลตฟอร์ม ลิงก์ วันที่ และ engagement ตรงกันทั้งหมด (ข้อความอาจต่างกัน) ถูกตัดออก ${fmt(M.dup_dropped)} แถว · ใช้ทั้งหมด ${fmt(M.rows_used)} แถว</li>
   <li>โพสต์ที่นับ = แถวที่มีข้อความ · engagement = คอลัมน์ Engagement ในไฟล์ (X: Reply→comment, Repost+Quote→share)</li></ul>
  <h2>เทียบไฟล์ที่ทับกัน (แสดงเฉพาะเดือนที่มีหลายไฟล์)</h2>
  <p class="note">ลิงก์โพสต์ของสองไฟล์ไม่ตรงรูปแบบกัน จึงจับคู่ด้วย <b>วันที่ + ข้อความ</b> · เทียบเฉพาะ <b>ช่วงวันที่ที่ไฟล์ทั้งสองมีข้อมูลทับกัน</b> (ไฟล์ Owned export อาจเริ่มกลางเดือน) · ไฟล์ Owned export มีแถวรูปย่อยที่ไม่มีข้อความจำนวนมาก (Facebook) จึงนับแถวทั้งหมดเทียบกันไม่ได้ ให้ดูเฉพาะ “โพสต์ที่มีข้อความ”</p>
  <div class="card"><div class="tw"><table><thead><tr><th>เดือน</th><th class="l">แบรนด์</th><th class="l">ประเภท</th><th class="l">ช่วงที่เทียบ</th><th>โพสต์มีข้อความ (ไฟล์ที่ใช้)</th><th>โพสต์มีข้อความ (อีกไฟล์)</th><th>จับคู่ได้</th><th>engagement (ไฟล์ที่ใช้)</th><th>engagement (อีกไฟล์)</th><th>ต่าง %</th></tr></thead><tbody>${ovr.length ? ovr.map(r =>
    `<tr><td>${mlabel(r.month)}</td><td class="l">${bdot(r.brand)}${bname(r.brand)}</td><td class="l">${r.scope === "owned" ? "Owned" : "Earned"}</td><td class="l" style="white-space:nowrap">${r.window}</td><td>${fmt(r.w)} <span class="msrc">${FAM[r.wf]}</span></td><td>${fmt(r.o)} <span class="msrc">${FAM[r.of]}</span></td><td>${fmt(r.mt)}</td><td>${fmt(r.we)}</td><td>${fmt(r.oe)}</td><td>${r.oe ? fpct((r.we - r.oe) / r.oe * 100) : NA}</td></tr>`).join("")
    : `<tr><td colspan="10" class="na">ไม่มีเดือนที่มีหลายไฟล์ทับกัน (หรือไม่มีแบรนด์ที่เลือก)</td></tr>`}</tbody></table></div></div>
  <h2>ไฟล์ต้นทาง</h2><div class="card"><div class="tw"><table><thead><tr><th class="l">ไฟล์</th><th class="l">ประเภท</th><th class="l">ช่วงที่ส่งออก</th><th class="l">สร้างเมื่อ (UTC)</th><th>แถว</th></tr></thead><tbody>${M.sources.map(s =>
    `<tr><td class="l">${esc(s.file.replace("Brand Scan export data ", ""))}</td><td class="l">${FAM[s.family]}</td><td class="l">${s.tf[0]} → ${s.tf[1]}</td><td class="l">${esc(s.generated_at.replace("T", " ").slice(0, 19))}</td><td>${fmt(s.rows)}</td></tr>`).join("")}</tbody></table></div></div>
  <h2>นิยาม</h2><ul class="clean"><li><b>Owned/Earned</b> ตามประเภทไฟล์ Brand Scan · <b>engagement</b> เป็นค่ารวมที่ระบบคำนวณ ไม่ควรเทียบข้ามแพลตฟอร์ม</li>
   <li><b>engagement เฉลี่ยต่อโพสต์</b> = ค่าเฉลี่ยของโพสต์ที่มีข้อความ (ไม่รวมแถวรูปย่อย) · ตัวเลขรวมข้ามแพลตฟอร์มใช้ดูภาพรวมเท่านั้น</li></ul>`;
}
RENDER.quality = rQuality;
