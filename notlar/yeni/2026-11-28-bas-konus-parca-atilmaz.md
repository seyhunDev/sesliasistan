## Nerede kaldım
- Hata (Seyhun 2026-11-28): #1688'den sonra Yönet bas-konuş sesi sporcuya gitmiyordu. Sebep: "yalnız sessizlik olan parça 3 sn'de atılır" kuralı. iPhone/iPad'de seviye ölçer (AudioContext) mikrofon izni beklendikten sonra açıldığı için askıda kalıp hep 0 okuyabiliyor; o zaman konuşma sessizlik sanılıp bütün parçalar atılıyordu.
- Düzeltme: hiçbir parça atılmaz. Konuşma duyulmayan parça (ölçer çalışmasa da) eski gibi 2,5 sn'de gider; konuşma duyulursa susmada kesme sürer. Test "ölçer çalışmıyor", "hiç atma yok".
- Telefonda denenmedi.

## Sıradaki işler
- Ölçerin iPhone'da gerçekten çalışıp çalışmadığına bak (Yönet konuş düğmesindeki çubuklar oynuyor mu); çalışmıyorsa AudioContext'i dokunuş anında açmak.
