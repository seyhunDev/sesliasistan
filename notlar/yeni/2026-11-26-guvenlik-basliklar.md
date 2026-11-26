## Nerede kaldım
- Sistem taraması madde 5-6: `next.config.mjs` başka site Velora'yı iframe içinde gösteremez (`frame-ancestors 'self'`; canli, ekran, takip, tanitim sayfaları hariç, kulüp sitesine gömülebilir), `/api` yanıtlarında nosniff. `/api/health` sonucu 5 dk bellekte (girişsiz, okuma yemesin). `/api/page-video` yönlendirmeleri tek tek izler, her adımda iç ağ adresi engellenir. Velora Food'a da frame-ancestors eklendi (Velora'dan gömülebilir); Sanal'da zaten vardı.

## Sıradaki işler
0. Telefonda: Sanal ve Sailing sekmeleri Velora içinde açılıyor mu, Fitness'ta sayfa linkinden video bulma çalışıyor mu.
1. Seyhun: Netlify'da ACK_SECRET tanımlı değilse uzun rastgele bir değer girsin (bildirim imzası bildirim anahtarına düşüyor).
