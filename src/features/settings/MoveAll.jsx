"use client";

import { useState } from "react";
import { waitForPendingWrites } from "firebase/firestore";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dropRaceFile, listRaceFiles } from "@/features/athletes/raceFiles";
import { localExtraCount, moveLocalExtras } from "@/features/athletes/raceStore";
import { mailMoveErr, moveAllMailFiles } from "@/features/mail/mailFiles";
import { db } from "@/lib/firebase/clientApp";
import { listMeetings } from "@/lib/meeting/store";
import { Row } from "./ui";

// Ayarlar › Telefondaki veriyi taşı: bu telefonda kalan her şeyi Firebase'e gönderir.
// 1) Gönderilmeyi bekleyen kayıtlar (internetsizken yazılanlar) 2) yalnız bu telefonda duran yarış evrakı (Storage'a)
// 3) banka maillerinin içinde kalan Excel ekleri (Storage'a, mailFiles.js).
// Hepsi gidince "Telefondaki kopyaları sil" çıkar: hazırlanan evrak, talimat/fatura/envanter kopyaları ve uygulama dosyaları
// silinir (gerekince yeniden hazırlanır ya da indirilir). Özetlenmemiş toplantılar Firebase'e kendiliğinden gidemez, silinmez.
const withTimeout = (p, ms) => Promise.race([p.then(() => true), new Promise((r) => setTimeout(() => r(false), ms))]);
const withValue = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);
// Firebase hata kodunu kullanıcının anlayacağı cümleye çevirir
function errText(code) {
  const c = String(code || "");
  if (!c) return "";
  if (/unauthorized|permission/.test(c)) return "Firebase izin vermedi: Storage kuralları yayınlanmamış olabilir";
  if (/retry-limit|deadline|zaman/.test(c)) return "Yükleme zamanında bitmedi: bağlantı zayıf";
  if (/bucket|project-not-found|not-found/.test(c)) return "Firebase Storage açık değil";
  if (/quota/.test(c)) return "Firebase kotası doldu";
  return `Hata: ${c.slice(0, 60)}`;
}

export function MoveAllRow() {
  const toast = useToast();
  const { profile } = useAuth();
  const owner = profile?.role !== "staff" && (profile?.orgId || profile?.uid) === profile?.uid;
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState(null);

  const move = async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return toast("İnternet yok, bağlanınca dene");
    setBusy("Bekleyen kayıtlar gönderiliyor…");
    setOut(null);
    try {
      const writes = await withTimeout(waitForPendingWrites(db), 20e3);
      let moved = 0;
      let left = 0;
      let why = "";
      if (owner) {
        setBusy("Yarış evrakı taşınıyor…");
        const r = await withValue(
          moveLocalExtras(profile.orgId || profile.uid, undefined, (p) => setBusy(`Yarış evrakı taşınıyor… %${Math.round(p * 100)}`)),
          5 * 60e3,
        );
        if (r) ({ moved, left } = r);
        else {
          left = await localExtraCount().catch(() => 1);
          why = "Yarış evrakı zamanında yüklenemedi";
        }
      } else left = await localExtraCount().catch(() => 0);
      let mails = { moved: 0, left: 0 };
      if (owner) {
        setBusy("Mail ekleri aranıyor…");
        const r = await withValue(
          moveAllMailFiles(profile.uid, (n, step) => setBusy(step === "ara" ? `Mail ekleri aranıyor… (${n} taşındı)` : `Mail ekleri taşınıyor… ${n} taşındı`)).catch((e) => ({ moved: 0, left: 1, err: e?.code || e?.message })),
          20 * 60e3,
        );
        mails = r || { moved: 0, left: 1, err: "zaman aşımı" };
        if (mails.left) why ||= errText(mails.err || mailMoveErr());
      }
      if (left && !why) why = errText(mailMoveErr()) || "Bazı evrak yüklenemedi";
      const meetings = (await listMeetings().catch(() => [])).length;
      setOut({ ok: writes && left === 0 && !mails.left, writes, moved, left, meetings, mailMoved: mails.moved, mailLeft: mails.left, why });
    } catch (e) {
      console.warn("[moveAll]", e);
      setOut({ ok: false, err: true, why: errText(e?.code || e?.message) });
    }
    setBusy("");
  };

  const drop = async () => {
    if (!confirm("Telefondaki kopyalar silinsin mi? Hazırlanan evrak gerekince yeniden hazırlanır, dosyalar açılınca Firebase'den indirilir.")) return;
    setBusy("drop");
    let n = 0;
    for (const r of await listRaceFiles().catch(() => [])) {
      if (/:extra$/.test(r.id)) continue; // taşınamayan evrak (olmamalı) korunur
      await dropRaceFile(r.id);
      n += 1;
    }
    try {
      for (const k of await caches.keys()) await caches.delete(k);
    } catch {}
    setBusy("");
    setOut((o) => ({ ...o, dropped: true }));
    toast(n ? `${n} kopya ve uygulama dosyaları silindi` : "Uygulama dosyaları silindi");
  };

  const text = !out
    ? "Bu telefonda kalan kayıt ve evrakı Firebase'e gönderir"
    : out.err
      ? out.why || "Taşınamadı, internet bağlantısını kontrol et"
      : [
          out.writes ? "Bekleyen kayıtlar gönderildi" : "Bekleyen kayıtlar gönderilemedi",
          out.moved ? `${out.moved} evrak taşındı` : "",
          out.left ? `${out.left} evrak taşınamadı` : "",
          out.mailMoved ? `${out.mailMoved} mail eki taşındı` : "",
          out.mailLeft ? "Bazı mail ekleri taşınamadı" : "",
          out.why || "",
          out.meetings ? `${out.meetings} toplantı özetlenmemiş (Notlar › Toplantı'dan özetle)` : "",
          out.ok ? (out.dropped ? "Kopyalar silindi" : "Hepsi Firebase'de") : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <Row icon="cloud" tone="slate" title="Telefondaki veriyi taşı" sub={text} onClick={busy ? undefined : move}>
      {busy && busy !== "drop" && <p className="px-4 pb-3 text-[0.875rem] text-mut">{busy}</p>}
      {out?.ok && !out.dropped && (
        <div className="px-4 pb-3">
          <button type="button" disabled={!!busy} onClick={drop} className="w-full rounded-xl bg-rec/10 py-2.5 text-[0.9375rem] font-semibold text-rec disabled:opacity-40">
            {busy === "drop" ? "Siliniyor…" : "Telefondaki kopyaları sil"}
          </button>
        </div>
      )}
    </Row>
  );
}
