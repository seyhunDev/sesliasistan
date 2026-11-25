## Nerede kaldım
- /canli rüzgârı "0 kn, yön yok, ok yok" gösteriyordu (Seyhun 2026-11-04). Hata değil: en yakın istasyon (OGIMET SYNOP) o saat "sakin" (00000) bildiriyordu, ekran bunu oksuz 0 kn olarak yazıyordu. Son değişikliklerle (#1156–#1159) ilgisi yok.
- Şimdi (LiveScreen.jsx curWind): istasyon sakin bildirirse bu saatin tahmini gösterilir (ok, yön, kaynak "Tahmin HH:00"); tahmin de 0 ise yön yerine "Sakin", yön yoksa "Değişken" (dirText).

## Sıradaki işler
- Telefonda denenmedi; istasyon gerçekten hep 00000 veriyorsa (arızalı istasyon) başka istasyona geçmek düşünülebilir.
