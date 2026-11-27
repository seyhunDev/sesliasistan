// AÇILIŞ MASASI (Seyhun 2026-11-27 "herkese açmadan önce… ben adminden yöneteceğim"): Ayarlar › Admin › Açılış'ın içeriği tek yerde.
// Saf veri; işaretler Firestore'da orgs/{org}/ayar/acilis (yalnız ana hesap). Madde kimliği (id) değişirse eski işaret kaybolur.
// Otomatik test özeti `npm run test:yeni-kullanici` çıktısından elle güncellenir (OTO_TARIH, OTO).

const APP = "https://sesliasistan.netlify.app";

// Bağlantılar: [ad, adres, kısa açıklama]. "/" ile başlayan uygulama içidir.
export const BAGLANTILAR = [
  ["Kısa tanıtım", "/tanitim/kisa", "Paylaşılacak kısa video"],
  ["Tanıtım", "/tanitim", "Sonda Velora'ya katıl formu"],
  ["Simülatör tanıtımı", "/tanitim/simulator", ""],
  ["Giriş ekranı", "/login", `${APP.replace("https://", "")}/login`],
  ["Kayıt ekranı", "/register", "Kayıt kapalıyken başvuru formu"],
  ["Paketler", "/settings/admin/paketler", "IBAN, onay bekleyen ödemeler"],
  ["Paketim", "/settings/paket", "Antrenörün gördüğü paket ekranı"],
  ["Firestore kuralları", "https://claude.ai/artifact/Dn1GQSRG1q4Jz5HaVLrvtR", "Kopyala, konsolda yayınla"],
  ["Firebase e-postaları", "https://console.firebase.google.com/project/sesliasistan-3e95a/authentication/emails", "Doğrulama ve şifre sıfırlama"],
  ["Netlify ayarları", "https://app.netlify.com/sites/sesliasistan/configuration/env", "Kaydı açma ayarı"],
  ["GitHub Actions", "https://github.com/seyhunDev/sesliasistan/actions", "Yayın ve testler"],
];
export const disLink = (u) => /^https?:/.test(u);
export const tamAdres = (u) => (disLink(u) ? u : APP + u);

// Açılıştan önce yapılacaklar
export const KALANLAR = [
  { id: "iban", ad: "IBAN ve alıcı adı girildi", alt: "Admin › Paketler" },
  { id: "kvkk", ad: "KVKK ve gizlilik metni hazır", alt: "Uygulamada henüz yok" },
  { id: "mail", ad: "E-postalarda gönderen adı Velora", alt: "Firebase e-posta şablonları" },
  { id: "kural", ad: "Firestore kuralları yayınlandı", alt: "Paketler ve e-posta doğrulama dahil" },
  { id: "sailing", ad: "Velora Sailing: yeni hesap sahip olmuyor", alt: "Ayrı proje" },
  { id: "dikili", ad: "Dikili kulüp sitesi mesajı", alt: "Bekletiliyor" },
  { id: "yedek", ad: "Veritabanı yedeği seçildi", alt: "Güvenlik taraması planı" },
  { id: "ac", ad: "Kayıt açıldı", alt: "Netlify: NEXT_PUBLIC_ALLOW_SIGNUP = 1, sonra yayın" },
];

// Cihaz testleri: gruplar, her madde tek cümle
export const CIHAZ = [
  { id: "gercek", ad: "Kayıt açılınca, gerçek e-postayla", m: [
    "Yeni bir e-postayla Kayıt ol › Sailing ile hesap aç.",
    "Doğrulama e-postası 2 dakikada geliyor (gereksiz kutusuna da bak).",
    "Bağlantıya dokun, Doğruladım'a bas; uygulama açılıyor.",
    "Kulüp sorusunda kulübünü listeden seç.",
    "Çıkış yap, Şifremi unuttum ile yeni şifre koy ve gir.",
    "3 sporcu ekle; 4.'de '3 sporcu hakkın doldu' çıkıyor.",
    "Paketim › 10 sporcu: IBAN, tutar ve açıklama kodu doğru.",
    "Ödemeyi yaptım'a bas; sana bildirim geliyor.",
    "Admin › Paketler › Onayla; antrenörde 10 sporcu oluyor.",
    "Deneme hesabını sonra sil.",
  ] },
  { id: "iphone", ad: "iPhone · Safari", m: [
    "Site açılıyor, giriş ekranı ekrana sığıyor.",
    "Giriş yap; ana sayfa yana kaymıyor, alt çubuk görünüyor.",
    "Paylaş › Ana Ekrana Ekle; simgeden tam ekran açılıyor.",
    "Takvim › + Plan ile plan ekle, listede görün.",
    "Sporcular açılıyor, sporcuya dokununca ayrıntı açılıyor.",
    "Yönet açılıyor, Günü başlat görünüyor.",
    "Fitness › Hazır programlar açılıyor.",
    "Asistana basılı tutup konuş; cevap veriyor.",
    "/tanitim/kisa sesli oynuyor, dikey ekrana sığıyor.",
    "Katıl formu klavye açıkken de görünüyor.",
    "Telefon yatayken sayfalar bozulmuyor.",
  ] },
  { id: "android", ad: "Android · Chrome", m: [
    "Site açılıyor, giriş yapılıyor.",
    "Ana ekrana ekle (Uygulamayı yükle) çalışıyor.",
    "Takvim'e plan ekleniyor, Sporcular ve Yönet açılıyor.",
    "Asistan mikrofon izni istiyor, konuşunca çalışıyor.",
    "Bildirim izni veriliyor, deneme bildirimi geliyor.",
    "/tanitim/kisa oynuyor, geri tuşu doğru çıkıyor.",
    "Klavye açıkken düğmeler kapanmıyor.",
  ] },
  { id: "ipad", ad: "iPad", m: [
    "Yatayda sol menü ve geniş ana sayfa görünüyor.",
    "Dikeyde alt çubuk görünüyor, taşma yok.",
    "Takvim, Sporcular, Yönet ve Fitness düzgün.",
    "Admin › Başvurular ve Paketler okunuyor.",
    "/tanitim yatayda tablet videolarını gösteriyor.",
  ] },
  { id: "masaustu", ad: "Masaüstü · Chrome ve Safari", m: [
    "Giriş ve kayıt ekranı ortada, okunur.",
    "Sol menüden tüm sayfalara geçiliyor, geri çalışıyor.",
    "Takvim'e plan ekle ve sil; Geri al çalışıyor.",
    "Üç tanıtım sayfası açılıyor, videolar oynuyor.",
    "Katıl formunu doldur; Admin › Başvurular'da görünüyor.",
    "Pencere daralıp genişleyince yazılar binmiyor.",
  ] },
];
export const cihazId = (g, i) => `${g}-${i}`;
export const CIHAZ_SAYI = CIHAZ.reduce((n, g) => n + g.m.length, 0);

// Otomatik testler: npm run test:yeni-kullanici (sahte Firebase, gerçek tarayıcı). Hepsi geçti.
export const OTO_TARIH = "27 Kasım 2026";
export const OTO = [
  { ad: "Velora ana hesabı: havale bilgisi", m: ["Admin › Paketler açılır, IBAN kaydedilir"] },
  { ad: "Yeni antrenör: kayıt ve ilk açılış", m: ["Kayıt olunca ana sayfaya girer", "Kayıttan sonra 'E-postanı doğrula' ekranı", "Doğrulama e-postası gönderildi", "Doğrulanmadan sunucu sporcu almaz (403)", "Bağlantıya dokunmadan 'Doğruladım' yetmez", "Bağlantıdan sonra 'Doğruladım' ile uygulama açılır", "Kulüp sorusu gelir, listeden Foça seçilir", "Ana sayfada Hesaplar para kutusu yok", "Ana sayfada güncelleme notu yok", "Ana sayfada Yönet ve Velora Sailing var"] },
  { ad: "Ayarlar", m: ["Ayarlar › Paketim: Ücretsiz · 3 sporcu, 0 / 3", "Uygulamanın harcamaları ve Geliştirici yok"] },
  { ad: "Takvim", m: ["Takvime plan eklenir"] },
  { ad: "Sporcular ve sınır", m: ["Boş listede 'Henüz sporcu yok'", "3 sporcu eklenir", "4. sporcuda '3 sporcu hakkın doldu' penceresi", "Sunucu 4. sporcuyu reddeder (402)", "Kurallar: istemci Firestore'a doğrudan sporcu yazamaz", "Kurallar: kullanıcı kendine paket yazamaz"] },
  { ad: "Sporcuya uygulama hesabı", m: ["Sporcuya hesap açılır (kullanıcı adı ve şifre gösterilir)", "Sporcu kendi hesabıyla girer, karşılamayı görür"] },
  { ad: "Paket ve havale", m: ["Havale bilgisi: tutar 149 ₺, IBAN, alıcı, açıklama kodu", "Ödemeyi yaptım › 'onay bekliyor'"] },
  { ad: "Admin onayı", m: ["Admin'de onay bekleyen ödeme: antrenör, 149 ₺, kod", "Admin kullanıcı listesinde antrenörün kulübü ve 3 / 3 sporcu", "Onaylanınca listede 3 / 10"] },
  { ad: "Paket açıldı", m: ["Ayarlar › Paketim: 10 sporcu, 3 / 10, 7 hak", "4. sporcu artık eklenir"] },
  { ad: "Şifremi unuttum", m: ["'Şifremi unuttum' › 'E-postanı kontrol et'", "Şifre sıfırlama e-postası gönderildi"] },
  { ad: "Tanıtım sayfaları", m: ["/tanitim açılır (200, video var)", "/tanitim/kisa açılır (200, video var)", "/tanitim/simulator açılır (200, video var)", "Tanıtım videosu iner (gun-t.mp4)"] },
  { ad: "Velora'ya katıl formu", m: ["Hatalı telefonla başvuru reddedilir (400)", "Tanıtım › Başvur › 'Başvurun alındı'", "Admin › Başvurular'da başvuru görünür (ad, kulüp)"] },
  { ad: "Yönet ve Fitness", m: ["Yönet açılır ('Günü başlat')", "Fitness › Hazır programlar açılır"] },
  { ad: "İki hesabın verisi ayrı", m: ["İkinci antrenör: sporcu listesi boş, birincinin sporcuları yok", "İkinci antrenör: takviminde birincinin planı yok", "Kurallar: 2. antrenör 1.'nin sporcularını okuyamaz", "Kurallar: 2. antrenör 1.'nin planlarını okuyamaz", "Kurallar: 1. antrenör 2.'nin planlarını okuyamaz", "Kurallar: antrenör ana hesabın başvurularını okuyamaz", "Kurallar: antrenör ana hesabın sporcularını okuyamaz", "Kurallar: 2. antrenör 1.'nin takvimine yazamaz", "Kurallar: kendini başkasının ekibine yazamaz"] },
  { ad: "Yetki", m: ["Antrenörde Admin sayfası boş (Başvurular yok)", "Antrenör Ayarlar'ında Admin satırı yok", "Kurallar: sporcu antrenörün sporcu listesini okuyamaz", "Kurallar: sporcu ana hesabın başvurularını okuyamaz", "Kurallar: sporcu kendini ana hesap yapamaz", "Sporcu ana sayfasında Yönet, Hesaplar, Admin yok", "Sporcu Admin sayfasını göremez"] },
  { ad: "Genel", m: ["Hiçbir sayfada hata yok"] },
];
export const OTO_SAYI = OTO.reduce((n, g) => n + g.m.length, 0);
