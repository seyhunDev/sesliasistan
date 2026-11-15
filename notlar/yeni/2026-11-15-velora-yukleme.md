## Nerede kaldım
- TFF listesi yüklenirken (Seyhun 2026-11-15 "Yap"): ortak `ListLoading` (components/ui/Loader.jsx): listenin yerinde soluk kutu, ortada nefes alan Velora işareti (VeloraGlyph), üstünden geçen ışık; CSS globals.css `.vload`. Liste gelince `.list-in` satırları kayarak açar. "+ Yarış" penceresi (RaceAddSheet SiteList) ve /athletes/races/site kullanıyor. Liste telefonda saklı olduğundan (#1423) yalnız ilk açılışta görünür.

## Tasarım
- Liste yüklenirken Velora kutusu (ListLoading) kullanılır; başka listelere de aynı parça konabilir.

## Sıradaki işler
- Telefonda denenmedi.
