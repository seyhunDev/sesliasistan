// HESAP GÖRÜNÜMÜ (Seyhun 2026-11-25 "3 farklı ana sayfa tasarımı ve uygulama yönetimimiz olmalı"): kim neyi görür tek yerde.
// Üç görünüm: "ana" (ana hesap, her şey), "normal" (çalışan, aile, diğer; antrenör de), "sporcu" (sporcu, öğrenci, veli).
// Her görünümün ana sayfası ayrı dosya (features/home: OwnerHome, NormalHome, SporcuHome); alt çubuk (TABS), Tümü ve sol menü
// (homeActions), Ayarlar (settings/page.jsx) buradaki görünüme göre. Ana hesap Ayarlar'dan "… gibi gör" ile ötekilerin düzenine bakar
// (features/auth/useHesap.js). Saf fonksiyonlar; Firestore'a dokunmaz.
import { isAthleteSide } from "./kinds";

export const VIEWS = ["ana", "normal", "sporcu"];
export const VIEW_LABEL = { ana: "Ana hesap", normal: "Normal kullanıcı", sporcu: "Sporcu" };
// "… gibi gör" önizlemesinde kullanılan kişi türü
export const PREVIEW_KIND = { normal: "staff", sporcu: "athlete" };

// role: users.role ("owner" | "staff" | "courier"), kind: useKind() sonucu. Kurye Velora'da değil (Velora Food): "".
export function viewOf(role, kind) {
  if (role === "owner") return "ana";
  if (!role || role === "courier") return "";
  return isAthleteSide(kind) ? "sporcu" : "normal";
}

// Alt çubuk (telefon, dik iPad) ve sol menünün üstü: [href, ad, simge]. "msg" okunmamış sayısını taşır.
// Normal kullanıcı (Seyhun 2026-11-24): Kulüp (Velora Sailing) ve İngilizce; Mesajlar ve Görevler Tümü'de.
export const TABS = {
  ana: [["/", "Ana sayfa", "home"], ["/calendar", "Takvim", "cal"], ["/messages", "Mesajlar", "chat", "msg"], ["/tasks", "Görevler", "task"]],
  normal: [["/", "Ana sayfa", "home"], ["/calendar", "Takvim", "cal"], ["/sailing", "Kulüp", "anchor"], ["/english", "İngilizce", "book"]],
  // Sporcu tarafında Mesajlar yok (Seyhun 2026-11-25 "mesajları şimdilik sporculara göstermeyelim"; /messages ana sayfaya döner)
  sporcu: [["/", "Ana sayfa", "home"], ["/calendar", "Takvim", "cal"], ["/english", "İngilizce", "book"]], // Görevler yerine İngilizce (Seyhun 2026-11-25)
};
export const tabsOf = (view) => TABS[view] || TABS.ana;

// Ana sayfa › İşlemler düğmeleri, gruplu (sıra sabit). o: { staff, owner, side (sporcu/öğrenci/veli), parent, athletes (sporcu yetkisi), plain, coach,
// races (Yarışlar ana sayfada), training, receipts, shop, lessons, fit (antrenörün hazırladığı fitness antrenmanı var) }. Toplantı bir sayfa değil: { id: "meeting" } döner.
// Dönüş: [{ title, items: [{ href | id, icon, label }] }]; boş grup çıkmaz.
export function homeActions(o) {
  // Tümü penceresi 6 açılır grup (Seyhun 2026-11-01 "A · Açılır gruplar"): aynı sayfaya giden ikinci düğme yok
  // ("Tüm yarışlar" = Yarışlar sayfasının Takvim sekmesi, "Ant. günlüğü" Antrenman'ın içinde, "Rüzgâr" yerine Hava).
  // o.plain: normal kullanıcı (çalışan, aile, diğer; Seyhun 2026-11-24 "küçük kapsamlı uygulama"): seyrek sayfalar gizli (silinmedi);
  // Mesajlar alt çubuktan çıktığı için menüde. o.coach: antrenörün kendi Yönet'i.
  const full = !o.plain;
  const groups = [
    ["Günlük", [
      { href: "/plans", icon: "cal", label: "Planlar" },
      { href: "/tasks", icon: "task", label: "Görevler" },
      { href: "/notes", icon: "note", label: "Notlar" },
      o.plain && { href: "/messages", icon: "chat", label: "Mesajlar" },
      !o.side && full && { id: "meeting", icon: "mic", label: "Toplantı", hid: true },
      o.side && { href: "/my-attendance", icon: "check", label: o.parent ? "Yoklama" : "Yoklamam" },
      { href: "/birthdays", icon: "cake", label: "Doğum günü", hid: !o.side }, // sporcu tarafında görünür kalır
      full && { href: "/archive", icon: "archive", label: "Arşiv" },
    ]],
    ["Kulüp", [
      o.coach && !o.athletes && { href: "/bilgi/yonet", icon: "clock", label: "Yönet" }, // antrenörün kendi Yönet'i (kendi sporcuları, kendi linki)
      o.athletes && { href: "/athletes", icon: "anchor", label: "Sporcular" },
      o.athletes && { href: "/athletes/attendance", icon: "checks", label: "Yoklama" },
      o.athletes && !o.side && { href: "/bilgi/yonet", icon: "clock", label: "Yönet" }, // süre, yoklama, günlük (2026-11-23; adı Seyhun 2026-11-25)
      !o.athletes && !o.side && full && o.training && { href: "/training", icon: "clock", label: "Antrenman" },
      o.side && { href: "/sailing", icon: "anchor", label: "Velora Sailing" }, // sporcu kendi Velora hesabıyla girer (/api/sailing-giris)
      o.side
        ? { href: "/my-races", icon: "flag", label: "Yarışlarım" } // sporcu yalnız kayıtlı olduğu yarışları görür (Seyhun 2026-11-25)
        : { href: o.races ? "/athletes/races" : "/races", icon: "flag", label: "Yarışlar" }, // Kulübüm · Takvim tek sayfa
      o.athletes && !o.side && { href: "/media", icon: "image", label: "Medya" }, // antrenman ve yarış fotoğraf/videoları (Seyhun 2026-10-22)
      o.athletes && o.owner && { href: "/dues", icon: "wallet", label: "Aidatlar" },
      !o.staff && { href: "/inventory", icon: "box", label: "Envanter" },
    ]],
    ["Para", [
      o.receipts && { href: "/receipts", icon: "receipt", label: "Fiş / Fatura" },
      !o.staff && { href: "/mail", icon: "wallet", label: "Hesaplar" },
    ]],
    ["Hava ve deniz", [
      { href: "/weather", icon: "wind", label: "Hava" }, // bölge haritası rüzgârı da gösterir (eski Rüzgâr düğmesi)
      !o.side && full && { href: "/sea", icon: "map", label: "Gemiler", hid: true }, // gemiler canlı, Sahil Güvenlik, acil (Seyhun 2026-10-23)
      !o.side && full && { href: "/cams", icon: "video", label: "Kameralar", hid: true }, // halka açık canlı kameralar, Windy (Seyhun 2026-10-23)
    ]],
    ["Kişisel", [
      { href: "/fitness", icon: "dumbbell", label: "Fitness" }, // herkeste (Seyhun 2026-11-25 "normal kullanıcı ve sporcular da fitness görebilmeli")
      { href: "/english", icon: "chat", label: "İngilizce" }, // kelimeler ve kalıplar; sporcuda da (Seyhun 2026-11-25), ilerlemesi kendi cihazında
      o.shop && { href: "/shopping", icon: "cart", label: "Alışveriş" },
      o.lessons && full && { href: "/schedule", icon: "book", label: "Dersler", hid: true },
    ]],
    ["Kişiler ve sosyal", [
      !o.staff && { href: "/people/staff", icon: "users", label: "Kişiler" },
      !o.staff && { href: "/posts", icon: "instagram", label: "Instagram", brand: "instagram", hid: true },
      !o.staff && { href: "/events", icon: "tent", label: "Etkinlikler" },
    ]],
  ];
  // Seyrek sayfalar (Seyhun 2026-11-25 "gizli olarak, tıkladığımda açılabilir bir yerde tutalım"): kendi gruplarından çıkar, en sonda kapalı "Gizli" grubunda
  const all = groups.map(([title, items]) => ({ title, items: items.filter(Boolean) }));
  const hid = all.flatMap((g) => g.items.filter((a) => a.hid));
  return [...all.map((g) => ({ ...g, items: g.items.filter((a) => !a.hid) })), { title: "Gizli", items: hid }].filter((g) => g.items.length);
}
