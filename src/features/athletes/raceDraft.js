// "+ Yarış" penceresinden yeni yarış sayfasına aktarılan tek seferlik iş (Seyhun 2026-11-09 "üç yol"): talimat dosyası/metni ya da elle
// yazılan bilgiler. Pencere bırakır, /athletes/races/new açılınca RaceEditor alır (bir kez).
let draft = null;
export const setRaceDraft = (d) => void (draft = d);
export const takeRaceDraft = () => {
  const d = draft;
  draft = null;
  return d;
};
