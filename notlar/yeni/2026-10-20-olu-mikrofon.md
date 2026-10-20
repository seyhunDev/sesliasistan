## Nerede kaldım

- "Ses alınamadı" (Seyhun, 2026-10-20): iPhone bazen mikrofonu açık gösterip hiç ses vermiyor; kayıt boş kalıyor ve kullanıcı bunu ancak konuşma bitince öğreniyordu. Artık mikrofon açıldıktan 1,8 sn sonra kayıttan parça ya da ham ses gelmiş mi bakılıyor (`src/lib/speech/micCheck.js`, `useSpeech.js` ticker). Gelmediyse mikrofon sessizce bir kez yeniden açılıyor, dinleme sürüyor. Yine gelmezse hemen "Mikrofondan ses gelmiyor…" uyarısı çıkıyor. Ekran değişmedi. Telefonda denenmedi.
- Asistan motoru için inceleme ve adım adım plan: /mnt/project-files/asistan/motor-plani.md (süre sınırları, isteği küçültme, hızlı kalıplar). Seyhun'un onayını bekliyor.

## Sıradaki işler

- Telefonda dene: asistanla birkaç kez konuş; "Ses alınamadı" yerine ya normal çalışmalı ya da hemen "Mikrofondan ses gelmiyor" demeli.
- Dinlerken yeşil "ses geliyor" işareti (Seyhun seçti): örnek görsel ve onaydan sonra yapılacak.

## Asistan

- Ölü mikrofon dinlemenin başında yakalanır (bir kez sessizce yeniden açılır, sonra hemen uyarı); konuşma bitince "Ses alınamadı" denmesi beklenmez.
