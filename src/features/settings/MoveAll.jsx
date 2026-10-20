"use client";

import { useState } from "react";
import { waitForPendingWrites } from "firebase/firestore";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { dropRaceFile, listRaceFiles } from "@/features/athletes/raceFiles";
import { localExtraCount, moveLocalExtras } from "@/features/athletes/raceStore";
import { cleanMailFiles } from "@/features/mail/mailFiles";
import { db } from "@/lib/firebase/clientApp";
import { listMeetings } from "@/lib/meeting/store";
import { Btn, Row } from "./ui";

// Ayarlar › Telefondaki veriyi taşı: bu telefonda kalan her şeyi Firebase'e gönderir.
// 1) Gönderilmeyi bekleyen kayıtlar (internetsizken yazılanlar) 2) yalnız bu telefonda duran yarış evrakı (Storage'a)
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
      if (left && !why) why = "Bazı evrak yüklenemedi";
      const meetings = (await listMeetings().catch(() => [])).length;
      setOut({ ok: writes && left === 0, writes, moved, left, meetings, why });
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
    ? ""
    : out.err
      ? out.why || "Taşınamadı, internet bağlantısını kontrol et"
      : [
          out.writes ? "Bekleyen kayıtlar gönderildi" : "Bekleyen kayıtlar gönderilemedi",
          out.moved ? `${out.moved} evrak taşındı` : "",
          out.left ? `${out.left} evrak taşınamadı` : "",
          out.why || "",
          out.meetings ? `${out.meetings} toplantı özetlenmemiş (Notlar › Toplantı'dan özetle)` : "",
          out.ok ? (out.dropped ? "Kopyalar silindi" : "Hepsi Firebase'de") : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <Row title="Telefondaki veriyi Firebase'e taşı" onClick={busy ? undefined : move} chevron={!busy}>
      {text && <p className={`px-4 pb-3 text-[0.8125rem] leading-snug ${out?.err ? "text-rec" : "text-mut"}`}>{text}</p>}
      {busy && busy !== "drop" && <p className="px-4 pb-3 text-[0.875rem] text-mut">{busy}</p>}
      {out?.ok && !out.dropped && (
        <div className="px-4 pb-3">
          <Btn kind="danger" disabled={!!busy} onClick={drop}>
            {busy === "drop" ? "Siliniyor…" : "Telefondaki kopyaları sil"}
          </Btn>
        </div>
      )}
    </Row>
  );
}

// Ayarlar › Mail eklerini sil: banka maillerinin eski Excel ekleri sunucuda silinir, önce Storage'dakiler, sonra maillerin
// içindekiler (mailFiles.js cleanMailFiles). Tablolar mailde kalır; bakiye, aidat, fatura ve banka defteri onları kullanır.
export function MailFilesRow() {
  const toast = useToast();
  const { profile } = useAuth();
  const owner = profile?.role !== "staff" && (profile?.orgId || profile?.uid) === profile?.uid;
  const [busy, setBusy] = useState("");
  const [out, setOut] = useState("");
  if (!owner) return null;

  const run = async () => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return toast("İnternet yok, bağlanınca dene");
    if (!confirm("Banka maillerinin eski Excel ekleri silinsin mi? Tablolar kayıtlı kalır, orijinaller Gmail'de durur.")) return;
    setOut("");
    setBusy("Storage'daki ekler siliniyor…");
    try {
      const r = await cleanMailFiles((mode, n) => setBusy(mode === "files" ? `Storage'daki ekler siliniyor… ${n} silindi` : `Maillerdeki ekler siliniyor… ${n} silindi`));
      setOut(r.files + r.raw ? `Storage'dan ${r.files}, maillerden ${r.raw} ek silindi` : "Silinecek ek yok");
    } catch (e) {
      setOut(`Durdu: ${String(e?.message || e).slice(0, 120)}. Yeniden dokun, kaldığı yerden sürer.`);
    }
    setBusy("");
  };

  return (
    <Row title="Eski mail eklerini sil" onClick={busy ? undefined : run} chevron={!busy}>
      {(busy || out) && <p className="px-4 pb-3 text-[0.8125rem] leading-snug text-mut">{busy || out}</p>}
    </Row>
  );
}
