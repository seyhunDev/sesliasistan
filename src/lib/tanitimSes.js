// Kısa tanıtımın (/tanitim/kisa) seslendirme cümleleri (Seyhun 2026-11-27: "doğal sesle, bir kere üretilip saklansın").
// Sesler yayında dosya olarak hazırlanır (scripts/tanitim-ses/uret.mjs → /tanitim/kisa/ses/<id>.mp3, Storage tanitim-ses/).
// Metin değişince özeti değişir ve yalnız o cümle bir kez yeniden üretilir. Yedek yol: /api/tanitim-ses?id=…
// Metni değiştirirsen sayfadaki (public/tanitim/kisa/index.html) aynı adımın "say" metnini de değiştir.
import { createHash } from "node:crypto";

export const TANITIM_SES = {
  "giris": "Antrenör, sporcu ve tekne. Hepsi tek uygulamada: Velora.",
  "son": "Sezona hazır mısın? Velora'ya hemen katıl.",
  "toplu-1": "Takvimde artıya dokun ve toplu antrenmanı seç.",
  "toplu-2": "Ayları ve günleri seç: hafta sonu, hafta içi ya da istediğin günler.",
  "toplu-3": "Grubu ve saati belirle.",
  "toplu-4": "Tek dokunuşla on antrenman takvime eklenir.",
  "yaris-1": "Yarışlar sayfasında artıya dokun; duyurulan yarışlar listelenir.",
  "yaris-2": "Yarışını ve sınıfını bul, ekle'ye dokun.",
  "yaris-3": "Yarış sayfası hazır. Kaç gün kaldığı ve yapılacaklar burada.",
  "yaris-4": "Gereken evraklar tek listede; tamamladıkça işaretle.",
  "yonet-1": "Start süresini tek dokunuşla başlat.",
  "yonet-2": "Basılı tut ve konuş; sesin bütün sporculara gider.",
  "yonet-3": "Sık kullandığın mesajlar hazır; seç ve gönder.",
  "yonet-4": "Sporcuyu seç ve cezasını ver. Bir ceza dönüşü, anında ona gider.",
  "etiket-1": "Sporcuyu seç ve videoya dokun.",
  "etiket-2": "Videoda kimler var? Sporcuları işaretle.",
  "etiket-3": "Manevrayı etiketle: orsa, start, dönüş.",
  "etiket-4": "Galeriye kaydet; video etiketleriyle birlikte saklanır.",
  "hava-1": "Bugünün rüzgârı saat saat: hızı, yönü ve yağmur.",
  "hava-2": "Bir güne dokun; o günün havası açılır.",
  "hava-3": "O günün planları da hemen altında.",
  "ev-1": "Ana sayfada bugünün rüzgârı ve planların bir arada.",
  "ev-2": "Bir güne dokun; o günün havası ve planları açılır.",
  "ev-3": "Kulüp bölümünden tek dokunuşla denizdeki yönetime ya da simülatöre geç.",
  "ev-4": "Artıya dokun ve plan ekle: türü, günü ve saati seç, ekle.",
  "fit-1": "Sporcunu seç ve program ekle.",
  "fit-2": "Dilersen uzman bir antrenörle çalış; sporcu, planlarını paylaşıp paylaşmayacağını kendisi seçer.",
  "fit-3": "Ya da hazır bir program seç; saat tam gün, istersen gün gün.",
  "fit-4": "Program açılır; günler, saatler ve hareketler hazır.",
  "fit-5": "Kaydet; bütün antrenmanlar sporcunun takvimine gider.",
  "fit-6": "Sporcunun haftasını gün gün takip et.",
  "sporcu-1": "Sporcu uygulamayı açtığında, bugünün antrenmanı en üstte.",
  "sporcu-2": "Haftasını gün gün görür; her günün hareketleri hazır.",
  "sporcu-3": "Antrenmana başlar; hareket hareket, fotoğraflı anlatımla.",
  "sporcu-4": "Bitirdikçe işaretler; antrenör de ilerlemesini görür.",
  "simulator-1": "Senaryolar ana sayfada. Birini seç ve izle'ye dokun.",
  "simulator-2": "Tekneler adım adım ilerler. Her adımda ne yapıldığını ve nedenini okursun.",
  "simulator-3": "Kendi taktiğini çiz: tekneleri koy, rotalarını çiz.",
  "simulator-4": "Oynat; tekneler çizdiğin rotada ilerler.",
};
export const TANITIM_SES_STIL = { voice: "Aoede", style: "anlatim" };
// Cümlenin özeti (ses + stil + metin): dosya adı ve "metin değişti mi" denetimi
export const tanitimOzet = (text) =>
  createHash("sha256").update([TANITIM_SES_STIL.voice, TANITIM_SES_STIL.style, String(text).replace(/\s+/g, " ").trim()].join("|")).digest("hex").slice(0, 24);
