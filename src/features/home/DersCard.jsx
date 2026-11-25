"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { liveHead } from "@/features/liveScreen/fonts";
import { useEsc } from "./SporcuMenu";
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
  const [pick, setPick] = useState(false);
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

  // Sporcu ana sayfası (Sahne; Seyhun 2026-11-25 "çok kötü duruyor, başka mantıkla"; örnek sporcu-ana/ders-programi.html):
  // tek parça kutu. Program yoksa büyük "Ekle" +; dokununca alttan pencere: Fotoğraftan · Elle. Program varsa şu anki/sıradaki ders büyük saatle; dokununca Ders programı.
  if (tile) {
    const cur = list.find(isNow) || list.find((l) => (l.start || "") > hm);
    const input = <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />;
    if (mine.length)
      return (
        <Link href="/schedule" data-press aria-label="Ders programı" className="sh-tile">
          <span className="sh-k">
            {cur ? (
              <>
                Ders · <span className="sh-lime">{isNow(cur) ? "şimdi" : "sıradaki"}</span>
              </>
            ) : (
              "Ders programı"
            )}
          </span>
          {cur ? (
            <span className="min-w-0">
              <b className="sh-c sh-ders-n">{cur.start}</b>
              <b className="sh-t">{cur.title}</b>
            </span>
          ) : (
            <span className="min-w-0">
              <b className="sh-t">{list.length ? "Dersler bitti" : "Bugün ders yok"}</b>
              <small className="sh-s">{mine.length} ders kayıtlı</small>
            </span>
          )}
        </Link>
      );
    return (
      <>
        {input}
        <button type="button" data-press onClick={() => setPick(true)} disabled={busy} aria-label="Ders programı ekle" className="sh-tile">
          <span className="sh-k">Ders programı</span>
          <span className="sh-ders-add">
            <b className="sh-c">{busy ? "Okunuyor…" : "Ekle"}</b>
            {!busy && <span aria-hidden="true">+</span>}
          </span>
        </button>
        {pick && <DersPick onClose={() => setPick(false)} onPhoto={photo} />}
      </>
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

// Ders programı ekle penceresi (sporcu Sahne): Fotoğraftan (dersler okunur) · Elle (yeni ders penceresi)
function DersPick({ onClose, onPhoto }) {
  const router = useRouter();
  useEsc(true, onClose);
  return (
    <div role="dialog" aria-modal="true" aria-label="Ders programı ekle" data-theme="dark" className={`shm-dim ${liveHead.variable}`} onClick={onClose}>
      <div className="shm-sheet" onClick={(e) => e.stopPropagation()}>
        <span className="shm-grab" aria-hidden="true" />
        <h2 className="sh-c shm-title">Ders programı ekle</h2>
        <button
          type="button"
          data-press
          onClick={() => {
            onClose();
            onPhoto();
          }}
          className="sh-opt sh-opt-on"
        >
          <Icon name="camera" className="size-5" />
          <span>
            <b>Fotoğraftan</b>
            <small>Programın fotoğrafını çek, dersler okunur</small>
          </span>
        </button>
        <button
          type="button"
          data-press
          onClick={() => {
            onClose();
            router.push("/schedule?yeni=1");
          }}
          className="sh-opt"
        >
          <Icon name="edit" className="size-5" />
          <span>
            <b>Elle</b>
            <small>Dersleri tek tek yaz</small>
          </span>
        </button>
      </div>
    </div>
  );
}
