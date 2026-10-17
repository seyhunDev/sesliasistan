// Hazır programlar: seçili sporcuya tek dokunuşla eklenir (kayıttan önce düzenleme ekranında açılır).
// Hareket adları kulübün kendi hareketi olarak kalır (ex: ""), fotoğraflar sonra kütüphaneden eklenir.
import { cleanProgram } from "./model";

const prep = (name, more = {}) => ({ ex: "", name, sets: 1, part: "isinma", ...more });
const main = (name, more = {}) => ({ ex: "", name, part: "ana", ...more });

// RIP · 12 haftalık yelken ev kuvveti (İlay İmamoğulları programı, 14 yaş). Salı A, Perşembe B, Cuma isteğe bağlı mikrodoz.
// Günlük reset, nefes ve mobilite, yelken sonrası rutin antrenman değildir: gün olarak eklenmez, kurallarda başlık olarak durur.
const YELKEN_EV = {
  title: "Yelken ev kuvveti · 12 hafta",
  goal: "kondisyon",
  level: "yeni",
  place: "ev",
  weeks: 12,
  note: "Okul ve yelkenle birlikte: iki ana ev seansı yeterli. Ağır yük ve maksimum tekrar yok; başarı hareketi daha dengeli ve kontrollü yapmak.",
  days: [
    {
      dow: 2,
      time: "17:45",
      min: 40,
      name: "Kuvvet A · Alt gövde ve çekiş",
      note: "Pazartesi atletizminden bacaklar yorgunsa alt gövde hareketlerinden birer set çıkar.",
      items: [
        prep("90 90 nefes", { reps: 5, breath: "5 yavaş nefes", note: "Kaburga pelvis kontrolü" }),
        prep("Kedi deve", { reps: 6, note: "Omurga hareketi" }),
        prep("Ayak bileği knee to wall", { reps: 6, side: true, note: "Dorsifleksiyon" }),
        prep("Adductor rock back", { reps: 6, side: true, note: "Kalça iç hat" }),
        prep("Glute bridge", { reps: 10, note: "Kalça aktivasyonu" }),
        prep("Wall slide", { reps: 8, note: "Skapula kontrolü" }),
        prep("Bodyweight split squat", { reps: 5, side: true, note: "Tek taraf hazırlık" }),
        prep("Ana harekete prova", { reps: 6, note: "6 kolay tekrar, teknik hazırlık" }),
        main("Sırt çantalı split squat", { sets: 3, reps: 8, repsTo: 12, side: true, rpe: "6–7 · RIR 3–4", rest: 75, note: "Diz ikinci parmağa" }),
        main("Tek bacak Romanian deadlift", { sets: 3, reps: 8, repsTo: 10, side: true, rpe: "6–7 · RIR 3", rest: 60, note: "Kalça geriye, pelvis düz" }),
        main("Masa altı row", { sets: 3, reps: 10, repsTo: 15, rpe: "7 · RIR 3", rest: 60, note: "Omuz kulaktan uzak", alt: "Band row; masa güvenli değilse iki elde su şişesiyle bent over row" }),
        main("Eğimli şınav", { sets: 3, reps: 8, repsTo: 12, rpe: "6–7 · RIR 3", rest: 60, note: "Gövde tek parça" }),
        main("Tek bacak calf raise", { sets: 2, reps: 12, repsTo: 15, side: true, rpe: "7 · RIR 3", rest: 45, note: "Üstte 1 sn bekle" }),
        main("Dead bug", { sets: 3, reps: 6, repsTo: 8, side: true, rpe: "6", rest: 45, note: "Bel boşluğunu koru" }),
        main("Side plank kısa kol", { sets: 2, sec: 20, secTo: 30, side: true, rpe: "6–7", rest: 45, note: "Kalça ve omuz aynı hat" }),
      ],
    },
    {
      dow: 4,
      time: "17:45",
      min: 40,
      name: "Kuvvet B · Full body ve core",
      note: "Hafta sonuna 48 saat kala bitir; tükenene kadar set ve kas ağrısı yapan ek çalışma yok.",
      items: [
        prep("Crocodile breathing", { reps: 5, breath: "5 nefes, diyafram ritmi" }),
        prep("Open book", { reps: 6, side: true, note: "Torakal rotasyon" }),
        prep("Hip hinge drill", { reps: 10, note: "Kalçadan katlanma" }),
        prep("Squat to reach", { reps: 8, note: "Kalça ve toraks" }),
        prep("Scapular push up", { reps: 8, note: "Serratus" }),
        prep("Band pull apart", { reps: 12, note: "Arka omuz" }),
        prep("Lateral lunge reach", { reps: 5, side: true, note: "Frontal düzlem" }),
        prep("Ana harekete prova", { reps: 6, note: "6 kolay tekrar, teknik hazırlık" }),
        main("Sırt çantalı squat", { sets: 3, reps: 10, repsTo: 15, rpe: "6–7 · RIR 3", rest: 75, note: "Topuk ve ayak tabanı aktif" }),
        main("Hip thrust", { sets: 3, reps: 12, repsTo: 15, rpe: "7 · RIR 3", rest: 60, note: "Bel değil kalça", alt: "Glute bridge" }),
        main("Yarım diz band pulldown", { sets: 3, reps: 10, repsTo: 12, rpe: "7 · RIR 3", rest: 60, note: "Kaburga aşağı", alt: "Band yoksa yüzüstü Y W kaldırma 2 × 8" }),
        main("Half kneeling tek kol press", { sets: 3, reps: 8, repsTo: 10, side: true, rpe: "6–7 · RIR 3", rest: 60, note: "Bel boşluğu artmasın" }),
        main("Reverse lunge", { sets: 2, reps: 8, repsTo: 10, side: true, rpe: "6–7 · RIR 3", rest: 60, note: "Sessiz ve kontrollü iniş" }),
        main("Pallof press", { sets: 3, reps: 8, repsTo: 10, side: true, rpe: "6–7", rest: 45, note: "Rotasyona diren", alt: "Band yoksa side plank 2 × 20–30 sn" }),
        main("Suitcase carry", { sets: 3, sec: 30, secTo: 40, side: true, rpe: "7", rest: 45, note: "Tekne postürü: uzun ve dengeli" }),
      ],
    },
    {
      dow: 5,
      time: "17:45",
      min: 15,
      name: "Yelken mikrodozu",
      note: "İsteğe bağlı, yalnız yeşil günde; yarış ya da sert rüzgâr haftasında yapılmaz. 2 tur, hareketler arası 20 sn geçiş.",
      items: [
        main("Hiking hold duvara dayanmalı", { sets: 2, sec: 25, secTo: 35, rest: 20, note: "Quadriceps ve gövde izometrisi" }),
        main("Band rope pull", { sets: 2, reps: 10, side: true, rest: 20, note: "Yatay çekiş ve skapula" }),
        main("Lateral step and stick", { sets: 2, reps: 6, side: true, rest: 20, note: "Tekne içinde denge ve iniş kontrolü" }),
        main("Half kneeling chop", { sets: 2, reps: 8, side: true, rest: 20, note: "Rotasyonel kuvvet aktarımı" }),
        main("Towel grip hold", { sets: 2, sec: 30, rest: 20, note: "Tutuş dayanıklılığı" }),
        main("Bear plank shoulder tap", { sets: 2, reps: 6, side: true, rest: 20, note: "Anti rotasyon ve omuz kontrolü" }),
      ],
    },
  ],
  phases: [
    { from: 1, to: 3, name: "Temeli kur", note: "2–3 set · RPE 6 · RIR 4 · tüm tekrarlar temiz, ertesi gün ağrı yok" },
    { from: 4, to: 4, name: "Hafif hafta", sets: 70, note: "Setleri yaklaşık %30 azalt; uyku ve enerji normale dönsün" },
    { from: 5, to: 7, name: "Kapasiteyi büyüt", note: "3 set · RPE 7 · RIR 3 · tek taraf kuvveti ve çekiş" },
    { from: 8, to: 8, name: "Hafif hafta", sets: 65, note: "2 set · RPE 6 · hareket kalitesi korunur" },
    { from: 9, to: 11, name: "Yelkene bağla", note: "3 set · RPE 7–8 · RIR 2–3 · yelken gününde yorgunluk artmasın" },
    { from: 12, to: 12, name: "Değerlendir", sets: 60, note: "Hacim %40 düşük · teknik test, fotoğraf ve geri bildirim" },
  ],
  rules: [
    "Çift ilerleme: tüm setlerde üst tekrar sınırına temiz teknikle ulaşınca sonraki hafta sırt çantasına 1–2 kg ekle ya da 3 sn kontrollü inişe geç, alt tekrara dön.",
    "Teknik bozulur ya da ağrı olursa aynı yükte kal ya da kolay varyasyona geç. Yelken sonrası belirgin yorgunlukta setleri %30 azalt.",
    "Trafik ışığı: Yeşil (8+ saat uyku, enerji iyi, ağrı 0–2) planı uygula. Sarı (6,5–8 saat uyku, stres, ağrı 3) her hareketten 1 set çıkar, mikrodoz yok. Kırmızı (hastalık, keskin ağrı, baş dönmesi, göğüs ağrısı, nefes darlığı) antrenman yok.",
    "Sınav haftası: iki seans 25 dakika; ana hareketlerden ikişer set ve günlük reset.",
    "Her gün 8 dk reset: burun nefesi 4 sn al, 6 sn ver · ayak tabanı ve baldır 30 sn/yan · 90 90 kalça geçişi 6 · open book 5/yan · wall slide 8 · dead bug 6/yan · child pose yan uzanma 30 sn/yan · bacaklar yukarı 5 sakin nefes.",
    "Atletizm günleri (Pazartesi, Çarşamba) 19:00: 8 dk reset ya da 5 dk nefes ve mobilite.",
    "Yelken sonrası 6 dk: yürüyüş ve burun nefesi, baldır, kalça fleksör, adduktor, torakal rotasyon, uzun verişli nefes (her biri 1 dk).",
    "Keskin ağrı, göğüs ağrısı, bayılma hissi, nefes darlığı ya da çarpıntıda antrenman durur, aileye ve sağlık profesyoneline bilgi verilir.",
  ].join("\n"),
};

export const TEMPLATES = [
  { id: "yelken-ev-12", title: "Yelken ev kuvveti", sub: "12 hafta · Salı, Perşembe kuvvet + Cuma mikrodoz · 14 yaş için", forAge: 14, sport: "yelken", prog: YELKEN_EV },
];

// Şablondan yeni program (kayıtsız): başlangıç verilen gün, kimin için bilgisi ayrı eklenir
export function fromTemplate(id, start = "") {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) return null;
  return { ...cleanProgram({ ...t.prog, start }), template: t.id };
}
