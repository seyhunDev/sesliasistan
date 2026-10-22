"use client";

// Kayıt: iPhone'un kendi kamerasını açar (Seyhun 2026-10-22: "sarsıntısız net görüntü istiyorum, iPhone kamerasını kullanalım");
// fotoğraf ya da video kamerada seçilir. Düğme bir label: dosya seçici dokunuşun içinde açılır (iPhone sonradan açılan seçiciyi engeller).
// Sayaç kamerada görünmez; çekildiği an startla karşılaştırılıp kayda yazılır, izlerken "Startan beri 1:35" görünür (MediaTab take).
export function RecPick({ onFile, className = "", children, ...p }) {
  return (
    <label data-press className={`cursor-pointer ${className}`} {...p}>
      {children}
      <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => (e.target.files?.[0] && onFile(e.target.files[0]), (e.target.value = ""))} />
    </label>
  );
}
