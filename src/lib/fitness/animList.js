// Hazır hareket animasyonları (Seyhun 2026-11-27): Higgsfield'da (Kling 3.0 Omni) hazır programın fotoğraflarından üretildi,
// küçültülüp (≈0,2–0,4 MB) Higgsfield'ın kalıcı adresine kondu. Ana hesap Hareketler › "Animasyonlar" ile bir kez alır:
// sunucu (/api/fitness-anim, action "import") videoyu indirip Storage'a (orgs/{org}/fitMedia) yazar, harekete { a: true, hf: id }
// olarak eklenir. Ayakta yapılanlarda kız ve erkek yan yana, yerde yapılanlarda tek kişi (hareketten harekete kız/erkek sırayla).
// Yeni video eklemek: listeye { id, name, url } satırı (name hazır programdaki ad). Liste ve adresler:
// /mnt/project-files/fitness-animasyon/liste.md (proje dosyaları).
import { libEntry } from "./library";

const CDN = "https://d2ol7oe51mr4n9.cloudfront.net/user_3MhQKkyxfjSy1iPjd2Pchp5WjUF/";
export const ANIM_HOST = /^https:\/\/d2ol7oe51mr4n9\.cloudfront\.net\/[\w/-]+\.mp4$/;

export const ANIMS = [
  { id: "f6b793da-b9f0-4c9e-87e2-e2437b589227", name: "Sırt çantalı squat" },
  { id: "82bc007a-216c-4ab4-abf0-cc1251a8c880", name: "Sırt çantalı split squat" },
  { id: "7167f861-fd60-446a-9975-1e10a795ba6b", name: "Side plank kısa kol" },
].map((x) => ({ ...x, url: `${CDN}${x.id}.mp4` }));

// Kütüphanede olup bu animasyonu henüz almamış hareketler: [{ it, anim }]
export function animTodo(lib, list = ANIMS) {
  return list
    .map((anim) => ({ it: { ex: "", name: anim.name }, anim }))
    .filter(({ it, anim }) => {
      const e = libEntry(lib, it);
      return e && !(e.media || []).some((m) => m.a && m.hf === anim.id);
    });
}

// Animasyon eklenince hareketin dosyaları: yeni animasyon başta, eskisi çıkar, fotoğraflar kalır (en çok 3)
export const withAnim = (media, meta) => [{ ...meta, a: true }, ...(media || []).filter((m) => !m.a)].slice(0, 3);
