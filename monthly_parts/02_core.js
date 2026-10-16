/* ---------- months & shared monthly helpers ---------- */
const THM = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const MI = Object.fromEntries(D.months.map(m => [m.mo, m]));
const mlabel = mo => { const [y, m] = mo.split("-").map(Number); return `${THM[m - 1]} ${String(y).slice(2)}`; };
const FAM = {social_metric:"Social Metric", owned:"Owned export", earned:"Earned export"};
const STX = {complete:"ครบเดือน", partial:"ข้อมูลบางส่วน", nodata:"ไม่มีข้อมูล"};
const spanTxt = sp => sp ? `${+sp[0].slice(8)}–${+sp[1].slice(8)} ${THM[+sp[1].slice(5, 7) - 1]}` : "";
const ms = (mo, sc) => MI[mo][sc];
const hasM = (mo, sc) => ms(mo, sc).status !== "nodata";
const fullM = (mo, sc) => ms(mo, sc).status === "complete";
const mdays = (mo, sc) => { const sp = ms(mo, sc).span; return sp ? Math.round((Date.parse(sp[1]) - Date.parse(sp[0])) / 864e5) + 1 : 0; };
const sbadge = (mo, sc) => { const s = ms(mo, sc); return `<span class="sb ${s.status}">${STX[s.status]}${s.status === "partial" ? " · " + spanTxt(s.span) : ""}</span>`; };
const srcOf = (mo, sc) => { const s = ms(mo, sc); return s.family ? FAM[s.family] : "–"; };
const brLabel = b => BR.find(x => x.key === b).label;
const C = (mo, b, p, s) => D.cells[`${mo}|${b}|${p}|${s}`] || null;
const VIEW_PL = ["instagram", "tiktok", "youtube"];   /* view counts exist in every source file only for these platforms */
const moTag = (mo, sc) => mlabel(mo) + (ms(mo, sc).status === "partial" ? "*" : ms(mo, sc).status === "nodata" ? " ✕" : "");
const moSeg = (id, val, sc) => seg(id, D.months.map(m => ({v:m.mo, t:moTag(m.mo, sc)})), val);
const MONOTE = `<span class="msrc">* = ข้อมูลบางส่วน · ✕ = ไม่มีข้อมูล</span>`;
const emptyMsg = (mo, sc) => `<p class="note warn"><b>${mlabel(mo)}:</b> ไม่มีไฟล์ข้อมูล ${sc === "earned" ? "Earned" : "Owned"} ของเดือนนี้ จึงไม่แสดงตัวเลข (ไม่ประมาณค่า)</p>`;

/* brand totals for one month/scope across the chosen platforms; null when the brand has no row at all */
function agg(mo, b, sc, pls){
  const cs = (pls || D.platforms).map(p => C(mo, b, p, sc)).filter(Boolean);
  if (!cs.length) return null;
  const posts = sum(cs.map(c => c.posts)), vc = VIEW_PL.map(p => C(mo, b, p, sc)).filter(c => c && c.views != null);
  const tw = cs.reduce((a, c) => a + (c.mean != null ? c.mean * c.posts : 0), 0);
  return {posts, rows:sum(cs.map(c => c.rows)), eng:sum(cs.map(c => c.eng)), views:vc.length ? sum(vc.map(c => c.views)) : null, mean:posts ? tw / posts : null, np:cs.length, nv:vc.length};
}
const delta = (cur, prev) => cur == null || prev == null ? null : prev === 0 ? (cur === 0 ? 0 : Infinity) : (cur - prev) / prev * 100;
/* month-over-month % only when BOTH this month and the directly preceding calendar month are complete AND were read from the same file family (the families are not on the same basis) */
function momOf(mo, b, sc, f){
  const i = D.months.findIndex(m => m.mo === mo); if (i < 1) return null;
  const pm = D.months[i - 1].mo; if (!fullM(mo, sc) || !fullM(pm, sc) || ms(mo, sc).family !== ms(pm, sc).family) return null;
  const a = agg(mo, b, sc), p = agg(pm, b, sc); return a && p ? delta(a[f], p[f]) : null;
}
const dHtml = d => d == null ? `<span class="dl na" title="ไม่แสดงเมื่อเดือนใดเดือนหนึ่งไม่ครบ ไม่มีข้อมูล หรือมาจากไฟล์คนละประเภท">–</span>`
  : d === Infinity ? `<span class="dl">▲ จาก 0</span>` : `<span class="dl">${d >= 0 ? "▲ +" : "▼ −"}${fpct(Math.abs(d))}</span>`;

const latestFull = (D.months.filter(m => m.owned.status === "complete").map(m => m.mo).pop()) || D.months[D.months.length - 1].mo;
const S = {
  overview:{mo:latestFull, scope:"owned"},
  monthly:{plat:"all", scope:"owned", metric:"eng", mode:"total", ce:"line"},
  platform:{mo:latestFull, plat:"facebook"},
  earned:{mo:latestFull, plat:"facebook", cb:"MEDCMU"},
  trend:{brands:new Set(ALL), plat:"facebook", scope:"owned", metric:"eng", gran:"week"},
  top:{mo:latestFull, plat:"facebook", scope:"owned", brand:"all"},
};
const TABS = [
  {id:"overview", t:"ภาพรวมรายเดือน", d:"สรุปรายเดือนของ MEDCMU และเทียบกับอีก 3 แบรนด์ จากข้อมูลโพสต์ Brand Scan"},
  {id:"monthly", t:"แนวโน้มรายเดือน", d:"engagement และจำนวนโพสต์ทุกเดือนที่มีข้อมูล (เดือนที่ไม่มีข้อมูลเป็นช่องว่าง)"},
  {id:"platform", t:"แพลตฟอร์ม (Owned)", d:"เทียบบัญชีทางการของแต่ละแบรนด์ในเดือนที่เลือก แยกตามแพลตฟอร์ม"},
  {id:"earned", t:"Earned / การพูดถึง", d:"โพสต์ของผู้อื่นที่กล่าวถึงแบรนด์ และผู้โพสต์อันดับต้น"},
  {id:"trend", t:"แนวโน้มรายวัน", d:"engagement และจำนวนโพสต์ตามวัน/สัปดาห์"},
  {id:"top", t:"โพสต์เด่น", d:"โพสต์ที่ engagement สูงสุดในเดือนที่เลือก และความกระจุกตัวของยอดรวม"},
  {id:"quality", t:"คุณภาพข้อมูล", d:"สถานะข้อมูลรายเดือน แหล่งที่ใช้ ส่วนต่างระหว่างไฟล์ และข้อจำกัด"},
];
/* one month selection shared by the month-based pages (overview, platform, earned, top posts) */
const SH = {mo:latestFull};
["overview", "platform", "earned", "top"].forEach(k => Object.defineProperty(S[k], "mo", {get: () => SH.mo, set: v => { SH.mo = v; }, enumerable:true}));
const RENDER = {};
