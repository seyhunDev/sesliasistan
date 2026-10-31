import { Button } from "@/components/ui/Button";

// Yükleme sunucuya ulaşamadan bitti ve telefonda kopya yok: sonsuz "yükleniyor" yerine sade yazı + Tekrar dene
export function LoadFail({ onRetry, className = "py-12" }) {
  return (
    <div className={`fade-in flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      <p className="text-[0.875rem] text-mut">Yüklenemedi. İnterneti kontrol et.</p>
      <Button variant="secondary" size="sm" onClick={onRetry}>Tekrar dene</Button>
    </div>
  );
}
