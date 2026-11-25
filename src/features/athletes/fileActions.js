"use client";

// Dosyayı aç (yeni sekme) ya da indir; paylaş (telefonda paylaşım menüsü, olmazsa indir)
export function openFile(f, download) {
  const url = URL.createObjectURL(f);
  const link = document.createElement("a");
  link.href = url;
  if (download) link.download = f.name;
  else link.target = "_blank";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function shareFile(f) {
  if (navigator.canShare?.({ files: [f] })) {
    try {
      await navigator.share({ files: [f], title: f.name });
    } catch {}
    return;
  }
  openFile(f, true);
}

// Yazdır (Seyhun 2026-11-13 kesin kayıt formları): bilgisayarda PDF gizli çerçevede açılıp yazıcı penceresi gelir;
// iPhone/iPad'de çerçevedeki PDF yazdırılamıyor, paylaşım menüsü açılır (içinde "Yazdır" var)
export function printFile(f) {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return shareFile(f);
  const url = URL.createObjectURL(f);
  const fr = document.createElement("iframe");
  fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  fr.onload = () =>
    setTimeout(() => {
      try {
        fr.contentWindow.focus();
        fr.contentWindow.print();
      } catch {
        openFile(f);
      }
    }, 300);
  fr.src = url;
  document.body.appendChild(fr);
  setTimeout(() => (fr.remove(), URL.revokeObjectURL(url)), 300_000);
}
