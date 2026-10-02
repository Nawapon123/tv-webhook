# คู่มือการนำ Webhook ขึ้น Vercel (ฟรีตลอด 24 ชั่วโมง)

โฟลเดอร์นี้ถูกตั้งค่าโครงสร้างสำหรับ Deploy ขึ้น **Vercel** ให้เรียบร้อยแล้วครับ

---

### วิธีที่ง่ายที่สุด (ผ่าน GitHub เว็บบราวเซอร์ - ไม่ต้องลงโปรแกรมเพิ่ม)

#### ขั้นตอนที่ 1: อัปโหลดโฟลเดอร์นี้ขึ้น GitHub
1. เข้าเว็บไซต์ [https://github.com](https://github.com) และล็อกอิน
2. กดปุ่มสีเขียว **"New"** (สร้าง Repository ใหม่)
3. ตั้งชื่อ Repository เช่น `tradingview-webhook` แล้วกด **"Create repository"**
4. ในหน้านั้นจะมีข้อความว่า *“…or upload an existing file”* ให้คลิกคำว่า **uploading an existing file**
5. ลากไฟล์และโฟลเดอร์ทั้งหมดใน `vercel_webhook` ไปวางในหน้าเว็บ:
   - `api/webhook.js`
   - `public/index.html`
   - `package.json`
   - `vercel.json`
6. กดปุ่มสีเขียว **"Commit changes"**

---

#### ขั้นตอนที่ 2: เชื่อมต่อและ Deploy บน Vercel
1. เข้าเว็บไซต์ [https://vercel.com](https://vercel.com) แล้วล็อกอินด้วยบัญชี GitHub
2. กดปุ่ม **"Add New..."** ➡️ เลือก **"Project"**
3. จะเห็นโปรเจกต์ `tradingview-webhook` จาก GitHub ของคุณ ➡️ กดปุ่ม **"Import"**
4. ในหน้าถัดไป **ไม่ต้องแก้อะไรเลย** ให้กดปุ่ม **"Deploy"** สีฟ้าทันที
5. รอระบบ Deploy ประมาณ 20-30 วินาที จะมีภาพพลุขึ้นว่าสำเร็จ!

---

### ได้ Webhook URL อะไรไปใส่ TradingView?

เมื่อ Deploy สำเร็จ Vercel จะให้โดเมนของคุณมา เช่น `https://tradingview-webhook-xxx.vercel.app`

URL ที่นำไปใส่ใน TradingView Alert คือ:
```text
https://<ชื่อโปรเจกต์ของคุณ>.vercel.app/api/webhook
```

---

### (ทางเลือกเสริม) หากต้องการให้ส่งเตือนเข้า Telegram / Discord
ในหน้าโปรเจกต์บน Vercel ให้ไปที่เมนู **Settings** ➡️ **Environment Variables**:
- **Telegram:**
  - เพิ่มตัวแปร `TELEGRAM_BOT_TOKEN` = โทเคนบอทของคุณ
  - เพิ่มตัวแปร `TELEGRAM_CHAT_ID` = ไอดีแชทของคุณ
- **Discord:**
  - เพิ่มตัวแปร `DISCORD_WEBHOOK_URL` = ลิงก์ Webhook จากห้อง Discord ของคุณ
