## Nerede kaldım

- Canlı yarış sayfası "Bu sayfa açılamadı · Cannot read properties of undefined (reading 'status')" ile çöküyordu: yarış bilgisi olmayan bir yanıt (plan yok) gelince ekran plan.status okuyordu. Muhtemel sebep Netlify önbelleğinin /api/canli genel liste yanıtını yarış sorusuna (?id=) vermesi.
- Düzeltme: /api/canli yanıtlarına "Netlify-Vary: query" (önbellek soruyla ayrılır); LiveScreen yalnız race içeren yanıtı veri sayar ve eksik alanları doldurur (fillData, plan her zaman cleanPlan). Sahte yanıtla tarayıcıda denendi: artık çökmüyor.

## Sıradaki işler

- Yeni yayın düzeni (yayin-tasarim görselleri), sonra yayın özeti belgesi ve canlı dinleme.
