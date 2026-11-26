"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, documentId, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { grupla } from "@/lib/hata";

// Ayarlar › Admin › Hatalar (sistem taraması 2026-11-26, madde 9): kulüpteki telefonlarda çöken sayfalar (api/hata yazar).
// Son 7 günün belgeleri bir kez okunur (en çok 7 okuma); aynı hata tek satır, kaç kez ve kimde olduğu yazar.
const saat = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function Hatalar({ org }) {
  const [gunler, setGunler] = useState(null);
  const [hata, setHata] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    getDocs(query(collection(db, "orgs", org, "hatalar"), orderBy(documentId(), "desc"), limit(7)))
      .then((s) => setGunler(s.docs.map((d) => ({ gun: d.id, ...d.data() }))))
      .catch((e) => (console.warn("[admin hatalar]", e?.code || e?.message), setHata(true)));
  }, [org, n]);
  const satirlar = useMemo(() => grupla((gunler || []).flatMap((g) => g.list || [])), [gunler]);
  if (hata) return <LoadFail onRetry={() => (setHata(false), setN((x) => x + 1))} />;
  if (!gunler) return <ListLoading height="12rem" />;
  if (!satirlar.length) return <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-[0.9375rem] text-mut">Son 7 günde hata yok.</p>;
  return (
    <section>
      <ListHead title="Son 7 gün" count={satirlar.reduce((t, g) => t + g.n, 0)} />
      <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
        {satirlar.map((g) => (
          <div key={`${g.msg}|${g.path}`} className="px-4 py-2.5">
            <p className="break-words text-[0.9375rem] font-medium">{g.msg}</p>
            <p className="mt-0.5 truncate text-[0.8125rem] text-mut">{[g.path, g.n > 1 ? `${g.n} kez` : "", g.kisi.slice(0, 3).join(", "), saat(g.son)].filter(Boolean).join(" · ")}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
