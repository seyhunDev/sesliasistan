// YENİ KULLANICI UÇTAN UCA TESTİ: npm run test:yeni-kullanici
// Seyhun 2026-11-27: "normal kullanıcı girişi, özelliklerin kullanımı, sporcu seçimi, havaleyle paket; baştan sona test".
// Bu bilgisayarda sahte Firebase (emülatör, Java gerekir) ve uygulama açılır; gerçek veriye dokunulmaz, yapay zekaya istek gitmez.
// Bir insan gibi tıklanır:
//  1. Velora ana hesabı (admin) kaydolur, Admin › Paketler'de havale bilgisini (IBAN, alıcı) girer.
//  2. Yeni antrenör kaydolur: Kayıt ol › Sailing › form; tanıtım (Sessiz başla, Atla), "Velora'da ayrıca" › Başla; "Kulübün?" › Foça.
//  3. Ana sayfa: para kutusu ve güncelleme notu yok; Ayarlar: Paketim 0 / 3, uygulamanın harcamaları yok.
//  4. Takvim: + Plan › ad › Kaydet → günde 1 kayıt.
//  5. Sporcular: 3 sporcu eklenir; 4.'de "3 sporcu hakkın doldu"; sunucu 4.'yü reddeder (402); istemci Firestore'a doğrudan
//     sporcu ve paket yazamaz (kurallar, 403).
//  6. Bir sporcuya uygulama hesabı açılır; o sporcu kendi kullanıcı adı ve şifresiyle girer, sporcu karşılamasını görür.
//  7. Paket: 10 sporcu › havale bilgisi (IBAN, tutar, açıklama kodu) › Ödemeyi yaptım.
//  8. Admin › Paketler: onay bekleyen ödemede Onayla → paket açılır.
//  9. Antrenör: Paketim 3 / 10; 4. sporcu eklenir.
// Açılış öncesi eklenenler (2026-11-27 "herkese açmadan önce hangi testler"):
// 11. /tanitim, /tanitim/kisa, /tanitim/simulator ve video açılır. 12. "Velora'ya katıl" formu → Admin › Başvurular.
// Admin › Açılış işaretleri kaydedilir. 13. Antrenör Yönet ("Günü başlat") ve Fitness › Hazır programlar açılır. 14. İkinci antrenör birincinin sporcularını, takvimini
// görmez; kurallar başkasının verisini okutmaz/yazdırmaz. 15. Admin yalnız Velora sahibinde; sporcu ana hesap alanlarına giremez.
// Ayrıca: kayıttan sonra "E-postanı doğrula" (doğrulanmadan sunucu sporcu almaz) ve girişte "Şifremi unuttum".
// Seçenek --gorunur: tarayıcı ekranda açılır. Ekran görüntüleri: scripts/yeni-kullanici-test/sonuc/ (depoya girmez).
import { existsSync, mkdirSync } from "node:fs";
import { generateKeyPairSync } from "node:crypto";

const { startEmulator, AUTH_HOST, FS_HOST, PROJECT } = await import("../asistan-ekran-test/emulator.mjs");
const { startServer } = await import("../tam-test/sunucu.mjs");
const VELORA_ADMIN = (await import("node:fs")).readFileSync(new URL("../../src/lib/sharedRace.js", import.meta.url), "utf8").match(/VELORA_ADMIN\s*=\s*"([^"]+)"/)[1];

const OUT = new URL("./sonuc/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const SIFRE = "Deneme1234";
const ANTRENOR = { ad: "Deniz Antrenör", email: "antrenor@ornek.local" };
const IBAN = "TR12 0001 0000 0000 0000 0000 01";
const rows = [];
const ok = (adim, kosul, got = "") => {
  rows.push({ adim, ok: !!kosul, got });
  console.log(`  ${kosul ? "✓" : "✗"} ${adim}${!kosul && got ? `  → ${String(got).slice(0, 300)}` : ""}`);
  return !!kosul;
};
const NOISE = /WebSocket|firebase|firestore|identitytoolkit|securetoken|googleapis|ERR_|Failed to load resource|net::|WebChannel|installations|messaging|React DevTools|\[HMR\]|\[Fast Refresh\]|service ?worker|sw\.js|402|tunnel/i;
// Ana hesabın Admin sayfalarında önceden var olan geliştirme uyarısı (Kulüpler sayfasında da çıkıyor; 2026-11-27 açık iş)
const BILINEN = /unique "key" prop[\s\S]*OuterLayoutRouter/;

async function launch() {
  const { chromium } = await import("playwright-core");
  const tries = [];
  if (process.env.TAM_TEST_CHROME) tries.push({ executablePath: process.env.TAM_TEST_CHROME });
  for (const p of ["/opt/pw-browsers/chromium", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"]) if (existsSync(p)) tries.push({ executablePath: p });
  tries.push({ channel: "chrome" }, {});
  let last;
  for (const t of tries) {
    try {
      return await chromium.launch({ headless: !process.argv.includes("--gorunur"), ...t });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`Tarayıcı bulunamadı. ${String(last?.message || "").split("\n")[0]}`);
}

// Emülatörde giriş anahtarı (kurallar denemesi için) ve Firestore'a doğrudan istek
async function idToken(email, password = SIFRE) {
  const r = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const j = await r.json();
  return { token: j.idToken, uid: j.localId };
}
// Emülatörün "gönderdiği" e-postalar (doğrulama, şifre sıfırlama)
const oobKodlar = async () => (await (await fetch(`http://${AUTH_HOST}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()).oobCodes || [];
const fsUrl = (path) => `http://${FS_HOST}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`;

const T0 = Date.now();
console.log("YENİ KULLANICI UÇTAN UCA TESTİ (sahte Firebase)");
let emu = null;
let server = null;
let browser = null;
let kul = "";
let sif = "";
try {
  emu = await startEmulator({ log: console.log });
  console.log("    Uygulama açılıyor (ilk derleme 1-3 dakika sürebilir)…");
  const key = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" });
  server = await startServer({
    log: console.log,
    env: {
      NEXT_PUBLIC_TEST_EMULATOR: `${AUTH_HOST},${FS_HOST}`,
      NEXT_PUBLIC_ALLOW_SIGNUP: "1",
      FIREBASE_CLIENT_EMAIL: `deneme@${PROJECT}.iam.gserviceaccount.com`,
      FIREBASE_PRIVATE_KEY: key,
      FIRESTORE_EMULATOR_HOST: FS_HOST,
      FIREBASE_AUTH_EMULATOR_HOST: AUTH_HOST,
      GCLOUD_PROJECT: PROJECT,
    },
  });
  const U = server.url;
  browser = await launch();
  const hatalar = [];
  const yeni = async (ad) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => hatalar.push(`${ad}: ${e.message.slice(0, 200)}`));
    p.on("console", (m) => m.type() === "error" && !NOISE.test(m.text()) && !BILINEN.test(m.text()) && hatalar.push(`${ad} [${new URL(p.url()).pathname}]: ${m.text().slice(0, 5000)}`));
    // Kullanım kaydı izni penceresi her an çıkabilir: "Hayır, teşekkürler" ile kapatılır
    await p.addLocatorHandler(p.getByRole("button", { name: "Hayır, teşekkürler" }), (b) => b.click());
    let n = 0;
    p.shot = (s) => p.screenshot({ path: `${OUT}${ad}-${String(++n).padStart(2, "0")}-${s}.png` }).catch(() => {});
    return p;
  };
  const metin = async (p) => (await p.locator("body").innerText()).replace(/\s+/g, " ");
  const bekle = (p, ms) => p.waitForTimeout(ms);

  // Kayıt ol: giriş › Kayıt ol › Sailing › form
  async function kaydol(p, ad, email) {
    await p.goto(`${U}/login`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await p.getByRole("link", { name: "Kayıt ol" }).click({ timeout: 60000 });
    await p.getByRole("button", { name: /Sailing/ }).click({ timeout: 30000 });
    await p.getByLabel("Ad soyad").fill(ad, { timeout: 30000 });
    await p.getByLabel("E-posta").fill(email);
    await p.locator('input[type="password"]').first().fill(SIFRE);
    await p.getByRole("button", { name: "Hesap oluştur" }).click();
    await p.waitForURL((u) => !/\/(login|register)/.test(u.pathname), { timeout: 60000 });
  }
  async function girisYap(p, kim, sifre) {
    await p.goto(`${U}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await p.getByLabel("E-posta ya da kullanıcı adı").fill(kim, { timeout: 60000 });
    await p.getByRole("button", { name: "Devam" }).click();
    await p.locator("input[name=password]").fill(sifre);
    await p.locator('button[type="submit"]').click();
    await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
  }
  // İlk açılış: tanıtım › Velora'da ayrıca › (kulüp sorusu)
  async function ilkAcilis(p, kulup) {
    const fr = p.locator('iframe[title="Velora tanıtımı"]');
    await fr.waitFor({ timeout: 30000 }).catch(() => {});
    if (await fr.count()) {
      const f = p.frameLocator('iframe[title="Velora tanıtımı"]');
      await f.locator("#k-sessiz").click({ timeout: 30000 });
      await f.locator("#skip").click();
      await p.getByRole("dialog", { name: "Velora'da ayrıca" }).getByRole("button", { name: "Başla", exact: true }).click({ timeout: 20000 });
    }
    const kg = p.getByRole("dialog", { name: "Kulüp seçimi" });
    await kg.waitFor({ timeout: 45000 }).catch(() => {});
    const var_ = (await kg.count()) > 0;
    if (var_) {
      if (kulup) {
        await kg.locator("#kulup-ara").fill(kulup);
        await kg.getByRole("button", { name: new RegExp(kulup) }).first().click();
      } else await kg.getByRole("button", { name: "Kulüpsüz devam et" }).click();
      await kg.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
    }
    return var_;
  }

  // 1. Admin: kayıt + havale bilgisi
  console.log("\n  1. Velora ana hesabı: havale bilgisi");
  const a = await yeni("admin");
  await kaydol(a, "Velora Admin", VELORA_ADMIN);
  await ilkAcilis(a, "Dikili");
  await a.goto(`${U}/settings/admin/paketler`, { waitUntil: "domcontentloaded" });
  await a.locator("#paket-iban").fill(IBAN, { timeout: 60000 });
  await a.locator("#paket-alici").fill("Deneme Alıcı");
  await a.locator("div", { has: a.locator("#paket-iban") }).last().getByRole("button", { name: "Kaydet", exact: true }).click();
  await bekle(a, 2500);
  await a.shot("havale-bilgisi");
  ok("Admin › Paketler açılır, IBAN kaydedilir", /Kaydedildi|Havale bilgisi/.test(await metin(a)));

  // 2. Antrenör kaydı ve ilk açılış
  console.log("\n  2. Yeni antrenör: kayıt ve ilk açılış");
  const p = await yeni("antrenor");
  await kaydol(p, ANTRENOR.ad, ANTRENOR.email);
  ok("Kayıt olunca ana sayfaya girer", new URL(p.url()).pathname === "/", p.url());

  // E-posta doğrulama: bağlantıya dokunana kadar uygulama bekler, sunucu sporcu almaz
  const dg = p.getByRole("dialog", { name: "E-posta doğrulama" });
  await dg.waitFor({ timeout: 45000 }).catch(() => {});
  await p.shot("eposta-dogrula");
  ok("Kayıttan sonra 'E-postanı doğrula' ekranı", (await dg.count()) > 0);
  const kod1 = (await oobKodlar()).find((c) => c.email === ANTRENOR.email && c.requestType === "VERIFY_EMAIL");
  ok("Doğrulama e-postası gönderildi", !!kod1);
  {
    const { token } = await idToken(ANTRENOR.email);
    const r = await fetch(`${U}/api/sporcu-ekle`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { studentName: "Erken Sporcu" } }) });
    ok("Doğrulanmadan sunucu sporcu almaz (403)", r.status === 403, r.status);
  }
  await dg.getByRole("button", { name: "Doğruladım" }).click().catch(() => {});
  await bekle(p, 1500);
  ok("Bağlantıya dokunmadan 'Doğruladım' yetmez", /Henüz doğrulanmadı/.test(await metin(p)));
  if (kod1) await fetch(kod1.oobLink);
  await dg.getByRole("button", { name: "Doğruladım" }).click().catch(() => {});
  await dg.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  ok("Bağlantıdan sonra 'Doğruladım' ile uygulama açılır", (await dg.count()) === 0);

  const sordu = await ilkAcilis(p, "Foça Yelken");
  ok("Kulüp sorusu gelir, listeden Foça seçilir", sordu);
  await bekle(p, 2000);
  await p.shot("ana-sayfa");
  const ana = await metin(p);
  ok("Ana sayfada Hesaplar para kutusu yok", !/Hesaplar · toplam/.test(ana), ana.slice(0, 200));
  ok("Ana sayfada güncelleme notu yok", !/Güncellendi ·/.test(ana));
  ok("Ana sayfada Yönet ve Velora Sailing var", /YÖNET/i.test(ana) && /Velora Sailing/.test(ana));

  // 3. Ayarlar
  console.log("\n  3. Ayarlar");
  await p.goto(`${U}/settings`, { waitUntil: "domcontentloaded" });
  await p.getByRole("link", { name: "Paketim" }).waitFor({ timeout: 60000 }).catch(() => {});
  const ay = await metin(p);
  await p.shot("ayarlar");
  ok("Ayarlar › Paketim: Ücretsiz · 3 sporcu, 0 / 3", /(Ücretsiz|ÜCRETS[İI]Z) · 3 sporcu/i.test(ay) && /0 \/ 3/.test(ay), ay.slice(0, 200));
  ok("Uygulamanın harcamaları ve Geliştirici yok", !/Google Gemini/.test(ay) && !/Geliştirici/.test(ay));

  // 4. Takvim: plan ekle
  console.log("\n  4. Takvim");
  await p.goto(`${U}/calendar`, { waitUntil: "domcontentloaded" });
  await p.getByRole("button", { name: "+ Plan" }).click({ timeout: 60000 });
  const d = p.getByRole("dialog").last();
  await d.locator("input[type=text], input:not([type]), textarea").first().fill("Optimist antrenmanı");
  await d.getByRole("button", { name: "Kaydet", exact: true }).click();
  await bekle(p, 2500);
  await p.shot("takvim");
  ok("Takvime plan eklenir", /1 KAYIT/i.test(await metin(p)) && /Optimist/.test(await metin(p)));

  // 5. Sporcular: 3 ücretsiz, 4.'de sınır
  console.log("\n  5. Sporcular ve sınır");
  await p.goto(`${U}/athletes`, { waitUntil: "domcontentloaded" });
  await p.getByText("Henüz sporcu yok").waitFor({ timeout: 60000 }).catch(() => {});
  ok("Boş listede 'Henüz sporcu yok'", /Henüz sporcu yok/.test(await metin(p)));
  const ekle = async (ad) => {
    await p.getByRole("button", { name: /Sporcu/ }).first().click();
    const f = p.getByPlaceholder("Ad soyad", { exact: true });
    if (!(await f.isVisible({ timeout: 5000 }).catch(() => false))) return false;
    await f.fill(ad);
    await p.getByRole("button", { name: "Ekle", exact: true }).click();
    await p.getByText(`${ad} eklendi`).waitFor({ timeout: 20000 });
    await bekle(p, 1500);
    return true;
  };
  let eklendi = 0;
  for (const ad of ["Ayşe Deniz", "Mert Rüzgar", "Ela Yelken"]) if (await ekle(ad).catch(() => false)) eklendi++;
  ok("3 sporcu eklenir", eklendi === 3, eklendi);
  await p.getByRole("button", { name: /Sporcu/ }).first().click();
  const dolu = p.getByRole("dialog", { name: /3 sporcu hakkın doldu/ });
  await dolu.waitFor({ timeout: 10000 }).catch(() => {});
  await p.shot("hak-doldu");
  ok("4. sporcuda '3 sporcu hakkın doldu' penceresi", (await dolu.count()) > 0 || /3 sporcu hakkın doldu/.test(await metin(p)));
  await p.getByRole("button", { name: "Vazgeç" }).last().click().catch(() => {});

  const { token, uid } = await idToken(ANTRENOR.email);
  const r402 = await fetch(`${U}/api/sporcu-ekle`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { studentName: "Kaçak Sporcu" } }) });
  ok("Sunucu 4. sporcuyu reddeder (402)", r402.status === 402, r402.status);
  const rFs = await fetch(fsUrl(`orgs/${uid}/athletes`), { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { studentName: { stringValue: "Kaçak" } } }) });
  ok("Kurallar: istemci Firestore'a doğrudan sporcu yazamaz", rFs.status === 403, rFs.status);
  const rPk = await fetch(`${fsUrl(`users/${uid}`)}?updateMask.fieldPaths=paket`, { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { paket: { mapValue: { fields: { size: { integerValue: "20" } } } } } }) });
  ok("Kurallar: kullanıcı kendine paket yazamaz", rPk.status === 403, rPk.status);

  // 6. Sporcuya uygulama hesabı, sporcu girişi
  console.log("\n  6. Sporcuya uygulama hesabı");
  await p.getByRole("button", { name: "Uygulamaya ekle" }).click();
  await p.locator("li", { hasText: "Ayşe Deniz" }).first().click();
  await p.getByRole("button", { name: /sporcuya hesap aç/ }).click();
  const hs = p.getByRole("dialog").last();
  await hs.locator('button[type="submit"]').click({ timeout: 20000 });
  await p.getByText("Hesap açıldı").waitFor({ timeout: 30000 }).catch(() => {});
  await p.shot("hesap-acildi");
  const hm = await metin(p);
  kul = hm.match(/Kullanıcı adı ([a-z0-9.]+)/)?.[1];
  sif = hm.match(/Şifre ([A-Za-z0-9]{6,})/)?.[1];
  ok("Sporcuya hesap açılır (kullanıcı adı ve şifre gösterilir)", !!(kul && sif), hm.slice(0, 200));
  await p.getByRole("button", { name: "Tamam" }).click().catch(() => {});
  if (kul && sif) {
    const s = await yeni("sporcu");
    await girisYap(s, kul, sif);
    await s.getByText(/Hoş geldin, Ayşe/).waitFor({ timeout: 30000 }).catch(() => {});
    await s.shot("sporcu-giris");
    ok("Sporcu kendi hesabıyla girer, karşılamayı görür", /Hoş geldin, Ayşe/.test(await metin(s)));
    await s.context().close();
  }

  // 7. Paket seç, havale, Ödemeyi yaptım
  console.log("\n  7. Paket ve havale");
  await p.goto(`${U}/settings/paket`, { waitUntil: "domcontentloaded" });
  await p.getByRole("radio", { name: /10 sporcu/ }).click({ timeout: 60000 });
  await p.getByRole("button", { name: "10 sporcuya geç" }).click();
  await p.getByText("Havale bilgisi").waitFor({ timeout: 20000 }).catch(() => {});
  const hv = await metin(p);
  await p.shot("havale");
  ok("Havale bilgisi: tutar 149 ₺, IBAN, alıcı, açıklama kodu", /149 ₺/.test(hv) && hv.includes(IBAN) && /Deneme Alıcı/.test(hv) && /VLR-[A-Z0-9]{6}/.test(hv), hv.slice(0, 300));
  await p.getByRole("button", { name: "Ödemeyi yaptım" }).click();
  await p.getByText(/onay bekliyor/).first().waitFor({ timeout: 20000 }).catch(() => {});
  ok("Ödemeyi yaptım › 'onay bekliyor'", /onay bekliyor/.test(await metin(p)));

  // 8. Admin onayı
  console.log("\n  8. Admin onayı");
  await a.goto(`${U}/settings/admin/paketler`, { waitUntil: "domcontentloaded" });
  await a.getByText("Onay bekleyen ödemeler").waitFor({ timeout: 60000 }).catch(() => {});
  const am = await metin(a);
  await a.shot("onay-bekleyen");
  ok("Admin'de onay bekleyen ödeme: antrenör, 149 ₺, kod", /Onay bekleyen ödemeler|ONAY BEKLEYEN ÖDEMELER/.test(am) && am.includes(ANTRENOR.ad) && /149 ₺/.test(am), am.slice(0, 300));
  ok("Admin kullanıcı listesinde antrenörün kulübü ve 3 / 3 sporcu", /Foça/.test(am) && /3 \/ 3/.test(am));
  await a.getByRole("button", { name: "Onayla" }).click();
  await a.getByText("Paket açıldı").waitFor({ timeout: 20000 }).catch(() => {});
  await bekle(a, 2000);
  ok("Onaylanınca listede 3 / 10", /3 \/ 10/.test(await metin(a)));

  // 9. Antrenör: yeni paket, 4. sporcu
  console.log("\n  9. Paket açıldı");
  await p.goto(`${U}/settings`, { waitUntil: "domcontentloaded" });
  await p.getByRole("link", { name: "Paketim" }).waitFor({ timeout: 60000 }).catch(() => {});
  await bekle(p, 1500);
  ok("Ayarlar › Paketim: 10 sporcu, 3 / 10, 7 hak", /10 sporcu/i.test(await metin(p)) && /3 \/ 10/.test(await metin(p)) && /7 hak kaldı/.test(await metin(p)));
  await p.goto(`${U}/athletes`, { waitUntil: "domcontentloaded" });
  await p.getByText("Ela Yelken").waitFor({ timeout: 60000 }).catch(() => {});
  await bekle(p, 3000); // profil (paket) güncellensin
  ok("4. sporcu artık eklenir", await ekle("Kaan Dalga").catch(() => false));
  await p.shot("sporcular-son");

  // 10. Şifremi unuttum
  console.log("\n  10. Şifremi unuttum");
  const q = await yeni("sifre");
  await q.goto(`${U}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await q.getByLabel("E-posta ya da kullanıcı adı").fill(ANTRENOR.email, { timeout: 60000 });
  await q.getByRole("button", { name: "Devam" }).click();
  await q.getByRole("button", { name: "Şifremi unuttum" }).click({ timeout: 30000 });
  await q.getByText("E-postanı kontrol et").waitFor({ timeout: 20000 }).catch(() => {});
  await q.shot("sifremi-unuttum");
  ok("'Şifremi unuttum' › 'E-postanı kontrol et'", /E-postanı kontrol et/.test(await metin(q)));
  const kod2 = (await oobKodlar()).find((c) => c.email === ANTRENOR.email && c.requestType === "PASSWORD_RESET");
  ok("Şifre sıfırlama e-postası gönderildi", !!kod2);

  // 11. Tanıtım sayfaları (herkese açık, girişsiz)
  console.log("\n  11. Tanıtım sayfaları");
  for (const yol of ["/tanitim", "/tanitim/kisa", "/tanitim/simulator"]) {
    const r = await fetch(`${U}${yol}`);
    const h = r.ok ? await r.text() : "";
    ok(`${yol} açılır (200, video var)`, r.status === 200 && /<video|\.mp4/.test(h), r.status);
  }
  {
    const r = await fetch(`${U}/tanitim/gun-t.mp4`, { headers: { range: "bytes=0-1023" } });
    ok("Tanıtım videosu iner (gun-t.mp4)", r.status === 200 || r.status === 206, r.status);
    await r.arrayBuffer().catch(() => {});
  }

  // 12. "Velora'ya katıl" formu → Admin › Başvurular. Antrenör de "owner" olduğu için başvuru Velora sahibine gitmeli.
  console.log("\n  12. Velora'ya katıl formu");
  {
    const r = await fetch(`${U}/api/basvuru`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rol: "Antrenör", ad: "Ali Veli", tel: "0532", mail: "x@ornek.com", kulup: "Didim Yelken" }) });
    ok("Hatalı telefonla başvuru reddedilir (400)", r.status === 400, r.status);
  }
  const t = await yeni("tanitim");
  await t.goto(`${U}/tanitim`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await bekle(t, 1500);
  await t.shot("tanitim");
  await t.evaluate(() => {
    const f = document.querySelector(".jn form");
    f.ad.value = "Selin Rüzgar";
    f.tel.value = "532 765 43 21";
    f.mail.value = "selin@ornek.com";
    f.kulup.value = "Didim Yelken, Aydın";
    [...f.querySelectorAll(".rl button")].find((b) => b.textContent.trim() === "Kulüp")?.click();
    f.requestSubmit();
  });
  await t.getByText("Başvurun alındı").waitFor({ timeout: 20000, state: "attached" }).catch(() => {});
  ok("Tanıtım › Başvur › 'Başvurun alındı'", /Başvurun alındı/.test(await t.content()));
  await t.context().close();
  await a.goto(`${U}/settings/admin`, { waitUntil: "domcontentloaded" });
  await a.getByText("Selin Rüzgar").first().waitFor({ timeout: 60000 }).catch(() => {});
  await a.shot("basvurular");
  const bm = await metin(a);
  ok("Admin › Başvurular'da başvuru görünür (ad, kulüp)", /Selin Rüzgar/.test(bm) && /Didim Yelken/.test(bm), bm.slice(0, 300));

  // Admin › Açılış: işaret kaydedilir, sayfa yenilenince durur
  await a.goto(`${U}/settings/admin`, { waitUntil: "domcontentloaded" });
  await a.getByRole("link", { name: /Açılış/ }).click({ timeout: 60000 });
  const iban = a.getByRole("checkbox", { name: /IBAN ve alıcı adı girildi/ });
  await iban.click({ timeout: 60000 });
  await bekle(a, 2000);
  await a.reload({ waitUntil: "domcontentloaded" });
  await a.getByRole("checkbox", { name: /IBAN ve alıcı adı girildi/ }).waitFor({ timeout: 60000 }).catch(() => {});
  await bekle(a, 1500);
  await a.shot("acilis");
  ok("Admin › Açılış: işaret kaydedilir, yenileyince durur", (await a.getByRole("checkbox", { name: /IBAN ve alıcı adı girildi/ }).getAttribute("aria-checked").catch(() => "")) === "true");

  // 13. Yönet ve Fitness (antrenör)
  console.log("\n  13. Yönet ve Fitness");
  await p.goto(`${U}/bilgi/yonet`, { waitUntil: "domcontentloaded" });
  await p.getByText("Günü başlat").first().waitFor({ timeout: 60000 }).catch(() => {});
  await p.shot("yonet");
  ok("Yönet açılır ('Günü başlat')", /Günü başlat|GÜNÜ BAŞLAT/.test(await metin(p)));
  await p.goto(`${U}/fitness`, { waitUntil: "domcontentloaded" });
  const hz = p.getByRole("button", { name: "Hazır programlar" }).first();
  await hz.waitFor({ timeout: 60000 }).catch(() => {});
  let hzAcik = false;
  if (await hz.count()) {
    await hz.click().catch(() => {});
    await bekle(p, 1500);
    hzAcik = (await p.getByRole("dialog").count()) > 0;
  }
  await p.shot("hazir-programlar");
  ok("Fitness › Hazır programlar açılır", hzAcik);
  await p.keyboard.press("Escape").catch(() => {});

  // 14. Veri ayrılığı: ikinci antrenör birincinin hiçbir verisini görmez (ekranda ve kurallarda)
  console.log("\n  14. İki hesabın verisi ayrı");
  const B = { ad: "Ege Antrenör", email: "ikinci@ornek.local" };
  const b = await yeni("antrenor2");
  await kaydol(b, B.ad, B.email);
  const kodB = (await oobKodlar()).find((c) => c.email === B.email && c.requestType === "VERIFY_EMAIL");
  if (kodB) await fetch(kodB.oobLink);
  const dgB = b.getByRole("dialog", { name: "E-posta doğrulama" });
  await dgB.getByRole("button", { name: "Doğruladım" }).click({ timeout: 45000 }).catch(() => {});
  await dgB.waitFor({ state: "detached", timeout: 20000 }).catch(() => {});
  await ilkAcilis(b, "");
  await b.goto(`${U}/athletes`, { waitUntil: "domcontentloaded" });
  await b.getByText("Henüz sporcu yok").waitFor({ timeout: 60000 }).catch(() => {});
  const bs = await metin(b);
  await b.shot("sporcular");
  ok("İkinci antrenör: sporcu listesi boş, birincinin sporcuları yok", /Henüz sporcu yok/.test(bs) && !/Ayşe Deniz|Mert Rüzgar|Kaan Dalga/.test(bs), bs.slice(0, 200));
  await b.goto(`${U}/calendar`, { waitUntil: "domcontentloaded" });
  await b.getByRole("button", { name: "+ Plan" }).waitFor({ timeout: 60000 }).catch(() => {});
  await bekle(b, 2000);
  ok("İkinci antrenör: takviminde birincinin planı yok", !/Optimist antrenmanı/.test(await metin(b)));
  const tb = await idToken(B.email);
  const ta = { token, uid };
  const adm = await idToken(VELORA_ADMIN);
  const oku = async (kim, yol) => (await fetch(fsUrl(yol), { headers: { authorization: `Bearer ${kim.token}` } })).status;
  ok("Kurallar: 2. antrenör 1.'nin sporcularını okuyamaz", (await oku(tb, `orgs/${ta.uid}/athletes`)) === 403);
  ok("Kurallar: 2. antrenör 1.'nin planlarını okuyamaz", (await oku(tb, `orgs/${ta.uid}/plans`)) === 403);
  ok("Kurallar: 1. antrenör 2.'nin planlarını okuyamaz", (await oku(ta, `orgs/${tb.uid}/plans`)) === 403);
  ok("Kurallar: antrenör ana hesabın başvurularını okuyamaz", (await oku(ta, `orgs/${adm.uid}/basvurular`)) === 403);
  ok("Kurallar: antrenör ana hesabın sporcularını okuyamaz", (await oku(ta, `orgs/${adm.uid}/athletes`)) === 403);
  {
    const r = await fetch(fsUrl(`orgs/${ta.uid}/plans`), { method: "POST", headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { title: { stringValue: "Sızma" } } }) });
    ok("Kurallar: 2. antrenör 1.'nin takvimine yazamaz", r.status === 403, r.status);
  }
  {
    const r = await fetch(`${fsUrl(`users/${tb.uid}`)}?updateMask.fieldPaths=role&updateMask.fieldPaths=orgId`, { method: "PATCH", headers: { authorization: `Bearer ${tb.token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { orgId: { stringValue: ta.uid }, role: { stringValue: "staff" } } }) });
    ok("Kurallar: kendini başkasının ekibine yazamaz", r.status === 403, r.status);
  }
  await b.context().close();

  // 15. Yetki: Admin yalnız Velora sahibinde; sporcu ana hesap alanlarına giremez
  console.log("\n  15. Yetki");
  await p.goto(`${U}/settings/admin`, { waitUntil: "domcontentloaded" });
  await bekle(p, 4000);
  ok("Antrenörde Admin sayfası boş (Başvurular yok)", !/Başvurular|Selin Rüzgar/.test(await metin(p)));
  ok("Antrenör Ayarlar'ında Admin satırı yok", await (async () => {
    await p.goto(`${U}/settings`, { waitUntil: "domcontentloaded" });
    await p.getByRole("link", { name: "Paketim" }).waitFor({ timeout: 60000 }).catch(() => {});
    return !(await p.getByRole("link", { name: /^Admin/ }).count());
  })());
  if (kul && sif) {
    const { loginEmail } = await import("../../src/lib/kinds.js");
    const sp = await idToken(loginEmail(kul), sif);
    ok("Kurallar: sporcu antrenörün sporcu listesini okuyamaz", (await oku(sp, `orgs/${ta.uid}/athletes`)) === 403);
    ok("Kurallar: sporcu ana hesabın başvurularını okuyamaz", (await oku(sp, `orgs/${adm.uid}/basvurular`)) === 403);
    {
      const r = await fetch(`${fsUrl(`users/${sp.uid}`)}?updateMask.fieldPaths=role`, { method: "PATCH", headers: { authorization: `Bearer ${sp.token}`, "content-type": "application/json" }, body: JSON.stringify({ fields: { role: { stringValue: "owner" } } }) });
      ok("Kurallar: sporcu kendini ana hesap yapamaz", r.status === 403, r.status);
    }
    const s = await yeni("sporcu2");
    await girisYap(s, kul, sif);
    await s.getByText(/Hoş geldin, Ayşe/).waitFor({ timeout: 30000 }).catch(() => {});
    const sm = await metin(s);
    ok("Sporcu ana sayfasında Yönet, Hesaplar, Admin yok", !/YÖNET|Hesaplar · toplam|Admin/i.test(sm.replace(/Velora/g, "")), sm.slice(0, 200));
    await s.goto(`${U}/settings/admin`, { waitUntil: "domcontentloaded" });
    await bekle(s, 4000);
    ok("Sporcu Admin sayfasını göremez", !/Başvurular|Selin Rüzgar/.test(await metin(s)));
    await s.context().close();
  }

  ok("Sayfa hatası yok", !hatalar.length, hatalar.map((h) => h.slice(0, 200)).slice(0, 5).join(" | "));
  if (hatalar.length) (await import("node:fs")).writeFileSync(`${OUT}hatalar.txt`, hatalar.join("\n\n"));
} catch (e) {
  ok("Test tamamlandı", false, e.message.split("\n")[0]);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await server.stop();
  if (emu) await emu.stop();
}
const kalan = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - kalan.length}/${rows.length} geçti · ${Math.round((Date.now() - T0) / 1000)} sn${kalan.length ? `\nKALAN:\n${kalan.map((r) => `  ✗ ${r.adim}`).join("\n")}` : ""}`);
process.exit(kalan.length ? 1 : 0);
