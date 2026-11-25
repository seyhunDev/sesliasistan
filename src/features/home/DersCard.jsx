"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { askSchedule, showSchedule } from "@/features/schedule/assistSchedule";
import { useNow } from "@/hooks/useNow";
import { weekdayOf } from "@/lib/agenda";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";

const pad = (n) => String(n).padStart(2, "0");

// Sporcunun ana sayfasında ders programı (Seyhun 2026-11-25 "gayet güzel bir butonla gösterilmeli, ilgi çekici"; örnek velora-tarama/sporcu-fitness-ders.html):
// mavi dolu kart. Program yoksa "Fotoğrafla ekle" (fotoğraf okunur, Ders programı sayfasında önizleme açılır, kaydı kişi seçer) ve "Elle ekle"
// (Ders programı sayfası, yeni ders penceresi açık). Program varsa bugünün dersleri (şu anki ders vurgulu) ve "Güncelle" (yeni fotoğraf).
// Başlığa dokununca Ders programı sayfası. Veri cihazdaki derslerden (kişinin kendi eklediği; ek okuma yok).
export function DersCard({ tile = false }) {
  const { lessons, myUid } = useData();
  const toast = useToast();
  const router = useRouter();
  const now = useNow(60000);
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const mine = lessons.filter((l) => l.createdByUid === myUid);
  const today = weekdayOf(todayStr());
  const list = mine.filter((l) => l.day === today).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isNow = (l) => l.start && l.end && l.start <= hm && hm < l.end;

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const img = await compressImage(file, 1800, 0.8); // tablo yazıları okunabilsin
      const r = await askSchedule({ image: img.base64, mimeType: img.mimeType, current: mine.map(({ title, day, start, end, place, teacher }) => ({ title, day, start, end, place, teacher })) });
      if (!r.lessons?.length) toast(r.message || "Ders bulamadım");
      else {
        showSchedule(r); // Ders programı sayfası açılınca önizleme (ekle ya da programı değiştir)
        router.push("/schedule");
      }
    } catch (err) {
      toast(err.message || "Fotoğraf okunamadı");
    }
    setBusy(false);
  }
  const photo = () => fileRef.current?.click();

  // Sporcu ana sayfası (Sahne, Seyhun 2026-11-25 "A"): koyu kutu; program varsa şu anki ya da sıradaki ders, yoksa Fotoğrafla ekle · Elle ekle
  if (tile) {
    const cur = list.find(isNow) || list.find((l) => (l.start || "") > hm);
    return (
      <section aria-label="Ders programı" className="sh-tile">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        <Link href="/schedule" className="sh-k">Ders programı</Link>
        {mine.length ? (
          <Link href="/schedule" className="min-w-0">
            <b className="sh-t">{cur ? `${cur.start} ${cur.title}` : list.length ? "Dersler bitti" : "Bugün ders yok"}</b>
            <small className="sh-s">{cur && isNow(cur) ? "şimdi" : cur ? "sıradaki" : `${mine.length} ders kayıtlı`}</small>
          </Link>
        ) : (
          <span className="flex flex-wrap gap-1.5">
            <button type="button" data-press onClick={photo} disabled={busy} className="sh-mini sh-mini-on">
              {busy ? "Okunuyor…" : "Fotoğrafla ekle"}
            </button>
            <Link href="/schedule?yeni=1" data-press className="sh-mini">
              Elle ekle
            </Link>
          </span>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Ders programı" className="flex flex-col gap-2.5 rounded-[1.5rem] bg-acc px-4 py-3.5 text-white">
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
      <div className="flex items-center gap-2">
        <Link href="/schedule" className="min-w-0 flex-1 truncate text-[1.0625rem] font-semibold">
          {mine.length ? "Ders programı · Bugün" : "Ders programı"}
        </Link>
        {mine.length > 0 && (
          <button type="button" data-press onClick={photo} disabled={busy} className="btn btn-sm shrink-0 bg-white/20 text-white">
            {busy ? "Okunuyor…" : "Güncelle"}
          </button>
        )}
      </div>
      {!mine.length && (
        <div className="flex gap-2">
          <button type="button" data-press onClick={photo} disabled={busy} className="btn btn-sm bg-white text-acc">
            {busy ? "Okunuyor…" : "Fotoğrafla ekle"}
          </button>
          <Link href="/schedule?yeni=1" data-press className="btn btn-sm bg-white/20 text-white">
            Elle ekle
          </Link>
        </div>
      )}
      {mine.length > 0 && !list.length && <p className="text-[0.875rem] opacity-85">Bugün ders yok</p>}
      {list.length > 0 && (
        <Link href="/schedule" className="flex flex-col gap-0.5">
          {list.map((l) => (
            <span key={l.id} className={`flex min-w-0 gap-2.5 rounded-lg px-2 py-1 text-[0.875rem] ${isNow(l) ? "bg-white/15 font-semibold" : ""}`}>
              <span className="w-11 shrink-0 tabular-nums opacity-80">{l.start}</span>
              <span className="min-w-0 truncate">{[l.title, l.place].filter(Boolean).join(" · ")}</span>
            </span>
          ))}
        </Link>
      )}
    </section>
  );
}
