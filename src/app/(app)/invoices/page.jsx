"use client";

import { ReceiptBook } from "@/features/receipts/ReceiptBook";

// Faturalar: Fişler ve faturalar sayfası "Fatura" seçili açılır (çalışan fişleri görür)
export default function InvoicesPage() {
  return <ReceiptBook kind="invoice" />;
}
