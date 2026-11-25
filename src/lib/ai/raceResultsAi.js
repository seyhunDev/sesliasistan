// Sonuç belgesini yapay zekayla okuma: /api/race-results (telefondan yükleme) ve yarış sitesi sunucusu (raceSiteTake.takeResults) aynı yönergeyi kullanır.
export const RESULTS_SYSTEM = `Sen bir yelken kulübünün antrenörüne yardım eden asistansın. Sana bir yelken yarışının SONUÇ belgesi verilir (genel sonuç tablosu; Türkçe ya da İngilizce).
Belgedeki sonuç listesini satır satır, eksiksiz çıkar. Uydurma; okuyamadığın alanı boş bırak.

- isResults: belge bir yarış sonuç listesi değilse false.
- fleets: her sınıf (filo) için ayrı liste: { cls, rows }.
  - cls: sınıf adı belgede yazdığı gibi ("Optimist", "ILCA 4", "ILCA 6", "420").
  - Aynı sınıf için hem genel liste hem ayrı alt listeler (Junior, Kızlar, Gençler) varsa YALNIZ genel listeyi yaz; kategori ve cinsiyeti satırlarda işaretle. Belgede sınıfın yalnız ayrı kategori listeleri varsa (ör. yalnız Junior listesi) onları ayrı fleet olarak yaz ve satırlara kategoriyi yaz.
  - rows: genel sıraya göre her sporcu: { rank genel sıra (sayı), name ad soyad belgedeki gibi, sail yelken numarası ("TUR 1234"), club kulüp, born doğum yılı ya da tarihi (belgede varsa, yazıldığı gibi), pts net puan (sayı; belgede "Net", "Toplam", "Total" sütunu), sex, cat }.
  - grp: final serisi gruplara bölünmüşse (Gold/Altın, Silver/Gümüş, Bronze/Bronz, Emerald/Zümrüt; grup sütunu, satırdaki işaret ya da grup başlığı) sporcunun grubu: "Altın", "Gümüş", "Bronz", "Zümrüt"; grup yoksa boş. Eleme serisinin renk grupları (Sarı, Mavi, Kırmızı) final grubu değildir, onları yazma. Gruplu sınıfı TEK fleet olarak yaz: önce Altın grubun sporcuları, sonra Gümüş, sonra Bronz; rank genel sıra (belgede genel sıra yoksa grup içindeki sıra). Belge yalnız bir grubun listesiyse (başlıkta "Silver Fleet", "Gümüş Grup" gibi) bütün satırlara o grubu yaz.
  - cat: sporcunun yanında ya da kategori sütununda "Junior", "J", "Jr" yazıyorsa "Junior"; "Bambino", "B" yazıyorsa "Bambino"; yazmıyorsa boş.
  - sex: belgede cinsiyet sütunu ya da işareti varsa (K, F, W, Kız, Female, Girl → "K"; E, M, Erkek, Male, Boy → "E"). Belgede yoksa sporcunun adından tahmin et (Türkçe adlarda: Ayşe, Zeynep, Elif, Defne, Ela → "K"; Ali, Mehmet, Can, Ege → "E"); her iki cinsiyette kullanılan ya da emin olmadığın adda boş bırak.
- r: tek tek yarışların puan sütunları (R1, R2, Q1, F1…; belgedeki sırayla, soldan sağa), her biri yazıldığı gibi: "3", "(14)" (atılan), "DNF", "OCS", "UFD". Yarış sütunu yoksa boş dizi.
- Diğer sütunları YAZMA.`;

const s = { type: "string" };
export const RESULTS_SCHEMA = {
  type: "object",
  properties: {
    isResults: { type: "boolean" },
    fleets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cls: s,
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: { rank: { type: "number" }, name: s, sail: s, club: s, born: s, pts: { type: "number" }, sex: s, cat: s, grp: s, r: { type: "array", items: s } },
              required: ["rank", "name"],
            },
          },
        },
        required: ["cls", "rows"],
      },
    },
  },
  required: ["isResults", "fleets"],
};
