import { useMemo } from "react";
import { qrCells, qrText } from "../qr";

// Siparişin kare kodu (beyaz zemin, kenarda 4 hücre boşluk: okuyucu için gerekli)
export function OrderQr({ id, className = "" }) {
  const { n, d } = useMemo(() => qrCells(qrText(id)), [id]);
  return (
    <svg viewBox={`-4 -4 ${n + 8} ${n + 8}`} shapeRendering="crispEdges" className={className} role="img" aria-label="Siparişin kare kodu">
      <rect x="-4" y="-4" width={n + 8} height={n + 8} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
