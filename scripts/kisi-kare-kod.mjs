// Velora kişi kartı (kare kodlu PNG): okutunca kişi Kişiler'e eklenir; iPhone kamerası da "Kişilere ekle" der.
// Biçim: src/lib/contactQr.js (vCard 3.0 + X-VELORA-*). Mac'te tarayıcı yoksa Playwright'ın Chromium'u kullanılır.
//   node scripts/kisi-kare-kod.mjs çıktı.png "Ad Soyad" grup [unvan] [telefon] [e-posta]
//   grup: staff | family | athlete | student | parent | other
import { existsSync, writeFileSync } from "node:fs";
import qrcode from "../src/lib/vendor/qrcode.mjs";
import { contactVcard } from "../src/lib/contactQr.js";
import { KIND_LABEL } from "../src/lib/kinds.js";

const [out, name, kind = "staff", title = "", phone = "", email = ""] = process.argv.slice(2);
if (!out || !name) {
  console.log('Kullanım: node scripts/kisi-kare-kod.mjs kart.png "Deniz Aydın" staff Antrenör "0555 000 00 00" deniz@example.com');
  process.exit(1);
}
const person = { name, kind, title, phone, email };
const card = contactVcard(person);
const q = qrcode(0, "M");
q.addData(card);
q.make();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const sub = [KIND_LABEL[kind], title].filter(Boolean).join(" · ");
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0b1630;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
<div id="k" style="width:640px;padding:40px 44px 44px;box-sizing:border-box;background:#0b1630;color:#fff">
  <div style="font-size:22px;font-weight:600;letter-spacing:.02em;color:#c9b8ff">Velora · Kişi kartı</div>
  <div style="margin:28px auto 26px;width:440px;height:440px;background:#fff;border-radius:28px;display:grid;place-items:center">${q.createSvgTag({ cellSize: Math.floor(400 / q.getModuleCount()), margin: 0 })}</div>
  <div style="font-size:40px;font-weight:600">${esc(name)}</div>
  <div style="font-size:26px;color:#b8c2d9;margin-top:6px">${esc(sub)}</div>
  ${phone ? `<div style="font-size:24px;color:#b8c2d9;margin-top:14px">${esc(phone)}</div>` : ""}
  <div style="font-size:20px;color:#7f8cab;margin-top:22px">Velora'da: asistana “kare kodu okut” de ya da Fotoğraf ile kodu çek.</div>
</div></body>`;

const { chromium } = await import("playwright-core");
const tries = [{ channel: "chrome" }, ...["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"].filter(existsSync).map((p) => ({ executablePath: p })), {}];
let browser;
for (const t of tries) {
  browser = await chromium.launch({ headless: true, ...t }).catch(() => null);
  if (browser) break;
}
if (!browser) throw new Error("Tarayıcı açılamadı");
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent(html);
writeFileSync(out, await page.locator("#k").screenshot());
await browser.close();
console.log(`${out} yazıldı\n${card}`);
