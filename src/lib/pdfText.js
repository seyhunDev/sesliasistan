"use client";

// PDF'in sayfa sayfa yazı parçaları (pdf.js, public/pdfjs): kayıt, grup ve sonuç listeleri yapay zekasız okunsun diye (lib/pdfLines.js)
import { loadPdfjs } from "@/components/ui/PdfViewer";

export async function pdfPages(file) {
  const lib = await loadPdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 40); p++) pages.push((await (await pdf.getPage(p)).getTextContent()).items);
  return pages;
}
