// Yelkene özel bölümler. Sayfalar bugünkü yerinde (src/features/…) kalır; burası yalnız hangisinin yelkene ait olduğunu söyler.
// Başka spor gelince menü ve ana sayfa hasPart(sport, "races") ile bakar.
export const SAILING_PARTS = [
  "races", // yarışlar, yarış takvimi, sonuçlar (raceCal, rounds)
  "live", // canlı ekran (liveScreen), yarış medyası (raceMedia)
  "broadcast", // yarış yayını (broadcast)
  "sea", // deniz, rüzgâr, kameralar (sea, cams)
  "tracking", // tekne takibi (tracking)
  "training", // su üstü antrenman (training)
];
