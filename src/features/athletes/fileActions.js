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
