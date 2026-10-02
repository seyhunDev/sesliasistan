"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { todayStr } from "@/lib/utils/format";
import { Hero, Label, Seg, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { DOC_TEXT } from "./EditAthlete";
import { isActive } from "./data";
import { DOCS, buildRaceDocs, clubInfo, loadFonts, missing, nextNo, rangeText } from "./raceDocs";
import { raceNames } from "./raceNames";
import { applyNotice, readNotice, readNoticeText } from "./raceNotice";
import { NoticeDeadlines, NoticeDetails, NoticeUpload } from "./NoticeView";
import { doneCount, shiftDay, stepsOf } from "./races";
import { DateBadge, Progress, initials, leftText, placeText } from "./RaceList";

const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const daysTo = (d) => Math.round((new Date(`${d}T12:00:00`) - new Date(`${todayStr()}T12:00:00`)) / 864e5);
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const input = "mt-0.5 block h-7 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60";

// Belgelerin kısa tanımı
const DOC_INFO = {
  school: ["book", "GSİM'e: sporcuların okul ve il-ilçe listesi"],
  kafile: ["flag", "Valilik onayı: kafile ve lisans numaraları"],
  travel: ["mail", "GSİM Spor Faaliyetleri Birimine dilekçe"],
  parent: ["users", "Her sporcu için bir sayfa, veli imzalar"],
  club: ["note", "Kulüpten okula, her sporcuya ayrı; tarihleri ayrı"],
};

// Etiketli satır (gruplu kart içinde)
function Row({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 px-4 py-2.5 ${className}`}>
      <span className="block text-[0.6875rem] font-semibold tracking-wide text-mut">{label}</span>
      {children}
    </label>
  );
}
const Group = ({ children }) => <div className={`${card} divide-y divide-line overflow-hidden`}>{children}</div>;
const Pair = ({ children }) => <div className="grid grid-cols-2 divide-x divide-line">{children}</div>;

function Check({ on, tone = "ok" }) {
  return (
    <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 transition ${on ? (tone === "ok" ? "bg-ok text-white ring-ok" : "bg-acc text-white ring-acc") : "ring-line"}`}>
      {on && <Icon name="check" className="size-4 [stroke-width:3]" />}
    </span>
  );
}

// Tek yarış: özet (yapılacaklar, not, takvim), sporcular, bilgiler, evrak.
// Kayıt işleri dışarıdan gelir: onSave(yarış, kimlik) → kimlik, onDelete(kimlik), onPlan(yarış) → bool,
// onNoticePlan(yarış) → eklenen plan sayısı (talimattaki son tarihler), onSaveAthlete(sporcu, değişiklik)
export function RaceEditor({ start, athletes, athletesErr, onRetryAthletes, onSave, onDelete, onPlan, onNoticePlan, onSaveAthlete }) {
  const toast = useToast();
  const [r, setR] = useState(start);
  const [tab, setTab] = useState(start.name ? "sum" : "info");
  const [pick, setPick] = useState(false);
  const [fix, setFix] = useState(null); // bilgisi tamamlanacak sporcu
  const [docs, setDocs] = useState(DOCS.map(([k]) => k));
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null); // hazırlanan PDF
  const [known] = useState(raceNames); // daha önce yazılmış yarış adları (öneri)

  // Belgeyi değiştiren alanlar hazır PDF'i geçersiz kılar
  const set = (k) => (v) => {
    setFile(null);
    setR((p) => {
      const n = { ...p, [k]: v };
      // İzin aralığı varsayılan olarak yarıştan bir gün önce başlar, bir gün sonra biter
      if (k === "startDate" && (!p.leaveStart || p.leaveStart === shiftDay(p.startDate, -1))) n.leaveStart = shiftDay(v, -1);
      if (k === "endDate" && (!p.leaveEnd || p.leaveEnd === shiftDay(p.endDate, 1))) n.leaveEnd = shiftDay(v, 1);
      return n;
    });
  };
  const put = (k, v) => setR((p) => ({ ...p, [k]: v }));
  const field = (k, ph, type = "text") => <input type={type} value={r[k]} onChange={(e) => set(k)(e.target.value)} placeholder={ph} className={input} />;
  // Kulüp yazısı alanı: boşsa yarıştaki değer görünür (tarihlerde değer olarak)
  const club = clubInfo(r);
  const clubDate = (k, v) => <input type="date" value={r[k] || v || ""} onChange={(e) => set(k)(e.target.value)} className={input} />;

  const byId = new Map(athletes.map((a) => [a.id, a]));
  const chosen = r.athleteIds.map((id) => byId.get(id)).filter(Boolean);
  const lost = r.athleteIds.length - chosen.length;
  const incomplete = chosen.filter((a) => missing(a).length);

  // Değişiklikler kendiliğinden kaydedilir (yarış adı yazıldıktan sonra); kayıtlar sırayla gider, çift kayıt olmaz.
  // Sayfadan çıkarken bekleyen değişiklik de yazılır.
  const id = useRef(start.id || null);
  const queue = useRef(Promise.resolve());
  const latest = useRef(r);
  const dirty = useRef(false);
  const save = useCallback(() => {
    const data = latest.current;
    dirty.current = false;
    queue.current = queue.current.then(async () => {
      id.current = await onSave(data, id.current);
    });
    return queue.current;
  }, [onSave]);
  const first = useRef(true);
  useEffect(() => {
    latest.current = r;
    if (first.current) {
      first.current = false;
      return;
    }
    if (!r.name.trim()) return;
    dirty.current = true;
    const t = setTimeout(() => save().catch(() => toast("Yarış kaydedilemedi")), 800);
    return () => clearTimeout(t);
  }, [r, save, toast]);
  useEffect(() => () => void (dirty.current && save().catch(() => {})), [save]);

  const pages =
    (docs.includes("school") ? 1 : 0) + (docs.includes("kafile") ? 1 : 0) + (docs.includes("travel") ? 1 : 0) + (docs.includes("parent") ? chosen.length : 0) + (docs.includes("club") ? chosen.length : 0);
  const ready = [
    ["Yarış adı, il, ilçe, başlangıç tarihi", !!(r.name.trim() && r.city.trim() && r.district.trim() && r.startDate), "info"],
    ["Kulüp yetkilisinin adı", !!r.signer.trim(), "info"],
    [chosen.length ? `${chosen.length} sporcu seçildi` : "Sporcu seçilmedi", chosen.length > 0, "people"],
    [incomplete.length ? `${incomplete.length} sporcunun bilgisi eksik (belgede boş kalır)` : "Sporcu bilgileri tamam", !incomplete.length, "people", true],
  ];

  const make = async () => {
    const bad = ready.find(([, ok, , soft]) => !ok && !soft);
    if (bad) {
      setTab(bad[2]);
      return toast(bad[2] === "people" ? "En az bir sporcu seç" : `Eksik: ${bad[0].toLocaleLowerCase("tr-TR")}`);
    }
    if (!docs.length) return toast("En az bir belge seç");
    setBusy(true);
    try {
      await save();
      const bytes = await buildRaceDocs({ ...r, endDate: r.endDate || r.startDate }, chosen, await loadFonts(), docs);
      const name = `${r.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "yaris"}-evrak.pdf`;
      setFile(new File([bytes], name, { type: "application/pdf" }));
      setTab("docs");
      if (docs.length === DOCS.length && !r.checks?.docs) put("checks", { ...r.checks, docs: true });
    } catch (e) {
      toast(e?.message || "Belgeler hazırlanamadı");
    }
    setBusy(false);
  };
  const share = async () => {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
      } catch {}
      return;
    }
    openPdf(true);
  };
  // Yeni sekmede aç (yazdırmak için) ya da indir
  const openPdf = (download) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    if (download) link.download = file.name;
    else link.target = "_blank";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const toPlan = async () => {
    if (!r.name.trim() || !r.startDate) return toast("Önce yarış adı ve başlangıç tarihi");
    if (await onPlan(r)) {
      put("planAdded", true);
      toast("Planlara eklendi");
    }
  };
  // Yarış talimatı: okunur, yarışa uygulanır (yeni yarışta ad, tarih, yer de talimattan gelir)
  const [reading, setReading] = useState(false);
  // f: dosya ya da yapıştırılan metin
  const loadNotice = async (f) => {
    setReading(true);
    try {
      const n = await (typeof f === "string" ? readNoticeText(f) : readNotice(f));
      setFile(null);
      setR((p) => applyNotice(p, n));
      setTab("sum");
      toast(n.name ? "Talimat okundu" : "Talimat okundu, yarış adını yaz");
    } catch (e) {
      toast(e?.message || "Talimat okunamadı");
    }
    setReading(false);
  };
  const noticePlan = async () => {
    if (!r.name.trim()) return toast("Önce yarış adı");
    const n = await onNoticePlan(r);
    if (n > 0) {
      put("notice", { ...r.notice, planned: true });
      toast(`${n} son tarih planlara eklendi`);
    } else toast("Planlara eklenemedi");
  };

  const remove = async () => {
    if (!id.current || !confirm(`"${r.name}" silinsin mi? Sporcu kartları etkilenmez.`)) return;
    dirty.current = false;
    await queue.current.catch(() => {});
    await onDelete(id.current);
  };

  const n = doneCount(r);
  const steps = stepsOf(r);
  const fromNotice = steps.some((x) => x.group === "notice");
  const inGroup = (group) => steps.filter((x) => (group === "docs" ? x.group === "docs" : x.group !== "docs"));
  const count = (group) => `${inGroup(group).filter((x) => r.checks?.[x.key]).length}/${inGroup(group).length}`;
  const stepList = (group) => (
    <ul className={`${card} divide-y divide-line overflow-hidden`}>
      {inGroup(group).map(({ key, label, date, detail }) => {
        const on = !!r.checks?.[key];
        const left = date ? daysTo(date) : null;
        return (
          <li key={key}>
            <button type="button" onClick={() => put("checks", { ...r.checks, [key]: !on })} aria-pressed={on} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
              <Check on={on} />
              <span className="min-w-0 flex-1">
                <span className={`block text-[0.9375rem] ${on ? "text-mut line-through decoration-mut/50" : "font-medium"}`}>{label}</span>
                {(date || detail) && (
                  <span className="block text-[0.8125rem] text-mut">
                    {[date && shortDay(date), detail].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              {left !== null && !on && (
                <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums ${left < 0 ? "bg-bg text-mut" : left <= 7 ? "bg-rec/10 text-rec" : "bg-amber-500/15 text-amber-700"}`}>
                  {left < 0 ? "Geçti" : left === 0 ? "Bugün" : `${left} gün`}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <>
      {/* Özet kart */}
      <Hero className="mt-2">
        <div className="flex gap-3">
          <DateBadge r={r} light />
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[1.0625rem] font-semibold leading-tight">{placeText(r) || "Yer girilmedi"}</b>
            <span className="mt-0.5 block truncate text-[0.8125rem] text-white/75">{[leftText(r), `${chosen.length} sporcu`, r.planAdded && "planda"].filter(Boolean).join(" · ")}</span>
            <span className="mt-2.5 flex items-center gap-2">
              <Progress n={n} of={steps.length} light className="flex-1" />
              <span className="text-[0.75rem] font-semibold tabular-nums text-white/85">
                {n}/{steps.length} iş
              </span>
            </span>
          </div>
        </div>
      </Hero>

      <Seg
        value={tab}
        onChange={setTab}
        options={[["sum", "Özet"], ["people", "Sporcular", chosen.length], ["info", "Bilgiler"], ["docs", "Evrak"]]}
        className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-[5] mt-3"
      />

      {tab === "sum" && (
        <>
          <Label right={`${fromNotice ? "talimata göre · " : ""}${count("prep")}`}>KAYIT VE HAZIRLIK</Label>
          {stepList("prep")}
          {!fromNotice && !r.notice && <p className="mt-2 px-1 text-[0.75rem] text-mut">Talimatı yüklersen bu liste talimattaki işlere ve son tarihlere göre kurulur.</p>}

          <Label right={count("docs")}>EVRAK</Label>
          {stepList("docs")}

          <Label>NOT</Label>
          <div className={`${card} px-4 py-3`}>
            <textarea
              value={r.note}
              onChange={(e) => put("note", e.target.value)}
              placeholder="Konaklama, ulaşım, kayıt ücreti, tekne taşıma…"
              rows={4}
              className="block w-full resize-none bg-transparent text-[0.9375rem] leading-relaxed outline-none placeholder:text-mut/60"
            />
          </div>

          <Label>TAKVİM</Label>
          <div className={`${card} flex items-center gap-3 px-4 py-3`}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-700">
              <Icon name="cal" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">{r.planAdded ? "Planlarda" : "Planlarda değil"}</b>
              <span className="block truncate text-[0.8125rem] text-mut">{rangeText(r.startDate, r.endDate) || "Tarih girilmedi"}</span>
            </span>
            {r.planAdded ? (
              <Icon name="check" className="size-5 text-ok" />
            ) : (
              <button type="button" onClick={toPlan} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95">
                Ekle
              </button>
            )}
          </div>

          <NoticeDeadlines n={r.notice} planned={!!r.notice?.planned} onPlan={noticePlan} />

          {r.notice ? (
            <NoticeDetails n={r.notice} busy={reading} onFile={loadNotice} onText={loadNotice} />
          ) : (
            <>
              <Label>TALİMAT</Label>
              <NoticeUpload busy={reading} onFile={loadNotice} onText={loadNotice} />
            </>
          )}
        </>
      )}

      {tab === "people" && (
        <>
          <Label right={chosen.length ? `${chosen.length} sporcu` : ""}>KAFİLE</Label>
          {athletesErr ? (
            <button type="button" onClick={onRetryAthletes} className={`${card} w-full px-4 py-3.5 text-left text-[0.875rem]`}>
              <b className="block font-semibold text-rec">{athletesErr.text}</b>
              <span className="text-mut">Sporcular sayfasından kulüp hesabına bağlan, sonra tekrar dene</span>
            </button>
          ) : !athletes.length ? (
            <Loading label="Sporcular yükleniyor" className="py-8" />
          ) : (
            <div className={`${card} divide-y divide-line overflow-hidden`}>
              <button type="button" onClick={() => setPick(true)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-acc active:bg-bg">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10">
                  <Icon name="plus" className="size-5" />
                </span>
                <b className="text-[0.9375rem] font-semibold">{chosen.length ? "Sporcu ekle ya da çıkar" : "Sporcu seç"}</b>
              </button>
              {chosen.map((a) => {
                const miss = missing(a);
                return (
                  <button key={a.id} type="button" onClick={() => setFix(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc">{initials(a.studentName)}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</b>
                      <span className={`block truncate text-[0.8125rem] ${miss.length ? "text-amber-700" : "text-mut"}`}>
                        {miss.length ? `${miss.length} bilgi eksik: ${miss.join(", ")}` : [a.licenseNo && `Lisans ${a.licenseNo}`, a.studentSchool || a.studentSchoolAndClass].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${miss.length ? "bg-amber-500/15 text-amber-700" : "bg-ok/10 text-ok"}`}>
                      {miss.length ? "Eksik" : "Tamam"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {lost > 0 && <p className="mt-2 px-1 text-[0.75rem] text-mut">{lost} sporcu artık listede yok, belgeye girmez.</p>}
          {chosen.length > 0 && <p className="mt-2 px-1 text-[0.75rem] text-mut">Sporcuya dokunup eksik bilgileri gir; sporcu kartına kaydolur, sonraki yarışlarda hazır gelir.</p>}
        </>
      )}

      {tab === "info" && (
        <>
          {!r.notice && (
            <div className="mt-4">
              <NoticeUpload busy={reading} onFile={loadNotice} onText={loadNotice} title={r.name ? "Yarış talimatını yükle" : "Talimattan oluştur"} />
            </div>
          )}
          <Label>YARIŞ</Label>
          <Group>
            <Row label="Yarış adı">
              <input value={r.name} onChange={(e) => set("name")(e.target.value)} placeholder="D’Azur Optimist Regatta" list="race-names" autoComplete="off" className={input} />
              <datalist id="race-names">
                {known.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Row>
            <Row label="Federasyon">{field("federation", "Yelken")}</Row>
            <Pair>
              <Row label="İl">{field("city", "İzmir")}</Row>
              <Row label="İlçe">{field("district", "Çeşme")}</Row>
            </Pair>
          </Group>

          <Label>TARİHLER</Label>
          <Group>
            <Pair>
              <Row label="Başlangıç">{field("startDate", "", "date")}</Row>
              <Row label="Bitiş">{field("endDate", "", "date")}</Row>
            </Pair>
            <Pair>
              <Row label="İzin başlangıcı">{field("leaveStart", "", "date")}</Row>
              <Row label="İzin bitişi">{field("leaveEnd", "", "date")}</Row>
            </Pair>
            <Row label="Yazı tarihi">{field("letterDate", "", "date")}</Row>
          </Group>
          <p className="mt-2 px-1 text-[0.75rem] text-mut">İzin aralığı kendiliğinden yarıştan bir gün önce başlar, bir gün sonra biter.</p>

          <Label>KULÜP YETKİLİSİ</Label>
          <Group>
            <Pair>
              <Row label="Ad soyad (imzalayan)">{field("signer", "Ad Soyad")}</Row>
              <Row label="Görevi">{field("signerTitle", "Başkan")}</Row>
            </Pair>
          </Group>

          <Label>SEYAHAT</Label>
          <Group>
            <Row label="Seyahat türü">{field("travel", "Kendi İmkanları İle")}</Row>
            <Pair>
              <Row label="Araç plaka / model">{field("vehicle", "-")}</Row>
              <Row label="Şoför / ehliyet">{field("drivers", "-")}</Row>
            </Pair>
          </Group>

          {start.id && (
            <button type="button" onClick={remove} className={`${card} mt-6 flex h-12 w-full items-center justify-center gap-2 text-[0.9375rem] font-semibold text-rec`}>
              <Icon name="trash" className="size-[1.125rem]" />
              Yarışı sil
            </button>
          )}
        </>
      )}

      {tab === "docs" && (
        <>
          <Label right={`${docs.length}/${DOCS.length} seçili`}>BELGELER</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {DOCS.map(([k, label]) => {
              const on = docs.includes(k);
              const [icon, sub] = DOC_INFO[k];
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => (setFile(null), setDocs((d) => (on ? d.filter((x) => x !== k) : DOCS.map(([x]) => x).filter((x) => x === k || d.includes(x)))))}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg"
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                      <Icon name={icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className={`block text-[0.9375rem] font-semibold ${on ? "" : "text-mut"}`}>{label}</b>
                      <span className="block text-[0.8125rem] leading-snug text-mut">{k === "parent" && chosen.length ? `${chosen.length} sayfa · veli imzalar` : k === "club" && chosen.length ? `${chosen.length} sayfa · her sporcunun okuluna` : sub}</span>
                    </span>
                    <Check on={on} tone="acc" />
                  </button>
                </li>
              );
            })}
          </ul>

          {docs.includes("club") && (
            <>
              <Label>KULÜP İZİN YAZISI</Label>
              <Group>
                <Pair>
                  <Row label="Sayı (ilk sporcu)">{field("clubNo", "GID-2026-14")}</Row>
                  <Row label="Yazı tarihi">{clubDate("clubDate", r.letterDate)}</Row>
                </Pair>
                <Pair>
                  <Row label="İzin başlangıcı">{clubDate("clubFrom", r.startDate)}</Row>
                  <Row label="İzin bitişi">{clubDate("clubTo", r.endDate || r.startDate)}</Row>
                </Pair>
                <Row label="Etkinlik adı">{field("clubEvent", r.name || "Optimist Gelişim Kampı")}</Row>
                <Row label="Yeri">{field("clubPlace", club.place || "Çeşme-İzmir")}</Row>
                <Pair>
                  <Row label="İmzalayan">{field("clubSigner", "Ad SOYAD")}</Row>
                  <Row label="Görevi">{field("clubTitle", "Antrenör")}</Row>
                </Pair>
              </Group>
              <p className="mt-2 px-1 text-[0.75rem] text-mut">
                {[
                  club.no && chosen.length > 1 && `Sayı sporcu başına artar: ${club.no} … ${nextNo(club.no, chosen.length - 1)}.`,
                  "Boş bırakılanlar yarış bilgisinden gelir; kamp gibi farklı tarih ve ad için burayı değiştir.",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
              {(r.clubFrom || r.clubTo || r.clubEvent || r.clubPlace) && (
                <button
                  type="button"
                  onClick={() => (setFile(null), setR((p) => ({ ...p, clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "" })))}
                  className="mt-1 px-1 text-[0.8125rem] font-semibold text-acc"
                >
                  Yarışın tarih, ad ve yerine dön
                </button>
              )}
            </>
          )}

          <Label>HAZIRLIK</Label>
          <ul className={`${card} space-y-2.5 px-4 py-3.5`}>
            {ready.map(([label, ok, to, soft]) => (
              <li key={label}>
                <button type="button" onClick={() => !ok && setTab(to)} className="flex w-full items-center gap-2.5 text-left">
                  <Icon name={ok ? "check" : "alert"} className={`size-[1.125rem] shrink-0 ${ok ? "text-ok" : soft ? "text-amber-600" : "text-rec"}`} />
                  <span className={`flex-1 text-[0.875rem] ${ok ? "text-mut" : "font-medium"}`}>{label}</span>
                  {!ok && <Icon name="chev" className="size-4 text-mut" />}
                </button>
              </li>
            ))}
          </ul>

          {file && (
            <>
              <Label>HAZIR</Label>
              <div className={`${card} flex items-center gap-3 px-4 py-3`}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-[0.6875rem] font-bold text-rec">PDF</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{file.name}</b>
                  <span className="block text-[0.8125rem] text-mut">{pages} sayfa · yazdır, imzala, gönder</span>
                </span>
              </div>
            </>
          )}
        </>
      )}

      {/* Alt çubuk: belge hazırla → aç / paylaş */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-[26rem] gap-2">
          {file ? (
            <>
              <button type="button" onClick={() => openPdf(false)} className="flex h-12 items-center gap-1.5 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line">
                <Icon name="print" className="size-5" />
                Aç
              </button>
              <button type="button" onClick={share} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white">
                <Icon name="up" className="size-5" />
                Paylaş / Yazdır
              </button>
            </>
          ) : (
            <button type="button" onClick={make} disabled={busy} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-50">
              <Icon name="print" className="size-5" />
              {busy ? "Hazırlanıyor…" : pages ? `Belgeleri hazırla · ${pages} sayfa` : "Belgeleri hazırla"}
            </button>
          )}
        </div>
      </div>

      <Pick open={pick} athletes={athletes} value={r.athleteIds} onClose={() => setPick(false)} onChange={(ids) => set("athleteIds")(ids)} />
      <Sheet open={!!fix} onClose={() => setFix(null)} title={fix ? fix.studentName : ""}>
        {fix && (
          <DocFields
            key={fix.id}
            a={fix}
            onSave={onSaveAthlete}
            onClose={() => setFix(null)}
            onSaved={() => {
              setFix(null);
              setFile(null);
            }}
          />
        )}
      </Sheet>
    </>
  );
}

// Sporcu seçimi (aktif sporcular; arama)
function Pick({ open, athletes, value, onClose, onChange }) {
  const [q, setQ] = useState("");
  const sel = new Set(value);
  const term = low(q).trim();
  const list = athletes.filter((a) => (isActive(a) || sel.has(a.id)) && (!term || low(a.studentName).includes(term)));
  const toggle = (id) => onChange(sel.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Sheet open={open} onClose={onClose} title={`Sporcu seç · ${value.length}`}>
      <label className="flex h-11 items-center gap-2 rounded-xl bg-bg px-3">
        <Icon name="search" className="size-[1.125rem] shrink-0 text-mut" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" inputMode="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut" />
      </label>
      <ul className="mt-2 divide-y divide-line">
        {list.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => toggle(a.id)} aria-pressed={sel.has(a.id)} className="flex w-full items-center gap-3 py-2.5 text-left active:bg-bg">
              <Check on={sel.has(a.id)} tone="acc" />
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.6875rem] font-semibold text-acc">{initials(a.studentName)}</span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.studentName}</span>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="sticky bottom-0 mt-3 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white">
        Tamam
      </button>
    </Sheet>
  );
}

// Belgede gereken bilgileri sporcu kartına yazar (bir kez girilir, sonraki yarışlarda hazır gelir)
const BASIC = [
  ["studentTc", "T.C. kimlik no", "numeric"],
  ["parentName", "Veli ad soyad"],
  ["parentPhone", "Veli telefonu", "tel"],
];
function DocFields({ a, onSave, onClose, onSaved }) {
  const toast = useToast();
  const fields = [...BASIC.slice(0, 1), ...DOC_TEXT, ...BASIC.slice(1)];
  const startDate = a.studentBirthDate ? a.studentBirthDate.slice(0, 10) : "";
  const [f, setF] = useState(() => ({ ...Object.fromEntries(fields.map(([k]) => [k, a[k] || ""])), studentBirthDate: startDate }));
  const [busy, setBusy] = useState(false);
  const patch = Object.fromEntries(
    Object.keys(f)
      .filter((k) => (k === "studentBirthDate" ? f[k] !== startDate : f[k].trim() !== (a[k] || "")))
      .map((k) => [k, f[k].trim()]),
  );
  const save = async () => {
    for (const k of ["studentTc", "parentTc"]) if (f[k] && !/^\d{11}$/.test(f[k].trim())) return toast("T.C. kimlik no 11 haneli olmalı");
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    try {
      await onSave(a, patch);
      toast("Kaydedildi");
      onSaved();
    } catch (e) {
      toast(e?.message || "Kaydedilemedi");
      setBusy(false);
    }
  };
  return (
    <div className="pb-2">
      {!a.studentSchool && a.studentSchoolAndClass && <p className="mb-2 text-[0.75rem] text-mut">Okul adı boşsa belgeye “{a.studentSchoolAndClass}” yazılır.</p>}
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
        {fields.map(([k, label, mode]) => (
          <Row key={k} label={label} className={f[k] ? "" : "bg-amber-500/5"}>
            <input
              value={f[k]}
              onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
              inputMode={mode}
              maxLength={k === "studentTc" || k === "parentTc" ? 11 : 200}
              className={input}
            />
          </Row>
        ))}
        <Row label="Doğum tarihi" className={f.studentBirthDate ? "" : "bg-amber-500/5"}>
          <input type="date" value={f.studentBirthDate} onChange={(e) => setF((p) => ({ ...p, studentBirthDate: e.target.value }))} className={input} />
        </Row>
      </div>
      <div className="sticky bottom-0 -mx-5 mt-4 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button type="button" onClick={onClose} className="h-12 rounded-xl bg-bg text-[0.9375rem] font-semibold">
          Vazgeç
        </button>
        <button type="button" onClick={save} disabled={busy} className="h-12 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          {busy ? "Kaydediliyor…" : Object.keys(patch).length ? "Kaydet" : "Kapat"}
        </button>
      </div>
    </div>
  );
}
