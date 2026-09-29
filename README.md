# MEDCMU Social Dashboard

เปิด `index.html` ด้วยเบราว์เซอร์ได้ทันที (ไฟล์เดียว ทำงานออฟไลน์ ยกเว้นฟอนต์ไทยจาก Google Fonts ซึ่งจะใช้ฟอนต์ระบบแทนหากไม่มีอินเทอร์เน็ต)

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | dashboard สำเร็จรูป เมนูซ้าย ธีมมืด (ข้อมูล + Chart.js ฝังในไฟล์) |
| `build_dashboard.py` | อ่านสอง .xlsx → สร้าง `dashboard_data.json`, `metrics_ledger.csv`, และ HTML |
| `dashboard_template.html` | โครงหน้า/สคริปต์ dashboard (ไม่มีตัวเลขข้อมูล) |
| `dashboard_data.json` | ข้อมูลสรุปที่ dashboard ใช้ |
| `metrics_ledger.csv` | ledger ของตัวเลขทุกค่าต่อแบรนด์/แพลตฟอร์ม/ประเภท ไว้ตรวจสอบ |
| `vendor/chart.umd.min.js` | Chart.js 4.4.1 |

## อัปเดตเมื่อมีข้อมูลใหม่
1. วางไฟล์ .xlsx ใหม่ในโฟลเดอร์ `MEDCMU DATA 2026`
2. แก้ชื่อไฟล์ `EXPORT` / `SCORE` ที่ต้นไฟล์ `build_dashboard.py` (ช่วงวันที่อ่านจากคอลัมน์ start/end ของชีต summary โดยอัตโนมัติ)
3. รัน `python3 build_dashboard.py` (ถ้าไฟล์ .xlsx อยู่คนละที่ ตั้ง `MEDCMU_DATA_DIR=/path/to/folder` ก่อนรัน)

ไฟล์ .xlsx ต้นฉบับไม่ได้อยู่ใน repo (ใหญ่และเป็นข้อมูลดิบจาก Wisesight) repo มีเฉพาะข้อมูลสรุป `dashboard_data.json`

## 8 หน้า (เมนูซ้าย)
ภาพรวม · Brand Score · แพลตฟอร์ม (Owned) · Earned/การพูดถึง · Sentiment · แนวโน้มรายวัน · โพสต์เด่น · คุณภาพข้อมูล

## กติกาตัวเลข
- โพสต์ที่นับ = แถวที่มีข้อความ (Facebook Owned มีแถวที่ไม่มีข้อความจำนวนมาก น่าจะเป็นรูปย่อยของโพสต์หลายรูป) ส่วน engagement รวมใช้ตัวเลขของ Wisesight
- ข้อมูลไม่มี reach / impression / click / LINE OA จึงแสดง "ข้อมูลไม่เพียงพอ" ไม่ประมาณค่า
- ไฟล์ Brand Score (ม.ค.–ส.ค.) กับไฟล์โพสต์ (28 มิ.ย.–27 ก.ย.) คนละช่วงเวลา จึงไม่รวมกัน
