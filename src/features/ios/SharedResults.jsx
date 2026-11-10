"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { PickSheet } from "@/components/ui/PickSheet";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthletes } from "@/features/athletes/data";
import { loadRaces } from "@/features/athletes/races";
import { addResults, importToast } from "@/features/athletes/resultsImport";
import { hasShare, takeShared } from "@/lib/nativeIos";
import { defaultRace } from "@/lib/raceResults";
import { todayStr } from "@/lib/utils/format";

// Paylaş › Velora (Seyhun 2026-11-10 "WhatsApp grubuna gelen sonuçları direkt uygulamaya"): WhatsApp'taki sonuç PDF'i ya da
// fotoğrafı iPhone'un paylaşma ekiyle (mobil/ios/App/VeloraPaylas) gelir, Velora açılınca bu pencere çıkar. Yarış seçilir (bugün
// süren yarış seçili gelir), Ekle'ye basınca her yerdeki "+ Sonuç ekle" ile aynı akış (resultsImport.addResults) çalışır.
// Yarış sayfası, Genel sonuçlar ve canlı ekran açıksa kendiliğinden güncellenir (races.js watchRace, api/canli).
export function SharedResults() {
  const { profile, isOwner } = useAuth();
  const toast = useToast();
  const orgId = profile?.orgId;
  const allowed = isOwner && canSeeAthletes(profile?.email);
  const [files, setFiles] = useState([]);
  const [races, setRaces] = useState([]);
  const [pick, setPick] = useState("");
  const [choose, setChoose] = useState(false);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (!hasShare() || !orgId || busy.current) return;
    busy.current = true;
    try {
      const got = await takeShared();
      if (!got.length) return;
      if (!allowed) return toast("Bu hesapla sonuç eklenemez");
      setFiles((p) => [...p, ...got]);
      const list = await loadRaces(orgId).catch(() => []);
      setRaces(list);
      setPick((p) => p || defaultRace(list, todayStr())?.id || "");
    } finally {
      busy.current = false;
    }
  }, [orgId, allowed, toast]);

  useEffect(() => {
    check();
    const vis = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("sa-shared-files", check);
    return () => (document.removeEventListener("visibilitychange", vis), window.removeEventListener("sa-shared-files", check));
  }, [check]);

  const close = () => (setFiles([]), setPick(""));
  const race = races.find((r) => r.id === pick) || null;
  const add = async () => {
    if (!race) return;
    try {
      const { athletes = [] } = await loadAthletes();
      let cur = race;
      let last = null;
      for (const file of files) {
        const { got, race: next } = await addResults({ orgId, race: cur, athletes, file });
        cur = next;
        last = got;
      }
      window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: cur }));
      close();
      if (last) toast(`${race.name}: ${importToast(last)}`);
    } catch {
      toast("Sonuç okunamadı");
    }
  };

  return (
    <>
      <Sheet open={files.length > 0} onClose={close} title="Sonuç ekle" footer={<SheetActions onCancel={close} yes="Ekle" onYes={add} disabled={!race} />}>
        <RowList>
          {files.map((f, i) => (
            <Row key={`${f.name}-${i}`} title={f.name} sub={f.type === "application/pdf" ? "PDF" : "Fotoğraf"} chev={false} />
          ))}
        </RowList>
        <div className="mt-4">
          <ListHead title="Yarış" />
          <RowList>
            <Row onClick={() => setChoose(true)} title={race?.name || "Yarış seç"} sub={race ? raceWhen(race) : ""} warn={!race} />
          </RowList>
        </div>
      </Sheet>
      <PickSheet open={choose} onClose={() => setChoose(false)} title="Yarış" items={races.map((r) => ({ id: r.id, title: r.name || "Yarış", sub: raceWhen(r) }))} onPick={setPick} />
    </>
  );
}

const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const raceWhen = (r) => (!r.startDate ? "" : r.endDate && r.endDate !== r.startDate ? `${day(r.startDate)} – ${day(r.endDate)}` : day(r.startDate));
