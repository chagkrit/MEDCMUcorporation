# MEDCMU Monthly Social Dashboard — CLAUDE.md

> **ก่อนทำอะไร: อ่าน `HANDOFF_2026-10-16.md` (หรือไฟล์ HANDOFF_* ใหม่สุด) แล้วเทียบวันที่ไฟล์กับ `docs/progress.md` ก่อนเชื่อสถานะ**
> หมายเหตุ: ไฟล์นี้มีสำเนาใน repo `chagkrit/MEDCMUcorporation` ด้วย แต่โฟลเดอร์ `docs/` และ `tools/` (spec, แผน, ledger, ชุดตรวจบราวเซอร์) **อยู่เฉพาะในโฟลเดอร์ Drive ของโปรเจกต์** (`Social MEDCMU/MEDCMU_Dashboard/`) ไม่อยู่ใน repo/clone

## งานนี้คืออะไร
Dashboard รายเดือนเทียบ MEDCMU กับ ศิริราช / จุฬาฯ / สมิติเวช จากไฟล์ Brand Scan (Zocial Eye) ใน `../ZocialEye/`
สร้างเป็นไฟล์เดียว `index.html` (ออฟไลน์ ฝังข้อมูล + Chart.js) · ขึ้นเว็บที่ https://medcmucorporation.vercel.app
(repo สาธารณะ `github.com/chagkrit/MEDCMUcorporation`, โคลนที่ `~/MEDCMUcorporation`, Vercel deploy อัตโนมัติจาก push ไป `main`)
**ผู้ใช้:** ทีมสื่อสารคณะ (ลงลึก) + ผู้บริหาร (ภาพรวม) · UI เป็นภาษาไทย

## คำสั่งหลัก (รันใน MEDCMU_Dashboard; path มีเว้นวรรคและ `&` ต้องใส่เครื่องหมายคำพูดเสมอ)
```bash
python3 build_monthly.py          # xlsx -> monthly_data.json + monthly_ledger.csv + monthly_overlap_report.csv + index.html
python3 verify_monthly.py         # นับซ้ำจาก xlsx ดิบด้วยโค้ดแยกอิสระ ต้องได้ "mismatches: 0"
python3 -m unittest discover -s tests   # 25 เคส (ไม่มี pytest ในเครื่อง)
# ชุดตรวจบราวเซอร์ (puppeteer-core): ดู tools/browser_checks/ และหัวข้อ "ตรวจก่อนเผยแพร่" ด้านล่าง
```
`python3 -I` ตัด cwd ออกจาก path → import โมดูลโปรเจกต์ไม่ได้ ห้ามใช้ `-I` กับโค้ดของโปรเจกต์ (ใช้ได้กับสคริปต์ที่อ่านข้อมูลอย่างเดียว)

## โครงสร้าง
| ที่ | หน้าที่ |
|---|---|
| `monthly_load.py` | อ่าน xlsx 3 ประเภท (Social Metric / Owned / Earned) เป็นตารางโพสต์เดียว; ชื่อคอลัมน์จำเป็นหาย/แบรนด์ไม่รู้จัก/ชีตไม่รู้จัก = ValueError (ตั้งใจ ห้ามทำให้เงียบ) |
| `monthly_agg.py` | เลือกไฟล์ต่อเดือน, สถานะ/ช่วงวันที่, รวมยอด, daily/top/authors, ตารางเทียบไฟล์ทับกัน |
| `build_monthly.py` | ประกอบทั้งหมด + `to_payload` (JSON ปลอดภัยใน `<script>`: ไม่มี NaN, escape `</`) |
| `monthly_parts/*` | ชิ้นส่วนโครงหน้า ต่อกันตามลำดับชื่อไฟล์ (01 head/CSS, 02 core, 03 icons, 04 nav, 10–16 หน้า, 99 tail) |
| `verify_monthly.py` | ตัวตรวจอิสระ (ไม่ import จากโมดูลอื่น) |
| `tests/test_monthly.py` | unit test |
| `tools/browser_checks/` | `run.mjs` (56 ภาพ + คลิกทุกปุ่ม + เทียบ ledger), `run2.mjs`, `run3.mjs` (เช็กเฉพาะจุด), `live.mjs` (ตรวจเว็บจริง), `tamper.py` (พิสูจน์ว่าตัวตรวจจับข้อมูลผิดได้) |
| `archive/q3_2026-10-05/` | dashboard Q3 เดิมทั้งชุด (ย้อนกลับได้) · `build_dashboard.py`/`dashboard_template.html` ที่ราก = ตัวสร้าง Q3 เก็บอ้างอิง **ห้ามใช้สร้างเวอร์ชันนี้** |
| `docs/` | spec, แผน, `progress.md` (ledger: ทุก `Ruling:` คือการตัดสินใจที่ทำแทนผู้ใช้) |

## กติกาตัวเลข (ห้ามเปลี่ยนโดยไม่ถามผู้ใช้)
- เดือนที่มีหลายไฟล์ทับกัน → ใช้ไฟล์ที่ `Generated At` ใหม่สุด (ต่อ Owned/Earned) ตัดสินด้วยเวลาในไฟล์ ไม่ใช่ชื่อเดือน
- สถานะเดือน: ครบเดือน / ข้อมูลบางส่วน / ไม่มีข้อมูล; วันสิ้นสุดตัดที่ "วันก่อนวันที่ไฟล์ถูกสร้าง" (ต.ค. = 1–15)
- เดือนไม่มีข้อมูล = ช่องว่าง ห้ามประมาณ/เติม/ลากเส้นทึบ; ค่าที่หาย = "ข้อมูลไม่เพียงพอ" ห้ามเป็น 0
- % เทียบเดือนก่อน: ทั้งสองเดือนติดกัน + ครบเดือน + **ไฟล์ประเภทเดียวกัน** เท่านั้น
- โพสต์ที่นับ = แถวที่มีข้อความ; engagement = คอลัมน์ Engagement ในไฟล์; สัดส่วน top1/top3 นับเฉพาะโพสต์ที่มีข้อความ
- ยอดดู KPI = IG + TikTok + YouTube เท่านั้น (Facebook ในไฟล์ Social Metric ไม่มี View; X ไม่มี)
- ตัวกรองแบรนด์เริ่มต้น = MEDCMU อย่างเดียว; การ์ด "เทียบแบรนด์" หน้าภาพรวมแสดงครบ 4 แบรนด์เสมอ
- ไม่มี reach/impression/click/ผู้ติดตาม/Sentiment/Brand Score ในไฟล์ชุดนี้ → ไม่แสดง ห้ามเดา

## ข้อระวัง / จุดที่จะผิดพลาดได้ (เจอจริงในงานนี้)
**ข้อมูล**
1. **YouTube Engagement ในไฟล์ Social Metric เป็น 0 ทุกแถวทุกไฟล์** → ตัวอ่านคำนวณ = Like + Comment (เฉพาะชีต YouTube ที่ทั้งชีตเป็น 0; ถ้ามีค่าแม้แถวเดียวไม่แตะ) ติดธง `eng_derived` และแสดงในหน้า "คุณภาพข้อมูล" · หลักฐาน: ใน Owned export Engagement = Like + Comment ตรง 173/173 แถว
2. **สองไฟล์ไม่เห็นตรงกัน:** โพสต์ YouTube เดียวกัน Social Metric รายงานไลก์/ยอดดู "สูงกว่า" Owned export (MEDCMU ส.ค. 25/25 โพสต์: ไลก์ 24,006 เทียบ 14,861; คลิปไวรัลคลิปเดียว) **ยังไม่รู้ว่านิยามต่างกันอย่างไร** → ห้ามอ้างว่าฝั่งไหนถูก ถามผู้ใช้/Brand Scan
3. **Owned export อาจ "ชนะ" Social Metric โดยไม่ตั้งใจ:** ถ้า export Owned ใหม่ที่ครอบคลุม ส.ค./ก.ย. ถูกสร้างทีหลัง Social Metric ตัวเลขเดือนเหล่านั้นจะเปลี่ยนไฟล์ทั้งเดือน (ศิริราช ก.ย. ต่างกัน −16.4% ณ 16 ต.ค. 2026) และลูกศร % จะหายเพราะเปลี่ยนตระกูลไฟล์ → ทุกครั้งที่ build ดูตารางสถานะ (`months ...` ที่ build พิมพ์) ว่าแต่ละเดือนมาจากไฟล์ไหน
4. **URL โพสต์ไม่ตรงกันระหว่างสองไฟล์** → จับคู่ด้วย วันที่ + ข้อความ (80 ตัวอักษรแรก ไม่สนช่องว่าง/ตัวพิมพ์) ห้ามจับคู่ด้วย URL
5. Owned export มีแถวรูปย่อย Facebook ไม่มีข้อความจำนวนมาก (MEDCMU ก.ย. 1,329 จาก 1,526 แถว) → ห้ามนับแถว, นับเฉพาะแถวมีข้อความ
6. ตารางเทียบไฟล์ต้องเทียบเฉพาะ "ช่วงวันที่ที่ซ้อนกัน" (เคยเทียบเดือนเต็มกับครึ่งเดือนจนได้ +113% หลอก)
7. **Earned ย้อนหลังไม่ได้** (Brand Scan เก็บ ~92 วัน; Earned export เริ่ม 15 ก.ค.) · Social Metric (Owned) export ย้อนเดือนเก่าได้ · ประวัติ MCP ในเครื่อง (`~/.zocialeye-mcp/history.sqlite`) เริ่ม 28 มิ.ย. เท่านั้น ใช้เติม 1–27 มิ.ย. ไม่ได้
8. ศิริราช ส.ค. engagement ต่ำผิดปกติในทั้งสองไฟล์ (~7,000) → % เทียบ ก.ย. +1,311% น่าจะเป็นช่องว่างการเก็บข้อมูล ไม่ใช่ผลงานจริง · โพสต์เด่นของ MEDCMU มักเป็นโพสต์ผู้บริจาคอวัยวะ/เด็ก (น้องซันนา) ข้อมูลสาธารณะ แต่ระวังเรื่อง consent/ศักดิ์ศรีเมื่อยกไปใช้ในรายงาน/ไอเดียคอนเทนต์
9. ไฟล์ใหม่ที่เปลี่ยนชื่อคอลัมน์ (เช่น `Engagements`) → build หยุดด้วย ValueError "missing required column" — ถูกต้อง อย่าแก้ให้ข้ามเงียบ
**โค้ด/หน้าเว็บ**
10. ห้ามใส่ตัวเลขจากข้อมูลลงข้อความคงที่ (จะล้าสมัย) — ข้อยกเว้นเดียวคือหมายเหตุ YouTube ในหน้าคุณภาพข้อมูลที่ระบุ "ตรวจเมื่อ 16 ต.ค. 2026" ต้องอัปเดตถ้าข้อมูลเปลี่ยน
11. ข้อความ/ชื่อผู้โพสต์/วันที่ต้องผ่าน `esc()`; ลิงก์เฉพาะ `http(s)://`; JSON ต้อง `allow_nan=False` และ escape `</`
12. `S.*.mo` ของ overview/platform/earned/top ใช้ตัวเลือกเดือนร่วมกัน (`SH.mo` ผ่าน `Object.defineProperty`) — อย่าเพิ่มหน้าใหม่ที่เก็บเดือนแยก
13. ห้ามแก้ `monthly_ledger.csv` ด้วยมือ; ถ้า verifier ไม่ตรง ให้หาว่าฝั่งไหนผิดจากไฟล์ xlsx ดิบก่อน
**การทดสอบ**
14. ห้าม `build_monthly.py` ขณะ `run.mjs` กำลังรัน (เขียน index.html ทับ → ผลปนกัน)
15. ใน puppeteer: เปลี่ยนแค่ `#hash` ไม่โหลดหน้าใหม่ (แอปอ่าน hash ตอน init เท่านั้น) → เปิดหน้าใหม่; `evaluate` แปลง `Infinity` เป็น `null`; Chrome headless มีความกว้างขั้นต่ำ ~500px ภาพ 375px จาก `--window-size` ถูกตัด → ใช้ `setViewport({isMobile:true})`
16. ชุดตรวจบางข้อผูกกับข้อมูลปัจจุบัน ต้องทบทวนเมื่อมีเดือนใหม่: `run2.mjs` (สัปดาห์ 13 ก.ค., 28 ก.ย.), `tamper.py` เคส month-span (เคยกลายเป็น no-op เมื่อ ก.ค. ครบเดือน), `run.mjs` ตรวจ MoM ตามเดือนครบ
17. ตัวตรวจอิสระใช้สมมติฐานเดียวกับตัวสร้างบางข้อ (คีย์ซ้ำ 6 ช่อง, สตริง "NaN", engagement ว่าง→0) ต้านข้อผิดพลาดของโค้ดได้ แต่ไม่ต้านสมมติฐานที่ผิดร่วมกัน
**เครื่อง/การเผยแพร่**
18. macOS ไม่มีคำสั่ง `timeout`, `uniq -w`; ตัวแปร shell ไม่คงอยู่ข้าม Bash call (ตั้ง DASH/SCRATCH ใหม่ทุกครั้ง)
19. `gh` ที่ active คือ `residentsurgcmu` → push ไป repo นี้จะ 403 · ใช้โทเคน `chagkrit` ชั่วคราวเฉพาะคำสั่ง push ห้ามสลับบัญชี ห้ามพิมพ์โทเคน:
    `git -c credential.helper= -c credential.helper='!f() { echo username=chagkrit; echo "password=$(gh auth token --user chagkrit)"; }; f' push origin main`
20. Vercel deploy อัตโนมัติ ~6–20 วินาทีหลัง push (ไม่ต้อง `vercel deploy`; Claude รัน `npx vercel deploy --prod` เองไม่ได้ ผู้ใช้ต้องรันด้วย `!`) · ตรวจว่าเว็บตรงกับไฟล์: `curl -s URL | cmp - index.html`
21. repo สาธารณะ: ห้ามมี xlsx, `.env*`, `.vercel` (อยู่ใน .gitignore) · `CLAUDE.md`/`HANDOFF_*` ขึ้น repo ได้ (ตรวจ 2026-10-16: ไม่มี path ในเครื่อง/ความลับ — ก่อน commit ครั้งใหม่ต้อง `grep -nE "/Users/|GoogleDrive|@gmail|gho_|password=[^$\"]"` ซ้ำ) แต่ `docs/` และ `tools/` อยู่ในโฟลเดอร์ Drive เท่านั้น ห้ามสมมติว่ามีใน clone · repo มี `monthly_data.json` (ข้อความโพสต์/ชื่อผู้โพสต์สาธารณะ — เหมือนที่ฝังใน index.html อยู่แล้ว)
22. **ห้าม push/deploy จนกว่าผู้ใช้สั่ง** (เว็บสาธารณะที่ใช้งานอยู่) การอนุมัติรอบหนึ่งไม่ครอบคลุมรอบถัดไป

## ตรวจก่อนเผยแพร่ (ทุกครั้งที่ข้อมูล/โค้ดเปลี่ยน)
1. `python3 -m unittest discover -s tests` → OK
2. `python3 build_monthly.py` แล้วอ่านบรรทัด `months [...]` ว่าสถานะ/ไฟล์ต่อเดือนถูกต้อง (ดูข้อ 3 ด้านบน)
3. `python3 verify_monthly.py` → `mismatches: 0`
4. ชุดบราวเซอร์ (ติดตั้งครั้งแรก: `cd tools/browser_checks && npm i`; Chrome อยู่ที่ `/Applications/Google Chrome.app`):
   `node run.mjs "$DASH/index.html" "$DASH/monthly_ledger.csv" OUTDIR` (≈6 นาที; ต้องได้ error 0 / overflow 0 / ui-vs-ledger 0) · `node run2.mjs index.html` · `node run3.mjs index.html`
5. **อ่านภาพจริง** (อย่าดูแค่ตัวเลข): overview/monthly/quality ที่ 375 และ 1440
6. ไฟล์ใหม่ที่ทำให้ตัวตรวจเปลี่ยน → เขียนเทสต์ให้ล้มก่อนแล้วค่อยแก้ (TDD) และ `tamper.py` ต้องจับได้ทุกเคส (exit=1) ส่วน untampered = 0
7. หลังเผยแพร่ `node live.mjs` + `curl | cmp`

## ยังไม่ได้ตรวจ (อย่าอ้างว่าตรวจแล้ว)
การพิมพ์/บันทึก PDF จริง · โหมดเต็มจอจริง (Fullscreen API) · อุปกรณ์สัมผัสจริง (ใช้แค่การจำลองหน้าจอ) · ความครบของ Earned ใน Brand Scan (สถานะ "ครบเดือน" มาจาก Timeframe ในไฟล์เท่านั้น)

## กฎการทำงานกับผู้ใช้
- ผู้ใช้ตอบสั้นๆ (ไทย/อังกฤษปน) ถามให้น้อยที่สุด แต่ตัดสินใจที่เปลี่ยนตัวเลขหรือเผยแพร่ ต้องบอกผลก่อน/หลังชัดเจน
- รายงานตามจริง: ตัวเลขที่เปลี่ยนจากที่เคยเผยแพร่ ต้องบอก (เช่น MEDCMU ก.ย. MoM +92.6% → +75.7% หลังคำนวณ YouTube)
- ทุกงานจบ: อัปเดต `docs/progress.md`, `HANDOFF_*.md` (ฉบับใหม่ลงวันที่) และ memory (`project_medcmu_social_strategy.md`)
