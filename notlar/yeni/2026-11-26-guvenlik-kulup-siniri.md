## Nerede kaldım
- Sistem taraması madde 1 (Seyhun: "Başla"; plan https://claude.ai/artifact/35HHwiwAFynqd3G7AXpnGr): kayıt Velora Sailing bağlantısıyla herkese açık ve kayıt olan herkes ana hesap. `src/lib/server/auth.js` requireUser artık güvenilmeyen kulübün günlük yapay zekâ harcamasını sınırlar: izin listesi (ALLOWED_EMAILS) ya da Velora ana hesabı (VELORA_ADMIN, NEXT_PUBLIC_SPORCU_EMAILS) kulübü sınırsız; diğerleri `AI_ORG_DAY_USD` (varsayılan 0,5 $) dolunca 429 alır. Harcama `usage/ai_{kulüp}_{ay}.usdDay.{gün}` (aiUsage.js yazıyor), kulüp başına 2 dk'da bir okuma; çalışanın kulübü profilden. Yönetici anahtarı yoksa/okunamazsa engellemez. `free` istekler (deniz trafiği) sayılmaz.

## Sıradaki işler
0. Sistem taraması madde 2: users/{uid} kuralında via, restaurantOf, placeId, coach kilidi (kural yayını Seyhun'da).
