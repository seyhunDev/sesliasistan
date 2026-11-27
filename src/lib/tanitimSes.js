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
  "yonet-4": "Sporcuyu seç ve cezasını ver. Üç yüz altmış derece, anında ona gider.",
  "etiket-1": "Sporcuyu seç ve videoya dokun.",
  "etiket-2": "Videoda kimler var? Sporcuları işaretle.",
  "etiket-3": "Manevrayı etiketle: orsa, start, dönüş.",
  "etiket-4": "Galeriye kaydet; video etiketleriyle birlikte saklanır.",
  "hava-1": "Bugünün rüzgârı saat saat: hızı, yönü ve yağmur.",
  "hava-2": "Bir güne dokun; o günün havası açılır.",
  "hava-3": "O günün planları da hemen altında.",
  "fit-1": "Günün fitness programı hazır: hareketler, setler ve tekrarlar.",
  "fit-2": "Antrenmana başla; süre, hareket ve set sayısı bir bakışta.",
  "fit-3": "Her harekette görsel, nasıl yapıldığı ve tekrar sayısı var.",
  "fit-4": "Seti bitir; sıradaki hareket gelir.",
  "simulator-1": "Senaryolar ana sayfada. Birini seç ve izle'ye dokun.",
  "simulator-2": "Tekneler adım adım ilerler. Her adımda ne yapıldığını ve nedenini okursun.",
  "simulator-3": "Kendi taktiğini çiz: tekneleri koy, rotalarını çiz.",
  "simulator-4": "Oynat; tekneler çizdiğin rotada ilerler.",
};
export const TANITIM_SES_STIL = { voice: "Aoede", style: "anlatim" };
// Cümlenin özeti (ses + stil + metin): dosya adı ve "metin değişti mi" denetimi
export const tanitimOzet = (text) =>
  createHash("sha256").update([TANITIM_SES_STIL.voice, TANITIM_SES_STIL.style, String(text).replace(/\s+/g, " ").trim()].join("|")).digest("hex").slice(0, 24);
