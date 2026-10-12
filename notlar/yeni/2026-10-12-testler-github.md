## Nerede kaldım

- Testler GitHub'da (Seyhun: "test sonuçlarını GitHub'a yükleyelim, sen de görmüş ol, yerele indirmeyelim"): yeni iş akışı `.github/workflows/test.yml` ("Testler"). main'e her birleştirmede (mobil/, notlar/, .md hariç) GitHub'da `npm run test:hepsi -- --yzsiz` çalışır (birim, anlama, akış, tarayıcıyla sayfalar). Sonuç depoda `test-sonuclari` dalına yazılır: `son.txt` en son çalıştırma (commit, zaman, çalıştırma bağlantısı), `gecmis/` son 60 çalıştırma; iş akışının özet sayfasında da görünür. Kalan (✗) test varsa çalıştırma kırmızı olur. Elle: GitHub › Actions › Testler › Run workflow, "Gerçek yapay zeka" kucuk/tam/yok; yapay zeka için depo gizlileri `GEMINI_API_KEY`, `GEMINI_MODEL` (yoksa o bölüm atlanır). Betikler `TEST_SONUC_DIR` verilirse sonucu oraya yazar, yoksa eskisi gibi ~/Downloads. Uygulama kodu değişmedi. Henüz GitHub'da çalıştırılmadı.

## Sıradaki işler

- İlk birleştirmeden sonra GitHub › Actions › Testler yeşil mi bak; `test-sonuclari` dalında `son.txt` oluştu mu. Gerçek yapay zeka bölümü için GitHub › Settings › Secrets and variables › Actions'a `GEMINI_API_KEY` ve `GEMINI_MODEL` ekle, sonra Run workflow › kucuk.
