// Kullanıcının kendi Gmail hesabında çalışan Google Apps Script (script.google.com). Kurulumda bir kez yapıştırılır.
// Mailleri DOĞRUDAN Firebase veritabanına yazar (Netlify sunucusu ve gizli anahtar gerekmez): kimlik olarak
// kullanıcının kendi Google hesabı kullanılır (ScriptApp.getOAuthToken, "datastore" izni). Bu yüzden betiği çalıştıran
// Google hesabının Firebase projesinde yetkisi olmalı (projeyi açan hesap zaten sahibidir).
//   - 5 dakikada bir: takip edilen gönderenlerden (İş Bankası sabit + uygulamada eklenenler) son 2 günün yeni mailleri
//   - Her mail: orgs/{uid}/mails/{gmail id} (aynı mail iki kez yazılmaz); Excel ekleri base64 olarak (uygulama okur)
//   - users/{uid}: mailSeen (son kontrol), mailPending/mailLastAt (toplu bildirim için), mailOutbox (bu sürüm gönderebilir)
//   - Kendine mail: uygulamanın orgs/{uid}/outbox'a bıraktığı dosyalar (ör. yarış evrakı) bu Gmail hesabına ekli
//     mail olarak gönderilir, kayıt silinir (outbox.js)
//   - Yeni mail varsa hemen sitenin /api/mail/push adresine haber verir → telefona bildirim (aynı Google anahtarıyla;
//     sunucunun hizmet hesabı anahtarı gerekmez). Ulaşılamazsa 5 dakikalık zamanlanmış görev yedek olarak bildirir.
// Uygulama Gmail'e hiç istek atmaz: betik 5 dakikada bir kendisi bakar, uygulama veritabanını canlı dinler.
// String.raw: betikteki ters bölüler (\.) olduğu gibi kalsın.

import { FIXED_SENDERS } from "../../lib/bankSheet.js";

export const gmailScript = ({ project, uid, site }) => String.raw`// Sesli Asistan › Gmail bağlantısı
// Seçtiğin gönderenlerden gelen mailleri doğrudan uygulamanın veritabanına kaydeder.
// Kurulum: üstteki listeden "kur" seç, Çalıştır'a bas ve izin ver (bir kez).
const PROJE = "${project}";
const KULLANICI = "${uid}";
const SITE = "${site}"; // bildirim bu siteden gönderilir
const SABIT = ${JSON.stringify(FIXED_SENDERS.map(({ name, from }) => ({ name, from })))}; // her zaman takip edilir
const FS = "https://firestore.googleapis.com/v1/projects/" + PROJE + "/databases/(default)/documents/";

function kur() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("kontrol").timeBased().everyMinutes(5).create();
  console.log("Kuruldu: her 5 dakikada bir kontrol edilecek.");
  kontrol();
}

function kontrol() {
  var kilit = LockService.getScriptLock();
  if (!kilit.tryLock(20000)) return 0;
  try {
    var kisi = istek("get", "users/" + KULLANICI);
    if (kisi.kod !== 200) {
      console.log("Veritabanına bağlanılamadı (" + kisi.kod + "): " + hata(kisi) + ipucu(kisi.kod));
      return 0;
    }
    var eklenen = (oku((kisi.veri.fields || {}).mailFrom) || []).filter(function (r) { return r && r.from; });
    var kurallar = SABIT.concat(eklenen);
    var adresler = kurallar.map(function (r) { return String(r.from).toLowerCase(); }).filter(function (x, i, a) { return a.indexOf(x) === i; });

    var ozellik = PropertiesService.getScriptProperties();
    var gorulen = JSON.parse(ozellik.getProperty("gorulen") || "[]");
    var yeni = 0;
    var ara = "(" + adresler.map(function (f) { return "from:" + f; }).join(" OR ") + ") newer_than:2d";
    GmailApp.search(ara, 0, 30).forEach(function (konu) {
      konu.getMessages().forEach(function (m) {
        var id = m.getId();
        if (gorulen.indexOf(id) >= 0 || Date.now() - m.getDate().getTime() > 2 * 864e5) return;
        var kimden = m.getFrom();
        var adres = ((kimden.match(/<([^>]+)>/) || [])[1] || kimden).trim().toLowerCase();
        var kural = kurallar.filter(function (r) { return eslesir(adres, r.from); })[0];
        if (!kural) return;
        var adlar = [], ekler = [];
        m.getAttachments().forEach(function (a) {
          adlar.push(a.getName());
          if (/\.(xlsx?|csv)$/i.test(a.getName()) && a.getSize() < 600000) ekler.push({ name: a.getName(), data: Utilities.base64Encode(a.getBytes()) });
        });
        var belge = {
          rule: kural.name || "",
          from: adres,
          fromName: ((kimden.match(/^\s*"?([^"<]+?)"?\s*</) || [])[1] || "").slice(0, 80),
          subject: m.getSubject() || "",
          at: m.getDate().toISOString(),
          receivedAt: new Date().toISOString(),
          text: (m.getPlainBody() || "").slice(0, 8000),
          files: adlar,
          raw: ekler,
          notified: false
        };
        var r = istek("post", "orgs/" + KULLANICI + "/mails?documentId=" + id, { fields: alanlar(belge) });
        if (r.kod === 200) { yeni++; gorulen.push(id); }
        else if (r.kod === 409) gorulen.push(id); // zaten kayıtlı
        else console.log("Kaydedilemedi (" + r.kod + "): " + hata(r));
      });
    });
    ozellik.setProperty("gorulen", JSON.stringify(gorulen.slice(-300)));
    var giden = 0;
    try { giden = gonder(); } catch (e) { console.log("Giden mailler: " + e.message); }

    var simdi = new Date().toISOString();
    var durum = { mailSeen: simdi, mailOutbox: true };
    if (yeni) { durum.mailPending = true; durum.mailLastAt = simdi; }
    var maske = Object.keys(durum).map(function (k) { return "updateMask.fieldPaths=" + k; }).join("&");
    istek("patch", "users/" + KULLANICI + "?" + maske, { fields: alanlar(durum) });
    if (yeni) bildir();
    console.log("Kontrol bitti. Yeni mail: " + yeni + (giden ? ", gönderilen: " + giden : ""));
    return yeni;
  } finally {
    kilit.releaseLock();
  }
}

// Kendine mail: uygulamanın bıraktığı dosyaları bu Gmail hesabına gönderir (parçalar birleştirilir), kaydı siler.
// Gönderilemeyen kayıt 3 denemeden sonra bırakılır (uygulamadan yeniden gönderilebilir).
function gonder() {
  var liste = istek("get", "orgs/" + KULLANICI + "/outbox?pageSize=10");
  if (liste.kod !== 200) return 0;
  var kime = Session.getEffectiveUser().getEmail();
  var sayi = 0;
  (liste.veri.documents || []).forEach(function (d) {
    var yol = d.name.split("/documents/")[1];
    var k = {};
    Object.keys(d.fields || {}).forEach(function (a) { k[a] = oku(d.fields[a]); });
    if ((k.tries || 0) >= 3) return;
    var p = istek("get", yol + "/parts?pageSize=100");
    var parcalar = (p.veri.documents || []).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    try {
      if (p.kod !== 200 || parcalar.length !== k.parts) throw new Error("dosya eksik (" + parcalar.length + "/" + k.parts + ")");
      var veri = parcalar.map(function (x) { return oku((x.fields || {}).data) || ""; }).join("");
      var ek = Utilities.newBlob(Utilities.base64Decode(veri), k.mimeType || "application/pdf", k.fileName || "belge.pdf");
      GmailApp.sendEmail(kime, k.subject || "Sesli Asistan", k.text || "", { attachments: [ek], name: "Sesli Asistan" });
      parcalar.forEach(function (x) { istek("delete", x.name.split("/documents/")[1]); });
      istek("delete", yol);
      sayi++;
    } catch (e) {
      console.log("Mail gönderilemedi (" + (k.fileName || "") + "): " + e.message);
      istek("patch", yol + "?updateMask.fieldPaths=tries&updateMask.fieldPaths=error", { fields: alanlar({ tries: (k.tries || 0) + 1, error: String(e.message).slice(0, 200) }) });
    }
  });
  return sayi;
}

// Telefona bildirim: uygulama yeni mailleri tek bildirimde gönderir
function bildir() {
  try {
    var r = UrlFetchApp.fetch(SITE + "/api/mail/push", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ uid: KULLANICI }),
      muteHttpExceptions: true
    });
    console.log("Bildirim (" + r.getResponseCode() + "): " + r.getContentText().slice(0, 200));
  } catch (e) {
    console.log("Bildirim gönderilemedi: " + e.message + " (5 dakika içinde yeniden denenir)");
  }
}

// ---- yardımcılar ----
function eslesir(adres, kural) {
  var f = String(kural || "").toLowerCase().replace(/^@/, "");
  if (!f) return false;
  if (f.indexOf("@") >= 0) return adres === f;
  var alan = adres.split("@")[1] || "";
  return alan === f || alan.slice(-(f.length + 1)) === "." + f;
}

function istek(yontem, yol, govde) {
  var secenek = { method: yontem, headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() }, muteHttpExceptions: true };
  if (govde) { secenek.contentType = "application/json"; secenek.payload = JSON.stringify(govde); }
  var r = UrlFetchApp.fetch(FS + yol, secenek);
  var veri = {};
  try { veri = JSON.parse(r.getContentText() || "{}"); } catch (e) {}
  return { kod: r.getResponseCode(), veri: veri };
}

function hata(r) { return ((r.veri && r.veri.error) || {}).message || ""; }

function ipucu(kod) {
  if (kod === 403) return " → Bu Google hesabının Firebase projesinde yetkisi yok ya da appsscript.json'daki izinler eksik.";
  if (kod === 404) return " → Kullanıcı ya da proje bulunamadı; kodu uygulamadan yeniden kopyala.";
  return "";
}

// JavaScript değerini Firestore alanına çevirir (ve tersi)
function deger(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(deger) } };
  if (typeof v === "object") return { mapValue: { fields: alanlar(v) } };
  return { stringValue: String(v) };
}
function alanlar(o) {
  var f = {};
  Object.keys(o).forEach(function (k) { f[k] = deger(o[k]); });
  return f;
}
function oku(v) {
  if (!v) return undefined;
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(oku);
  if ("mapValue" in v) {
    var o = {};
    var f = v.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { o[k] = oku(f[k]); });
    return o;
  }
  return null;
}
`;

// appsscript.json: betiğin istediği izinler (Gmail okuma/gönderme, kendi adresi, veritabanına yazma, dış istek, zamanlayıcı)
export const MANIFEST = JSON.stringify(
  {
    timeZone: "Europe/Istanbul",
    runtimeVersion: "V8",
    exceptionLogging: "STACKDRIVER",
    oauthScopes: [
      "https://mail.google.com/",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/script.external_request",
      "https://www.googleapis.com/auth/script.scriptapp",
    ],
  },
  null,
  2,
);
