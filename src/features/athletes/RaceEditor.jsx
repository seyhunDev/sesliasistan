"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { todayStr } from "@/lib/utils/format";
import { Label, Seg, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { DOC_TEXT } from "./EditAthlete";
import { EXPIRY, raceExpired } from "@/lib/expiry";
import { withResults } from "@/lib/raceResults";
import { ourPlaces } from "@/lib/raceDay";
import { isActive } from "./data";
import { COACH_DOCS, COACH_FIELDS, DOCS, DOC_DEFAULT, cleanDocs, buildRaceDocs, cleanCoach, clubInfo, coachMissing, hotelInfo, loadFonts, missing, nextNo, phoneMissing, rangeText, splitPages } from "./raceDocs";
import { raceNames } from "./raceNames";
import { applyNotice, kindOf, noticeDiff, readNotice, readNoticeText } from "./raceNotice";
import { dropNoticeFile, loadNoticeFile, noticeName, noticePdf, saveNoticeFile } from "./noticeFile";
import { NoticeDetails, NoticeUpload } from "./NoticeView";
import { RaceHotels } from "./RaceHotels";
import { MailTo } from "@/features/mail/MailTo";
import { openFile, shareFile } from "./fileActions";
import { BudgetView } from "./BudgetView";
import { tl, totals } from "./budget";
import { buildAthleteSheet, sheetParts } from "./athleteSheet";
import { AroundView } from "./AroundView";
import { RaceWx } from "./RaceWx";
import { RaceDayTop, useRacePhase } from "./RaceDayTop";
import { RACE_KEY } from "@/features/posts/postModel";
import { loadPosts } from "@/features/posts/posts";
import { racePlansOf, racePostOf } from "./raceLinks";
import { dropExtras, dropRaceFile, getExtras, getRaceFile, saveExtras, saveRaceFile } from "./raceFiles";
import { RACE_FILE_MAX, dropRaceStored, loadRaceFile, moveLocalExtras, uploadRaceFile } from "./raceStore";
import { cleanDone, cleanNotice, cleanSkips, cleanTodos, doneSteps, hiddenCount, mergeHotels, raceHotels, shiftDay, stepsOf, todoKey, tripRows } from "./races";
import { initials, leftText, placeText } from "./RaceList";
import { fromShared } from "@/lib/sharedRace";

const withHotels = (p, n) => (p.notice ? { ...p, notice: cleanNotice({ ...p.notice, hotels: n.hotels }), hotels: mergeHotels(p.hotels, n.hotels) } : p);
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const daysTo = (d) => Math.round((new Date(`${d}T12:00:00`) - new Date(`${todayStr()}T12:00:00`)) / 864e5);
const madeText = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const partName = (all, title) => `${all.replace(/-evrak\.pdf$/, "")}-${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.pdf`;
// Saklanan parçadan dosyalar: belge + (sporcu başına belgede) her sporcunun tek sayfası
const partFiles = (all, x) => ({
  ...x,
  file: new File([x.blob], partName(all, x.title), { type: "application/pdf" }),
  people: (x.people || []).map((p) => ({ ...p, file: new File([p.blob], partName(all, `${x.title} ${p.name}`), { type: "application/pdf" }) })),
});
const asFile = (x) => new File([x.blob], x.name, { type: x.type });
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const input = "mt-0.5 block h-7 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60";

// Belgelerin kısa tanımı
// Yalnız TYF formlarında kullanılan antrenör alanları
const TYF_ONLY = ["sicil", "level", "club", "city", "email", "adb", "team", "boatNo", "boatLength", "boatColor", "boatPower", "boatCount"];
const DOC_INFO = {
  school: ["book", "GSİM'e: sporcuların okul ve il-ilçe listesi"],
  kafile: ["flag", "Valilik onayı: kafile ve lisans numaraları"],
  travel: ["mail", "GSİM Spor Faaliyetleri Birimine dilekçe"],
  parent: ["users", "Her sporcu için bir sayfa, veli imzalar"],
  adult: ["user", "Antrenör için: kendi imkânlarıyla seyahat taahhüdü"],
  club: ["note", "Kulüpten okula, her sporcuya ayrı; tarihleri ayrı"],
  hotel: ["home", "Tek sayfa: tüm velilerin otel konaklama imzası"],
  coach: ["user", "TYF: antrenör ve destek botu bilgileri, beyan"],
  entry: ["users", "TYF: kulüp, antrenör ve sporcular (sicil, yelken no)"],
};

// Dosya satırı: tür etiketi, ad, alt bilgi; aç, paylaş, (varsa) sil
function FileRow({ tag, title, sub, onOpen, onShare, onRemove }) {
  return (
    <li className="flex items-center gap-1 pl-4 pr-1.5">
      <button type="button" onClick={onOpen} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-[0.625rem] font-bold text-rec">{tag}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
          <span className="block truncate text-[0.8125rem] text-mut">{sub}</span>
        </span>
      </button>
      <button type="button" onClick={onShare} aria-label={`${title} paylaş`} data-press className="btn btn-icon size-10 shrink-0 text-acc">
        <Icon name="up" className="size-5" />
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${title} sil`} data-press className="btn btn-icon size-10 shrink-0 text-mut">
          <Icon name="x" className="size-4" />
        </button>
      )}
    </li>
  );
}

// Belgeler gruplara ayrılır; her belgenin seçimi, ayarı ve hazır dosyası tek satırda
const DOC_GROUPS = [
  ["İL MÜDÜRLÜĞÜ · RESMİ", ["kafile", "travel", "school"]],
  ["VELİ VE OKUL · HER SPORCUYA AYRI", ["parent", "club", "hotel"]],
  ["ANTRENÖR", ["adult"]],
  ["FEDERASYON (TYF)", ["coach", "entry"]],
];
const DOC_TITLE = Object.fromEntries(DOCS);
const DOC_SET = ["travel", "club", "hotel", "entry"]; // açılınca ayarı olan belgeler

// Sporcu başına sayfalar: ada dokun aç, okla paylaş
function PeopleList({ people, openPdf, share }) {
  return (
    <ul className="divide-y divide-line">
      {people.map((p) => (
        <li key={p.id} className="flex items-center gap-1 pl-1">
          <button type="button" onClick={() => openPdf(p.file)} data-press="row" className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.6875rem] font-bold text-acc">{initialsOf(p.name)}</span>
            <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{p.name}</span>
          </button>
          <button type="button" onClick={() => share(p.file)} aria-label={`${p.name} paylaş`} data-press className="btn btn-icon size-10 shrink-0 text-acc">
            <Icon name="up" className="size-5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

const initialsOf = (n) =>
  String(n || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toLocaleUpperCase("tr-TR"))
    .join("");

// Etiketli satır (gruplu kart içinde)
function Row({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 px-4 py-2.5 ${className}`}>
      <span className="block text-[0.6875rem] font-semibold tracking-wide text-mut">{label}</span>
      {children}
    </label>
  );
}
const Group = ({ children, className = "" }) => <div className={`${card} divide-y divide-line overflow-hidden ${className}`}>{children}</div>;
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
// coach: hesabın antrenör bilgileri (users/{uid}.coach), onCoach(bilgi) kaydeder
export function RaceEditor({ head = null, alert = null, sharedList = [], orgId, start, athletes, classes = [], athletesErr, onRetryAthletes, onSave, onDelete, plans = [], onOpenPlan, menu = false, onMenu, onPlan, onNoticePlan, onSaveAthlete, onMail, mailTo, onMailTo, coach: savedCoach, onCoach }) {
  const toast = useToast();
  const [r, setR] = useState(start);
  const [noticeInfo, setNoticeInfo] = useState(false);
  // Yeni yarış önce tek soruyla başlar: talimat var mı? (talimatla ya da elle ad, tarih, yer) → sonra sayfa
  const [begun, setBegun] = useState(!!start.id);
  const [manual, setManual] = useState(false);
  const [tab, setTab] = useState("sum");
  const [edit, setEdit] = useState(false); // yarışın adı, tarihi, yeri (başlık kartına dokununca)
  // Sekmeye ya da yarış bilgisi penceresine git
  const go = (t) => (t === "edit" ? setEdit(true) : setTab(t));
  const [pick, setPick] = useState(false);
  const [fix, setFix] = useState(null); // bilgisi tamamlanacak sporcu
  // Seçili belgeler yarışta saklanır (yeni yarışta hepsi, kulüp izin yazısı kapalı)
  const [startDocs] = useState(() => cleanDocs(start.docs));
  const [docs, setDocs] = useState(() => startDocs || DOC_DEFAULT);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null); // hazırlanan PDF
  const [stale, setStale] = useState(false); // hazır evrak bir bilgi değişince geçersiz oldu (yeniden hazırlanmalı)
  const [mailText, setMailText] = useState(""); // hazır PDF'in mail metni
  const [made, setMade] = useState(null); // { at, pages } hazırlanma zamanı (bu cihazda saklı)
  // Bu cihazdaki kopyaya bakıldı mı (Seyhun 2026-10-26: "hiçbir değişiklik olmadan evrak yenilemesi istiyor"): bakılana kadar "yenile" denmez
  const [checked, setChecked] = useState(false);
  const [parts, setParts] = useState([]); // her belge ayrı PDF: [{ key, title, file, pages }]
  const [extras, setExtras] = useState([]); // eski düzen: yalnız bu telefonda kalan eklenen evrak [{ id, name, type, blob, at }] (Firebase'e gönderilir)
  // Hazır PDF bu cihazda saklıdır; sayfaya dönünce yeniden hazırlamak gerekmez
  useEffect(() => {
    let live = true;
    getRaceFile(start.id).then((f) => {
      if (live) setChecked(true);
      if (!live || !f?.blob) return;
      setFile(new File([f.blob], f.name, { type: "application/pdf" }));
      if (Array.isArray(f.docs) && f.docs.length && !startDocs) setDocs(cleanDocs(f.docs));
      setMailText(f.mailText || "");
      setMade({ at: f.at, pages: f.pages });
      setParts((f.parts || []).map((x) => partFiles(f.name, x)));
    });
    getExtras(start.id).then((l) => live && setExtras(l));
    return () => void (live = false);
  }, [start.id, startDocs]);
  const [known] = useState(raceNames); // daha önce yazılmış yarış adları (öneri)

  // Belgeyi değiştiren alanlar hazır PDF'i geçersiz kılar (cihazdaki kopya da silinir)
  const dropFile = () => {
    if (file) setStale(true);
    setFile(null);
    setMade(null);
    setParts([]);
    dropRaceFile(id.current);
  };
  // Belge seçimi: yarışa da yazılır (sonraki açılışta aynı seçim gelir)
  const pickDoc = (k, on) => {
    dropFile();
    const next = DOCS.map(([x]) => x).filter((x) => (x === k ? on : docs.includes(x)));
    setDocs(next);
    setR((p) => ({ ...p, docs: next }));
  };
  // Yalnız değer gerçekten değişince (aynı sporcuyu yeniden eklemek, aynı oteli seçmek evrakı bozmaz)
  const same = (a, b) => (Array.isArray(a) ? a.join() === (b || []).join() : (a ?? "") === (b ?? ""));
  const set = (k) => (v) => {
    if (!same(v, latest.current[k])) dropFile();
    setR((p) => {
      const n = { ...p, [k]: v };
      // İzin aralığı varsayılan olarak yarıştan bir gün önce başlar, bir gün sonra biter
      if (k === "startDate" && (!p.leaveStart || p.leaveStart === shiftDay(p.startDate, -1))) n.leaveStart = shiftDay(v, -1);
      if (k === "endDate" && (!p.leaveEnd || p.leaveEnd === shiftDay(p.endDate, 1))) n.leaveEnd = shiftDay(v, 1);
      return n;
    });
  };
  const put = (k, v) => setR((p) => ({ ...p, [k]: v }));
  // Yolculuk alanları belgeye girmez (hazır PDF bozulmaz)
  const tripField = (k, ph, type = "text") => <input type={type} value={r[k] || ""} onChange={(e) => put(k, e.target.value)} placeholder={ph} className={`${input} appearance-none`} />;
  const field = (k, ph, type = "text") => <input type={type} value={r[k]} onChange={(e) => set(k)(e.target.value)} placeholder={ph} className={input} />;
  // Kulüp yazısı alanı: boşsa yarıştaki değer görünür (tarihlerde değer olarak)
  const club = clubInfo(r);
  const hotel = hotelInfo(r);
  // Otel izninde Yolculuk'taki oteller seçilir (dokununca otel adı olur)
  const hotels = [...new Set(raceHotels(r).map((h) => String(h?.name || "").trim()).filter(Boolean))].slice(0, 6);
  const clubDate = (k, v) => <input type="date" value={r[k] || v || ""} onChange={(e) => set(k)(e.target.value)} className={input} />;

  const byId = new Map(athletes.map((a) => [a.id, a]));
  const chosen = r.athleteIds.map((id) => byId.get(id)).filter(Boolean);
  const lost = r.athleteIds.length - chosen.length;
  const incomplete = chosen.filter((a) => missing(a, docs).length);
  const noPhone = phoneMissing(chosen, docs);
  // TYF formları: sporcunun tekne sınıfı (ILCA 4…) kulüp uygulamasındaki sınıfından; sınıf başına ayrı form
  const className = Object.fromEntries(classes.map((c) => [c.id, c.name]));
  const forDocs = chosen.map((a) => ({ ...a, boatClass: className[a.currentClassId] || "" }));
  const autoClasses = [...new Set(forDocs.map((a) => a.boatClass).filter(Boolean))];
  const groupCount = (r.entryClass || "").trim() ? 1 : Math.max(1, new Set(forDocs.map((a) => a.boatClass)).size);
  // Belge satırındaki kısa bilgi
  const docSub = (k, part) => {
    const n = chosen.length;
    const pg = part?.pages ? `${part.pages} sayfa · ` : "";
    if (k === "parent") return `${pg}${n} sporcu, her biri ayrı`;
    if (k === "club") return `${pg}${n} sporcu · her sporcunun okuluna`;
    if (k === "hotel") return `${part ? "" : "1 sayfa · "}${pg}${n} veli imzalar`;
    if ((k === "coach" || k === "entry") && groupCount > 1) return `${pg}${groupCount} form · her sınıfa ayrı`;
    return part ? `${part.pages ? `${part.pages} sayfa` : "Hazır"}` : DOC_INFO[k][1];
  };
  // Antrenör bilgileri hesapta saklanır (her yarışta aynı); yazdıkça kısa süre sonra kaydedilir
  const [coach, setCoach] = useState(() => cleanCoach(savedCoach));
  const coachDirty = useRef(false);
  const coachLast = useRef(coach);
  const [coachSaved, setCoachSaved] = useState(false);
  const setCoachField = (k) => (v) => {
    if (!same(v, coach[k])) dropFile();
    coachDirty.current = true;
    setCoach((c) => ({ ...c, [k]: v }));
  };
  useEffect(() => {
    coachLast.current = coach;
    if (!coachDirty.current || !onCoach) return;
    const t = setTimeout(() => {
      coachDirty.current = false;
      setCoachSaved(false);
      Promise.resolve(onCoach(cleanCoach(coach))).then((ok) => ok !== false && setCoachSaved(true));
    }, 800);
    return () => clearTimeout(t);
  }, [coach, onCoach]);
  useEffect(() => () => void (coachDirty.current && onCoach?.(cleanCoach(coachLast.current))), [onCoach]);
  // Başka cihazda (ya da bu cihazda başka sayfada) kaydedilen bilgi gelince alanlar güncellenir (yazarken değil)
  const savedKey = JSON.stringify(cleanCoach(savedCoach));
  useEffect(() => {
    if (!coachDirty.current) setCoach(JSON.parse(savedKey));
  }, [savedKey]);
  const tyf = docs.includes("coach") || docs.includes("entry");
  const coachOn = docs.some((k) => COACH_DOCS.includes(k));
  const coachLack = coachOn ? coachMissing(coach, docs) : [];
  // Seçili belgelerde boş kalacak antrenör alanları (sarı görünür)
  // Bilgiler tamamsa antrenör bölümü kapalı gelir (her yarışta yeniden sorulmuyor gibi görünsün diye), Düzenle ile açılır
  const [coachOpen, setCoachOpen] = useState(() => coachMissing(cleanCoach(savedCoach), startDocs || DOC_DEFAULT).length > 0);
  const coachLackKeys = coachOn ? COACH_FIELDS.map(([k]) => k).filter((k) => coachMissing({ ...coach, [k]: "" }, docs).length > coachLack.length) : [];
  const expired = chosen.filter((a) => raceExpired(a, r).length); // yarışın son günü itibarıyla süresi geçmiş belge
  const fixList = chosen.filter((a) => incomplete.includes(a) || expired.includes(a));
  const coachRef = useRef(null);
  // Yetkili adı eksikken Eksikler'de yazılır; yazarken kutu yer değiştirmesin diye bu açılışta orada kalır
  const [signerAsk] = useState(() => !(start.signer || "").trim());

  // Değişiklikler kendiliğinden kaydedilir (yarış adı yazıldıktan sonra); kayıtlar sırayla gider, çift kayıt olmaz.
  // Sayfadan çıkarken bekleyen değişiklik de yazılır.
  const id = useRef(start.id || null);
  const [rid, setRid] = useState(start.id || ""); // ekranda kullanılan kimlik (yeni yarış ilk kayıttan sonra)
  const queue = useRef(Promise.resolve());
  const latest = useRef(r);
  const dirty = useRef(false);
  const save = useCallback(() => {
    const data = latest.current;
    dirty.current = false;
    queue.current = queue.current.then(async () => {
      id.current = await onSave(data, id.current);
      setRid(id.current || "");
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
  // Asistan bu yarışı değiştirdiyse (sporcu, not, tarih, bütçe) sayfa yeniden kaydetmeden güncellenir
  useEffect(() => {
    const on = (e) => {
      const n = e.detail;
      if (!n?.id || n.id !== id.current) return;
      const p = latest.current;
      if (n.startDate !== p.startDate || n.endDate !== p.endDate || n.athleteIds.join() !== p.athleteIds.join()) dropFile();
      first.current = !dirty.current; // asistanın değişikliği kaydedildi; sayfada bekleyen değişiklik varsa birlikte yazılır
      setR({ ...p, athleteIds: n.athleteIds, note: n.note, city: n.city, district: n.district, startDate: n.startDate, endDate: n.endDate, leaveStart: n.leaveStart, leaveEnd: n.leaveEnd, budget: n.budget, results: n.results });
    };
    window.addEventListener("sa-race-saved", on);
    return () => window.removeEventListener("sa-race-saved", on);
  });

  const pages =
    (docs.includes("school") ? 1 : 0) + (docs.includes("kafile") ? 1 : 0) + (docs.includes("travel") ? 1 : 0) + (docs.includes("parent") ? chosen.length : 0) + (docs.includes("adult") ? 1 : 0) + (docs.includes("club") ? chosen.length : 0) + (docs.includes("hotel") ? 1 : 0) + (docs.includes("coach") ? groupCount : 0) + (docs.includes("entry") ? groupCount : 0);
  const ready = [
    [r.abroad ? "Yarış adı, ülke, şehir, başlangıç tarihi" : "Yarış adı, il, ilçe, başlangıç tarihi", !!(r.name.trim() && r.city.trim() && r.district.trim() && r.startDate), "edit"],
    ["Kulüp yetkilisinin adı", !!r.signer.trim(), "docs"],
    [chosen.length ? `${chosen.length} sporcu seçildi` : "Sporcu seçilmedi", chosen.length > 0, "people"],
    [incomplete.length ? `${incomplete.length} sporcunun bilgisi eksik (belgede boş kalır)` : "Sporcu bilgileri tamam", !incomplete.length, "people", true],
    ...(noPhone.length ? [[`Veli telefonu eksik: ${noPhone.map((a) => a.studentName).join(", ")} (veli izin belgesine yazılır)`, false, "phone"]] : []),
    ...(expired.length ? [[`${expired.length} sporcunun lisans, sağlık raporu ya da sigortası yarışta geçersiz`, false, "people", true]] : []),
    ...(coachLack.length ? [[`Antrenör bilgisi eksik: ${coachLack.join(", ")} (formda boş kalır)`, false, "docs", true]] : []),
  ];

  const lacks = (ready[0][1] ? 0 : 1) + (chosen.length ? 0 : 1) + (r.signer.trim() ? 0 : 1) + fixList.length + (coachLack.length ? 1 : 0);

  const make = async () => {
    const bad = ready.find(([, ok, , soft]) => !ok && !soft);
    if (bad && bad[2] === "phone") {
      setFix(noPhone[0]);
      return toast(`${noPhone[0].studentName}: veli telefonunu yaz`);
    }
    if (bad) {
      go(bad[2]);
      return toast(bad[2] === "people" ? "En az bir sporcu seç" : `Eksik: ${bad[0].toLocaleLowerCase("tr-TR")}`);
    }
    if (!docs.length) return toast("En az bir belge seç");
    setBusy(true);
    try {
      // Evrak tarihi tüm belgelerde aynı: ilk hazırlamada (docsAt yok) bugün yazılır, "Yenile"de değişmez (sonra elle değiştirilebilir).
      // Eski yarışlardaki tarih yarışın açıldığı gündü; ilk hazırlamada o da bugüne çekilir.
      const dated = r.docsAt ? { ...r, letterDate: r.letterDate || todayStr() } : { ...r, letterDate: todayStr(), docsAt: new Date().toISOString() };
      if (dated.letterDate !== r.letterDate || dated.docsAt !== r.docsAt) {
        latest.current = dated;
        first.current = true; // kaydı aşağıda yapıyoruz, tekrar kaydedilmesin
        setR(dated);
      }
      await save();
      const docR = { ...dated, endDate: dated.endDate || dated.startDate };
      const bytes = await buildRaceDocs(docR, forDocs, await loadFonts(), docs, coach);
      const name = `${r.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "yaris"}-evrak.pdf`;
      const text = [
        `${r.name.trim()} · ${rangeText(r.startDate, r.endDate || r.startDate)}${placeText(r) ? ` · ${placeText(r)}` : ""}`,
        "",
        `Belgeler: ${DOCS.filter(([k]) => docs.includes(k)).map(([, t]) => t).join(", ")}`,
        `Sporcular (${chosen.length}): ${chosen.map((a) => a.studentName).join(", ")}`,
        "",
        "Velora ile hazırlandı.",
      ].join("\n");
      // Her belge ayrıca tek başına (listede ayrı açılır, paylaşılır)
      const fonts = await loadFonts();
      const each = [];
      for (const [k, title] of DOCS.filter(([k]) => docs.includes(k))) {
        const b = await buildRaceDocs(docR, forDocs, fonts, [k], coach);
        // Veli izni ve kulüp izin yazısı sporcu başına bir sayfa: her sporcunun sayfası ayrıca paylaşılabilir
        const people = k === "parent" || k === "club" ? (await splitPages(b)).map((one, i) => ({ id: chosen[i]?.id || String(i), name: chosen[i]?.studentName || `${i + 1}. sporcu`, blob: new Blob([one], { type: "application/pdf" }) })) : [];
        each.push({ key: k, title, blob: new Blob([b], { type: "application/pdf" }), pages: k === "parent" || k === "club" ? chosen.length : k === "coach" || k === "entry" ? groupCount : 1, people });
      }
      const at = new Date().toISOString();
      setFile(new File([bytes], name, { type: "application/pdf" }));
      setStale(false);
      setMailText(text);
      setMade({ at, pages });
      setParts(each.map((x) => partFiles(name, x)));
      await queue.current.catch(() => {});
      if (id.current) saveRaceFile({ id: id.current, blob: new Blob([bytes], { type: "application/pdf" }), name, docs, pages, at, mailText: text, parts: each });
      setTab("docs");
      if (!r.checks?.docs) put("checks", { ...r.checks, docs: true });
    } catch (e) {
      toast(e?.message || "Belgeler hazırlanamadı");
    }
    setBusy(false);
  };
  // Mail: kendine ve/veya kayıtlı adreslere (Gmail betiği birkaç dakika içinde gönderir)
  const [mailing, setMailing] = useState(false);
  const [mailPick, setMailPick] = useState(false);
  const mail = async ({ self, to }) => {
    setMailPick(false);
    setMailing(true);
    try {
      const ready = await onMail({ subject: `${r.name.trim()} evrakı`, text: mailText, file, self, to });
      toast(ready ? "Mail sıraya alındı, birkaç dakika içinde gider" : "Sıraya alındı. Gitmesi için Mail ayarlarından betiği bir kez yeniden kopyala");
    } catch (e) {
      toast(e?.message || "Mail sıraya alınamadı");
    }
    setMailing(false);
  };
  const share = (f = file) => shareFile(f);
  const [signOpen, setSignOpen] = useState(false);
  const [openPart, setOpenPart] = useState(null); // sporcuları açık belge (veli izni, kulüp izni)
  // Evrak uygulama içinde açılır (üstte kapat düğmesi); yeni sekmede açılınca uygulamaya dönüş yoktu
  const [docView, setDocView] = useState(null);
  const openPdf = (f = file) => setDocView(f);
  // Elle evrak ekleme (PDF, fotoğraf…): Firebase Storage'a yüklenir, yarışta künyesi durur (her cihazdan açılır; raceStore.js)
  const pickExtra = useRef(null);
  const [upload, setUpload] = useState(null); // yükleme sürerken 0..1
  const addFiles = (metas) => setR((p) => ({ ...p, files: [...(p.files || []).filter((f) => !metas.some((m) => m.id === f.id)), ...metas] }));
  const addExtras = async (list) => {
    await queue.current.catch(() => {});
    if (!id.current) return toast("Önce yarış adını yaz");
    const ok = [...list].filter((f) => f.size <= RACE_FILE_MAX);
    if (ok.length < list.length) toast("20 MB'tan büyük dosya eklenmedi");
    if (!ok.length) return;
    const metas = [];
    setUpload(0);
    try {
      for (const [i, f] of ok.entries()) metas.push(await uploadRaceFile(orgId, f, f.name || "evrak", (p) => setUpload((i + p) / ok.length)));
    } catch (e) {
      console.warn("[race] evrak yüklenemedi", e);
      toast(metas.length ? `${metas.length} evrak eklendi, kalanı yüklenemedi` : "Evrak yüklenemedi. İnterneti kontrol et.");
    }
    setUpload(null);
    if (!metas.length) return;
    addFiles(metas);
    if (metas.length === ok.length) toast(metas.length > 1 ? `${metas.length} evrak eklendi` : "Evrak eklendi");
  };
  const removeStored = async (x) => {
    if (!confirm(`"${x.name}" silinsin mi?`)) return;
    setR((p) => ({ ...p, files: (p.files || []).filter((f) => f.id !== x.id) }));
    dropRaceStored(orgId, x);
  };
  // Kayıtlı evrakı aç/paylaş: dosya bu cihazda yoksa indirilir; indirilemezse adresi açılır
  const storedFile = async (x, then) => {
    const f = await loadRaceFile(x);
    if (f) return then(f);
    window.open(x.url, "_blank");
  };
  const removeExtra = async (x) => {
    if (!confirm(`"${x.name}" silinsin mi?`)) return;
    const next = extras.filter((e) => e.id !== x.id);
    setExtras(next);
    await saveExtras(id.current, next);
  };
  // Eski düzen: yalnız bu telefonda kalan evrakı Firebase'e gönderir
  const sendLocal = async () => {
    await queue.current.catch(() => {});
    if (!id.current) return;
    setUpload(0);
    try {
      const out = await moveLocalExtras(orgId, id.current, setUpload);
      if (out.added[id.current]) addFiles(out.added[id.current]);
      setExtras(await getExtras(id.current));
      toast(out.left ? `${out.moved} evrak gönderildi, ${out.left} gönderilemedi` : `${out.moved} evrak Firebase'e gönderildi`);
    } catch (e) {
      console.warn("[race] gönderilemedi", e);
      toast("Gönderilemedi. İnterneti kontrol et.");
    }
    setUpload(null);
  };
  // Instagram gönderisi: yarış bilgisi ve seçili sporcuların yalnız adı ve sınıfı gönderi sayfasına cihaz içinde geçer (ek okuma yok)
  const toPost = () => {
    const cls = Object.fromEntries(classes.map((c) => [c.id, c.name]));
    const list = withResults(chosen.map((a) => ({ name: a.studentName, cls: cls[a.currentClassId] || "" })), chosen.map((a) => a.id), r.results);
    try {
      sessionStorage.setItem(RACE_KEY, JSON.stringify({ id: rid, name: r.name, district: r.district, city: r.city, startDate: r.startDate, endDate: r.endDate, athleteIds: r.athleteIds, athletes: list, notice: { classes: r.notice?.classes || [], organizer: r.notice?.organizer || "" } }));
    } catch {}
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
  // Talimatın kendisi de PDF olarak saklanır (her cihazdan açılır). Yarışta talimat zaten varsa yeni okunanla
  // karşılaştırılır; fark varsa önce kullanıcıya gösterilir (ask), aynıysa yalnız dosya saklanır.
  const [ask, setAsk] = useState(null); // { n, pdf, diffs }
  const loadNotice = async (f) => {
    setReading(true);
    try {
      const text = typeof f === "string";
      const kind = text ? "text" : await kindOf(f);
      const [n, pdf] = await Promise.all([text ? readNoticeText(f) : readNotice(f), noticePdf(f, kind).catch(() => null)]);
      const had = !!latest.current.notice;
      const diffs = had ? noticeDiff(latest.current, n) : [];
      if (diffs.length) setAsk({ n, pdf, diffs });
      else await takeNotice(n, pdf, had ? "same" : "new");
    } catch (e) {
      toast(e?.message || "Talimat okunamadı");
    }
    setReading(false);
  };
  // mode: new (ilk talimat), update (farkları gördü, bilgileri güncelle), keep (yalnız dosyayı sakla), same (bilgiler aynı)
  const takeNotice = async (n, pdf, mode) => {
    if (mode === "new" || mode === "update") {
      dropFile();
      setR((p) => applyNotice(p, n, mode === "update"));
      setTab("sum");
    } else if (n.hotels?.length) setR((p) => withHotels(p, n)); // bilgiler aynı olsa da oteller (oda fiyatları) yenilenir
    const saved = pdf ? await keepNoticeFile(pdf, n.name) : false;
    const msg = {
      new: n.name || latest.current.name ? "Talimat okundu" : "Talimat okundu, yarış adını yaz",
      update: "Talimat güncellendi",
      keep: "Talimat dosyası kaydedildi, bilgiler değişmedi",
      same: "Talimat dosyası kaydedildi, bilgiler aynı",
    }[mode];
    toast(saved || !pdf ? msg : `${msg}; dosya kaydedilemedi, tekrar yükle`);
  };
  const keepNoticeFile = async (pdf, name) => {
    try {
      const old = latest.current.noticeFile;
      const meta = await saveNoticeFile(orgId, pdf, noticeName({ name: latest.current.name || name }));
      put("noticeFile", meta);
      if (old?.id) dropNoticeFile(orgId, old);
      return true;
    } catch {
      return false;
    }
  };
  // Talimat uygulama içinde açılır (PdfViewer); yeni sekme iPhone'da dosya indikten sonra engelleniyordu
  const [viewer, setViewer] = useState(false);
  const noticeOpen = () => r.noticeFile && setViewer(true);
  const noticeFileMeta = r.noticeFile;
  // Eski talimatta oda fiyatları yok: kayıtlı dosya yeniden okunur, yalnız oteller yenilenir
  const [roomsBusy, setRoomsBusy] = useState(false);
  const rereadRooms = async () => {
    setRoomsBusy(true);
    try {
      const n = await readNotice(await loadNoticeFile(orgId, noticeFileMeta));
      if (!n.hotels?.some((h) => h.rooms?.length)) toast("Talimatta oda fiyatı bulunamadı");
      else {
        setR((p) => withHotels(p, n));
        toast("Oda fiyatları eklendi");
      }
    } catch (e) {
      toast(e?.message || "Talimat okunamadı");
    }
    setRoomsBusy(false);
  };
  const loadViewer = useCallback(() => loadNoticeFile(orgId, noticeFileMeta), [orgId, noticeFileMeta]);
  // Talimat menüsü (başlığın altındaki talimat satırının ayar düğmesi): aç, yenisini yükle, kaldır
  const [noticeMenu, setNoticeMenu] = useState(false);
  const dropNotice = () => {
    if (!confirm("Yarış talimatı kaldırılsın mı? Talimattan gelen işler ve bilgiler silinir; yarışın adı, tarihi, yeri kalır.")) return;
    const old = latest.current.noticeFile;
    setR((p) => ({ ...p, notice: null, noticeFile: null }));
    if (old?.id) dropNoticeFile(orgId, old);
    setNoticeMenu(false);
    toast("Talimat kaldırıldı");
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
    dropRaceFile(id.current);
    dropExtras(id.current);
    for (const f of latest.current.files || []) dropRaceStored(orgId, f);
    dropNoticeFile(orgId, latest.current.noticeFile);
    for (const m of latest.current.results?.files || []) dropNoticeFile(orgId, m);
    await onDelete(id.current);
  };

  // Veli bilgi notu: seçili her sporcuya tek sayfa (yolculuk, program, konaklama, sporcu payı)
  const [sheetIds, setSheetIds] = useState(null); // null: hepsi
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // kapatılan bölümler false; seçim bu cihazda saklanır (yarış sayfası veriler gelince çizildiği için ilk çizimde okunabilir)
  const [sheetShow, setSheetShow] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sa-sheet-show") || "{}") || {};
    } catch {
      return {};
    }
  });
  const toggleShow = (k) => {
    const next = { ...sheetShow, [k]: sheetShow[k] === false };
    setSheetShow(next);
    try {
      localStorage.setItem("sa-sheet-show", JSON.stringify(next));
    } catch {}
  };
  const sheetList = sheetIds ? chosen.filter((a) => sheetIds.includes(a.id)) : chosen;
  const makeSheet = async (list = sheetList) => {
    if (!list.length) return toast("En az bir sporcu seç");
    setSheetBusy(true);
    try {
      const bytes = await buildAthleteSheet(latest.current, list, await loadFonts(), chosen.length, sheetShow);
      const base = `${(latest.current.name || "yaris").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "yaris"}`;
      const who = list.length === 1 ? `-${list[0].studentName.replace(/[^\p{L}\p{N}]+/gu, "-")}` : "";
      setDocView(new File([bytes], `${base}${who}-bilgi-notu.pdf`, { type: "application/pdf" }));
    } catch (e) {
      toast(e?.message || "Bilgi notu hazırlanamadı");
    }
    setSheetBusy(false);
  };
  // Asistan: "Ali'nin bilgi notunu hazırla" → sekme açılır, sporcular seçilir, PDF hazırlanır
  const sheetAsk = useRef(null);
  useEffect(() => {
    const on = (e) => {
      const d = e.detail || {};
      if (d.id && d.id !== id.current) return;
      setTab("docs");
      setSheetOpen(true);
      setSheetIds(d.ids?.length ? d.ids : null);
      sheetAsk.current = d.ids?.length ? d.ids : "all";
    };
    window.addEventListener("sa-race-sheet", on);
    return () => window.removeEventListener("sa-race-sheet", on);
  }, []);
  useEffect(() => {
    if (!sheetAsk.current || !chosen.length) return;
    const ids = sheetAsk.current;
    sheetAsk.current = null;
    makeSheet(ids === "all" ? chosen : chosen.filter((a) => ids.includes(a.id)));
  });
  const parts4 = sheetParts(r, chosen.length);

  const steps = stepsOf(r);
  const doneList = doneSteps(r);
  // Özet'teki durum satırları: [sekme, simge, ad, kısa durum, uyarı mı]
  const trip = tripRows(r);
  const money = totals(r.budget, chosen.length, chosen.map((a) => a.id));
  const hotelCount = raceHotels(r).length;
  const stat = [
    ["people", "users", "Sporcu", !chosen.length ? "Sporcu seçilmedi" : incomplete.length ? `${chosen.length} sporcu · ${incomplete.length} bilgi eksik` : `${chosen.length} sporcu · bilgiler tamam`, chosen.length > 0 && !incomplete.length, chosen.length ? "Sporcu bilgilerini tamamla" : "Sporcuları ekle"],
    ["docs", "receipt", "Evrak", file ? `Hazır · ${made?.pages || pages} sayfa` : stale ? "Eski, yenilenmeli" : !checked && r.docsAt ? "Hazır" : r.docsAt ? "Bu cihazda yok" : "Hazırlanmadı", !!file || (!checked && !!r.docsAt && !stale), stale ? "Evrakı yenile" : "Evrakı hazırla"],
    ["trip", "nav", "Yolculuk", trip.length ? [trip[0][1], hotelCount && `${hotelCount} otel`].filter(Boolean).join(" · ") : "Çıkış girilmedi", trip.length > 0, "Yolculuğu yaz"],
    ["budget", "wallet", "Bütçe", money.lines.length ? (chosen.length ? `${money.varies ? "Ortak pay" : "Sporcu başı"} ${tl(money.perAthlete)}` : `Toplam ${tl(money.total)}`) : "Kalem yok", money.lines.length > 0, "Bütçeyi çıkar"],
  ];
  const hidden = hiddenCount(r);
  // Yarış bitti mi: Özet'te hazırlık yerine yarışın özeti (süre, katılanlar, sonuçlar, bütçe) görünür
  const over = !!(r.endDate || r.startDate) && (r.endDate || r.startDate) < todayStr();
  // Yurt içi ↔ yurt dışı: yurt dışında il yerine ülke, ilçe yerine şehir yazılır
  const setAbroad = (on) =>
    setR((p) => (!!p.abroad === on ? p : { ...p, abroad: on, city: on && !p.district.trim() ? "" : !on && !p.city.trim() ? "İzmir" : p.city }));
  // Tek liste, işaretleme yok: yapılan ya da gerekmeyen iş × ile çıkarılır (elle eklenen silinir), geri alınabilir
  const dropStep = ({ key, group }) => {
    const back = { todos: latest.current.todos, skips: latest.current.skips, checks: latest.current.checks };
    setR((p) => {
      const checks = { ...p.checks };
      delete checks[key];
      return group === "own" ? { ...p, todos: (p.todos || []).filter((t) => todoKey(t.title) !== key), checks } : { ...p, skips: cleanSkips([...(p.skips || []), key]), checks };
    });
    toast("Listeden çıkarıldı", { action: { label: "Geri al", onClick: () => setR((p) => ({ ...p, ...back })) } });
  };
  // Yapıldı / geri al: iş listede kalır, soluk ve ✓ (bilgi notunda da "Yapıldı" yazar)
  const markStep = ({ key }, on) => setR((p) => ({ ...p, done: on ? cleanDone([...(p.done || []), key]) : cleanDone(p.done).filter((k) => k !== key) }));
  // Çıkarılanları geri getir (eski işaretlemeler de; "Evrakları hazırla" belgeler hazırsa çıkmış kalır)
  const restoreSteps = () => setR((p) => ({ ...p, skips: [], checks: p.checks?.docs && file ? { docs: true } : {} }));
  // Elle iş ekleme (her yarışa ayrı)
  const [todo, setTodo] = useState("");
  const [todoDate, setTodoDate] = useState("");
  const addTodo = () => {
    const title = todo.trim();
    if (!title) return;
    if (steps.some((x) => x.label.toLocaleLowerCase("tr-TR") === title.toLocaleLowerCase("tr-TR"))) return toast("Bu iş listede var");
    put("todos", cleanTodos([...(r.todos || []), { title, date: todoDate }]));
    setTodo("");
    setTodoDate("");
  };
  const dueOpen = (r.notice?.deadlines || []).filter((d) => d.date && daysTo(d.date) >= 0).length;
  // Yarış kartı: plan, son tarihler, gönderi (Seyhun 2026-10-20: "gönderisi hazırlandıysa o gönderiyi gösterelim"; "plandaysa planda gösterelim")
  const links = racePlansOf(r, plans);
  const inPlan = links.main || (r.planAdded && !plans.length ? {} : null);
  // Gönderiler yarış açılınca bir kez okunur (yalnız kayıtlı yarışta; okunamazsa "Gönderi hazırla" görünür)
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    if (!rid) return;
    let live = true;
    loadPosts(orgId).then(
      (list) => live && setPosts(list),
      () => live && setPosts([]),
    );
    return () => {
      live = false;
    };
  }, [orgId, rid]);
  const post = posts && racePostOf({ ...r, id: rid }, posts);
  // Hazırlık: Sporcu, Evrak, Yolculuk, Bütçe (dokununca o sekme); Yapılacaklar: talimattan gelen ve elle eklenen işler tek listede
  const stepSrc = { notice: "talimattan", own: "Diğer iş", abroad: "Yurt dışı", docs: "Evrak" };
  const order = ["notice", "docs", "abroad", "own"];
  const todoList = steps.filter((x) => x.key !== "docs").sort((x, y) => order.indexOf(x.group) - order.indexOf(y.group));
  const doneTasks = doneList.filter((x) => x.key !== "docs");
  const [showDone, setShowDone] = useState(false);
  const [prepOpen, setPrepOpen] = useState(false); // yarış günü: kalan işler kısa notun altında açılır
  // Yarış kartının satırı: sol ad, sağda durum (ya da mor işlem), altında kısa bilgi
  // Tek satır (Seyhun 2026-10-26: "çok yer kaplıyor, liste gibi"): solda başlık, ortada değer, sağda kısa ek bilgi
  const linkRow = ({ k, title, main, sub, act, onClick, href, right }) => {
    const body = (
      <>
        <span className="w-[5.5rem] shrink-0 truncate text-[0.875rem] text-mut">{title}</span>
        <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${act ? "font-semibold text-acc" : "font-medium"}`}>{main}</span>
        {(right || sub) && <span className="max-w-[45%] shrink-0 truncate text-[0.8125rem] text-mut">{right || sub}</span>}
        {!act && <Icon name="chev" className="size-4 shrink-0 text-mut/60" />}
      </>
    );
    const cls = "flex min-h-[2.875rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-bg";
    return (
      <li key={k}>
        {href ? (
          <Link href={href} onClick={onClick} className={cls}>
            {body}
          </Link>
        ) : (
          <button type="button" onClick={onClick} className={cls}>
            {body}
          </button>
        )}
      </li>
    );
  };
  // "25–28 Eki · çıkış 07:00" (ay farklıysa "30 Eki–2 Kas")
  const span = (a, b) => (!b || b === a ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${shortDay(b)}` : `${shortDay(a)}–${shortDay(b)}`);
  const planSub = (p) => [p.date && span(p.date, p.endDate), p.time && `çıkış ${p.time}`].filter(Boolean).join(" · ");
  const raceRows = [
    inPlan
      ? { k: "plan", title: "Plan", main: "Planda", sub: links.main ? planSub(links.main) : "", onClick: () => (links.main ? onOpenPlan?.(links.main.id) : toast("Yarış planlarda")) }
      : { k: "plan", title: "Plan", main: "Plana ekle", act: true, onClick: toPlan },
    dueOpen > 0 &&
      (r.notice?.planned || links.deadlines.length
        ? { k: "due", title: "Son tarihler", main: "Planda", sub: `${links.deadlines.length || dueOpen} son tarih`, href: "/plans" }
        : { k: "due", title: "Son tarihler", main: "Plana ekle", act: true, right: `${dueOpen} tarih`, onClick: noticePlan }),
    rid &&
      (post
        ? { k: "post", title: "Instagram", main: post.headline || post.race?.name || "Gönderi", sub: ["Hazırlandı", post.at && shortDay(new Date(post.at).toLocaleDateString("sv-SE"))].filter(Boolean).join(" · "), thumb: post.thumb || "", href: `/posts/${post.id}` }
        : { k: "post", title: "Instagram", main: "Gönderi hazırla", act: true, href: "/posts/new", onClick: toPost }),
    // Talimat tek satır (2026-10-28): aç, bilgiler, değiştir, sil aynı pencerede; yoksa "Talimat yükle"
    r.notice
      ? { k: "notice", title: "Talimat", main: r.noticeFile ? "PDF · program, ücret" : "Program, ücret, iletişim", onClick: () => setNoticeInfo(true) }
      : { k: "notice", title: "Talimat", main: "Talimat yükle", act: true, onClick: () => setNoticeMenu(true) },
  ].filter(Boolean);
  const taskRow = (s) => {
    const left = s.date ? daysTo(s.date) : null;
    return (
      <li key={s.key} className="flex items-center gap-1 pl-1">
        <button type="button" onClick={() => markStep(s, true)} aria-label={`${s.label}: yapıldı`} data-press className="btn btn-icon shrink-0">
          <span className="size-[1.375rem] rounded-full border-2 border-line" />
        </button>
        <span className="min-w-0 flex-1 truncate py-2.5 text-[0.9375rem] font-medium">{s.label}</span>
        {left !== null && left <= 14 ? (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[0.6875rem] font-semibold tabular-nums ${left < 0 ? "bg-bg text-mut" : left <= 7 ? "bg-rec/10 text-rec" : "bg-amber-500/15 text-amber-700"}`}>
            {left < 0 ? "Geçti" : left === 0 ? "Bugün" : `${left} gün`}
          </span>
        ) : (
          <span className="max-w-[35%] shrink-0 truncate text-[0.8125rem] text-mut">{s.date ? shortDay(s.date) : s.detail || stepSrc[s.group]}</span>
        )}
        <button type="button" onClick={() => dropStep(s)} aria-label={`${s.label}: listeden çıkar`} data-press className="btn btn-icon btn-sm shrink-0 text-mut/60">
          <Icon name="x" className="size-3.5" />
        </button>
      </li>
    );
  };
  const doneRow = (s) => (
    <li key={s.key} className="flex items-center gap-1 pl-1 pr-4">
      <button type="button" onClick={() => markStep(s, false)} aria-label={`${s.label}: yapılmadı`} data-press className="btn btn-icon shrink-0">
        <span className="grid size-[1.375rem] place-items-center rounded-full bg-ok text-white">
          <Icon name="check" className="size-3.5" />
        </span>
      </button>
      <span className="min-w-0 flex-1 py-3 text-[0.9375rem] leading-snug text-mut line-through decoration-mut/40">{s.label}</span>
    </li>
  );
  const addRow = (
    <li key="add" className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2">
      <Icon name="plus" className="size-5 shrink-0 text-acc" />
      <input
        value={todo}
        onChange={(e) => setTodo(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addTodo()}
        placeholder="İş ekle"
        className="h-9 min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60"
      />
      {todo.trim() && (
        <span className="flex w-full items-center gap-2 pb-1 pl-7">
          <span className="text-[0.8125rem] text-mut">Son tarih</span>
          <input type="date" value={todoDate} onChange={(e) => setTodoDate(e.target.value)} aria-label="Son tarih (isteğe bağlı)" className="h-9 min-w-0 flex-1 rounded-lg bg-bg px-2 text-[0.8125rem]" />
          <button type="button" onClick={addTodo} data-press className="btn btn-primary btn-sm shrink-0">
            Ekle
          </button>
        </span>
      )}
    </li>
  );
  // Lacivert üst (yeni tasarım 2026-10-21; Seyhun: "sekme butonları önemli, ön planda olsun"): kalan gün ve hazırlık çubuğu,
  // Multimedya · Talimat, altında büyük sekme düğmeleri (her birinde kısa durum; eksikse sarı). Özet'teki eski Hazırlık listesi bu düğmelere geçti.
  const left = r.startDate ? daysTo(r.startDate) : null;
  const doneN = stat.filter((x) => x[4]).length;
  // Seyhun 2026-10-26: "Hazırlık tamam 3/4, niye?" Sayılan dört bölüm (Sporcu, Evrak, Yolculuk, Bütçe); Plan, Not ve çıkarılan işler sayılmaz.
  // Eksik bölüm adıyla yazılır, "tamam" yalnız işler bitip dört bölüm de tamamsa.
  const lacking = stat.filter((x) => !x[4]);
  const missText = lacking.length > 2 ? `${lacking.length} bölüm eksik` : lacking.length ? `Eksik: ${lacking.map((x) => x[2]).join(", ")}` : "";
  // Yarış günü (Seyhun 2026-10-26: "önemli olan hava durumu ve multimedya, o ikisini ön planda tutmalıyız"): başlangıçtan bitişe
  // üstte büyük Multimedya ve günün rüzgârı; Özet yerine "Bugün" (kalan iş kısa notta, dokununca açılır)
  const today = todayStr();
  const raceDay = !over && !!r.startDate && today >= r.startDate;
  const dayNo = raceDay ? Math.round((new Date(`${today}T12:00:00`) - new Date(`${r.startDate}T12:00:00`)) / 864e5) + 1 : 0;
  const dayAll = raceDay ? Math.round((new Date(`${r.endDate || r.startDate}T12:00:00`) - new Date(`${r.startDate}T12:00:00`)) / 864e5) + 1 : 0;
  // Yarış günü üstü günün evresine göre (RaceDayTop: A rüzgâr · B sonuçlar · C gün bitti + yarın)
  const { phase, races: dayRaces } = useRacePhase(r, orgId, rid, raceDay);
  const tabs = [
    // Yarış günü (Seyhun 2026-10-29): hazırlık, plan ve not altta görünmez; "Hazırlık" sekmesine dokununca açılır, yeniden dokununca kapanır.
    // Yarıştan önce eskisi gibi Özet.
    raceDay ? ["prep", "Hazırlık", todoList.length ? `${todoList.length} iş` : "Tamam", false] : ["sum", "Özet", over ? "Bitti" : todoList.length ? `${todoList.length} iş` : "Tamam", false],
    ["people", "Sporcu", !chosen.length ? "Seçilmedi" : incomplete.length ? `${incomplete.length} eksik` : `${chosen.length} kişi`, !stat[0][4]],
    ["docs", "Evrak", file || (!checked && r.docsAt && !stale) ? "Hazır" : stale ? "Yenile" : r.docsAt ? "Bu cihazda yok" : "Hazır değil", !stat[1][4]],
    ["trip", "Yolculuk", trip.length ? "Yazıldı" : "Yok", !stat[2][4]],
    ["budget", "Bütçe", money.lines.length ? tl(chosen.length ? money.perAthlete : money.total) : "Yok", !stat[3][4]],
  ];
  // Seyhun 2026-10-26 (örnek A, yaris-tasarim/ozet-liste): üstte kalan gün + yanında Multimedya (ayrı, açık renk), altında tek satır
  // kaydırılabilir sekmeler (eksikse sarı nokta). Talimat yüklüyse düğme yok, ⋯ içinde "Talimatı gör".
  const mediaBtn = rid && (
    <Link href={`/athletes/races/${rid}/media`} data-press className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#67e8f9] px-4 text-[0.9375rem] font-bold text-[#06283a] shadow-[0_3px_0_#2aa9bd] active:translate-y-px active:shadow-none">
      <Icon name="video" className="size-[1.125rem]" />
      Multimedya
    </Link>
  );
  const top = (
    <>
      {raceDay && rid ? (
        <RaceDayTop r={r} rid={rid} chosen={chosen} phase={phase} races={dayRaces} dayNo={dayNo} dayAll={dayAll} />
      ) : !over && left != null ? (
        <div className="mt-4">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              {left > 1 ? (
                <>
                  <b className="text-[2.375rem] font-bold leading-none tracking-[-.04em] tabular-nums">{left}</b>
                  <span className="text-[0.9375rem] font-semibold text-white/75">gün kaldı</span>
                </>
              ) : (
                <b className="truncate text-[1.75rem] font-bold leading-none tracking-tight">{leftText(r)}</b>
              )}
            </span>
            {mediaBtn}
          </span>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
            <span className="block h-full rounded-full bg-[#67e8f9]" style={{ width: `${Math.round((doneN / stat.length) * 100)}%` }} />
          </span>
          <span className="mt-1.5 flex justify-between text-[0.78rem] text-white/70">
            <span>Hazırlık</span>
            <span className="tabular-nums">
              {[missText || "Hepsi tamam", todoList.length && `${todoList.length} iş`].filter(Boolean).join(" · ")}
            </span>
          </span>
          {rid && <RaceWx r={{ ...r, id: rid }} />}
        </div>
      ) : (
        mediaBtn && <div className="mt-4 flex justify-end">{mediaBtn}</div>
      )}
      <nav aria-label="Bölümler" className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(([k, name, , warn]) => {
          const on = tab === k;
          return (
            <button key={k} type="button" aria-pressed={on} onClick={() => setTab(k === "prep" && on ? "sum" : k)} data-press className={`raised flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-semibold ${on ? "ck-sel" : ""}`}>
              {warn && !over && <span className="size-1.5 rounded-full bg-[#ffd59a]" aria-label="eksik" />}
              {name}
            </button>
          );
        })}
      </nav>
    </>
  );
  const navy = (body) => (
    <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={r.name || "Yarış"}>
      {head}
      {body}
    </section>
  );
  const light = "relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pb-1 pt-0.5";

  if (!begun) {
    const form = r.notice || manual;
    return (
      <>
        {navy(null)}
        <div className={light}>
        {!form ? (
          <>
            {sharedList.length > 0 && !reading && <SharedPick list={sharedList} onPick={(s) => (setR((p) => ({ ...p, ...fromShared(s) })), setBegun(true), setTab("sum"))} />}
            <h2 className="mt-6 px-1 text-[1.375rem] font-semibold leading-tight">Yarış talimatın var mı?</h2>
            <p className="mt-1.5 px-1 text-[0.9375rem] text-mut">Varsa yükle, bilgileri ben doldurayım.</p>
            <div className="mt-4">
              <NoticeUpload busy={reading} onFile={loadNotice} onText={loadNotice} title="Talimatı yükle" sub="PDF, fotoğraf ya da metin. Ad, tarih, yer, program, son tarihler, ücret ve oteller dolar." />
            </div>
            {!reading && (
              <button type="button" onClick={() => setManual(true)} className={`${card} mt-3 flex w-full items-center gap-3 px-4 py-3.5 text-left`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg text-mut">
                  <Icon name="edit" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">Talimat yok, elle başla</b>
                  <span className="block text-[0.8125rem] text-mut">Adı, tarihi ve yeri yaz; talimatı sonra da ekleyebilirsin.</span>
                </span>
                <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
              </button>
            )}
          </>
        ) : (
          <>
            <h2 className="mt-6 px-1 text-[1.375rem] font-semibold leading-tight">{r.notice ? "Talimattan okundu" : "Yarışın bilgileri"}</h2>
            <p className="mt-1.5 px-1 text-[0.9375rem] text-mut">{r.notice ? "Kontrol et, yanlış varsa düzelt." : "Gerisini sonra eklersin."}</p>
            <Seg value={r.abroad ? "out" : "in"} onChange={(v) => setAbroad(v === "out")} options={[["in", "Yurt içi"], ["out", "Yurt dışı"]]} className="mt-4" />
            <Group className="mt-3">
              <Row label="Yarış adı">
                <input value={r.name} onChange={(e) => set("name")(e.target.value)} placeholder="D’Azur Optimist Regatta" list="race-names" autoComplete="off" className={input} />
                <datalist id="race-names">
                  {known.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </Row>
              <Pair>
                <Row label="Başlangıç">{field("startDate", "", "date")}</Row>
                <Row label="Bitiş">{field("endDate", "", "date")}</Row>
              </Pair>
              <Pair>
                <Row label={r.abroad ? "Ülke" : "İl"}>{field("city", r.abroad ? "Fransa" : "İzmir")}</Row>
                <Row label={r.abroad ? "Şehir" : "İlçe"}>{field("district", r.abroad ? "Cannes" : "Çeşme")}</Row>
              </Pair>
            </Group>
            <button
              type="button"
              disabled={!r.name.trim()}
              onClick={() => (setBegun(true), setTab("sum"))}
              data-press className="btn btn-primary mt-5 w-full"
            >
              Devam
              <Icon name="chev" className="size-4" />
            </button>
            {!r.notice && (
              <button type="button" onClick={() => setManual(false)} data-press className="btn btn-text btn-sm mt-2 w-full text-acc">
                Talimatla başla
              </button>
            )}
          </>
        )}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Sağ üstteki ⋯ (Seyhun 2026-10-20: "editleme, silme… bir ayarlar butonuyla ulaşabildiğimiz şeyler olmalı") */}
      <Sheet open={menu} onClose={() => onMenu?.(false)} title="Yarış">
        <ul className={`${card} divide-y divide-line overflow-hidden`}>
          {[
            ["Bilgileri düzenle", () => setEdit(true)],
          ]
            .filter(Boolean)
            .map(([l, fn, red]) => (
              <li key={l}>
                <button type="button" data-press="row" onClick={() => (onMenu?.(false), fn())} className={`block w-full px-4 py-3.5 text-left text-[1rem] font-medium ${red ? "text-rec" : ""}`}>
                  {l}
                </button>
              </li>
            ))}
        </ul>
        {start.id && (
          <div className={`${card} mt-3 overflow-hidden`}>
            <button type="button" data-press="row" onClick={() => (onMenu?.(false), remove())} className="block w-full px-4 py-3.5 text-left text-[1rem] font-medium text-rec">
              Yarışı sil
            </button>
          </div>
        )}
      </Sheet>

      {/* Veli bilgi notu (2026-10-28: ayrı Veli sekmesi kalktı, Evrak'ta bir satır; içi bu pencerede) */}
      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Veli bilgi notu">
          <Label right={chosen.length ? `${sheetList.length}/${chosen.length}` : ""}>SPORCULAR</Label>
          {!chosen.length ? (
            <button type="button" onClick={() => (setSheetOpen(false), setTab("people"))} className={`${card} flex w-full items-center gap-3 px-4 py-3.5 text-left`}>
              <Icon name="users" className="size-5 shrink-0 text-acc" />
              <span className="flex-1 text-[0.9375rem] font-semibold">Önce sporcuları ekle</span>
              <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
            </button>
          ) : (
            <ul className={`${card} divide-y divide-line overflow-hidden`}>
              <li>
                <button type="button" onClick={() => setSheetIds(sheetIds ? null : [])} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <Check on={!sheetIds} tone="acc" />
                  <b className="flex-1 text-[0.9375rem] font-semibold">Hepsi</b>
                </button>
              </li>
              {chosen.map((a) => {
                const on = !sheetIds || sheetIds.includes(a.id);
                const toggle = () => {
                  const cur = sheetIds || chosen.map((x) => x.id);
                  const next = on ? cur.filter((x) => x !== a.id) : [...cur, a.id];
                  setSheetIds(next.length === chosen.length ? null : next);
                };
                return (
                  <li key={a.id}>
                    <button type="button" onClick={toggle} data-press="row" className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                      <Check on={on} tone="acc" />
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.6875rem] font-semibold text-acc">{initials(a.studentName)}</span>
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.studentName}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <Label>NOTTA NELER OLSUN</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {parts4.map(([title, sub, ok, to, key]) => {
              const on = ok && sheetShow[key] !== false;
              return (
                <li key={key} className="flex items-center">
                  <button type="button" onClick={() => ok && toggleShow(key)} disabled={!ok} data-press="row" className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
                    <Check on={on} tone="acc" />
                    <span className="min-w-0 flex-1">
                      <b className={`block text-[0.9375rem] font-semibold ${on ? "" : "text-mut"}`}>{title}</b>
                      <span className="block truncate text-[0.8125rem] text-mut">{sub}</span>
                    </span>
                  </button>
                  {!ok && to !== "sum" && (
                    <button type="button" onClick={() => (setSheetOpen(false), to === "notice" ? setNoticeMenu(true) : setTab(to))} data-press className="btn btn-text btn-sm shrink-0 text-acc">
                      {to === "notice" ? "Talimat" : "Ekle"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-1 text-[0.75rem] text-mut">İşaretli bölümler notta görünür. Son tarihler bilgi içindir, 7 gün ve daha az kalanlar vurgulanır.</p>

          <button type="button" onClick={() => (setSheetOpen(false), makeSheet())} disabled={sheetBusy || !sheetList.length} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-40">
            <Icon name="print" className="size-5" />
            {sheetBusy ? "Hazırlanıyor…" : `Bilgi notunu hazırla · ${sheetList.length} sayfa`}
          </button>
      </Sheet>

      <Sheet open={noticeInfo && !!r.notice} onClose={() => setNoticeInfo(false)} title="Yarış talimatı">
        <ul className={`${card} divide-y divide-line overflow-hidden`}>
          {[
            r.noticeFile && ["Talimatı aç", noticeOpen],
            ["Değiştir", () => setNoticeMenu(true)],
            ["Sil", dropNotice, true],
          ]
            .filter(Boolean)
            .map(([l, fn, red]) => (
              <li key={l}>
                <button type="button" data-press="row" onClick={() => (setNoticeInfo(false), fn())} className={`block w-full px-4 py-3.5 text-left text-[1rem] font-medium ${red ? "text-rec" : ""}`}>
                  {l}
                </button>
              </li>
            ))}
        </ul>
        {r.notice && <NoticeDetails n={r.notice} />}
      </Sheet>

      <Sheet open={noticeMenu} onClose={() => setNoticeMenu(false)} title="Yarış talimatı">
        <NoticeUpload
          busy={reading}
          onFile={(f) => (setNoticeMenu(false), loadNotice(f))}
          onText={(t) => (setNoticeMenu(false), loadNotice(t))}
          title={!r.notice ? "Talimat yükle" : r.noticeFile ? "Değiştir" : "Talimat dosyasını yükle"}
          sub={!r.notice ? "Ad, tarih, program, son tarihler, ücret ve oteller kendiliğinden dolar." : r.noticeFile ? "Yeni talimatı yükle; fark varsa gösteririm." : "Bilgiler okundu ama dosya saklanmamış. Aynı talimatı yükle, saklayayım."}
        />
      </Sheet>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Yarış bilgisi">
        <Seg value={r.abroad ? "out" : "in"} onChange={(v) => setAbroad(v === "out")} options={[["in", "Yurt içi"], ["out", "Yurt dışı"]]} />
        <Group className="mt-3">
          <Row label="Yarış adı">
            <input value={r.name} onChange={(e) => set("name")(e.target.value)} placeholder="D’Azur Optimist Regatta" list="race-names" autoComplete="off" className={input} />
            <datalist id="race-names">
              {known.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Row>
          <Pair>
            <Row label="Başlangıç">{field("startDate", "", "date")}</Row>
            <Row label="Bitiş">{field("endDate", "", "date")}</Row>
          </Pair>
          <Pair>
            <Row label={r.abroad ? "Ülke" : "İl"}>{field("city", r.abroad ? "Fransa" : "İzmir")}</Row>
            <Row label={r.abroad ? "Şehir" : "İlçe"}>{field("district", r.abroad ? "Cannes" : "Çeşme")}</Row>
          </Pair>
          <Row label="Federasyon">{field("federation", "Yelken")}</Row>
        </Group>
        {r.abroad && <p className="mt-2 px-1 text-[0.75rem] text-mut">Yapılacaklara Türkiye’de yapılacaklar eklenir (pasaport, vize, izinler, sigorta, nakliye…).</p>}
        <button type="button" onClick={() => setEdit(false)} data-press className="btn btn-primary mt-4 w-full">
          Tamam
        </button>
      </Sheet>

      {navy(top)}
      <div className={light}>
        {alert}
      {(raceDay ? tab === "prep" : tab === "sum") && (
        <>
          {over && <RaceDone r={r} chosen={chosen} money={money} steps={steps} doneCount={doneList.length} onTab={setTab} onMark={(st) => markStep(st, true)} resHref={rid ? `/athletes/races/${rid}/media?tab=res` : ""} />}
          {raceDay && (
            <button type="button" onClick={() => (!todoList.length && lacking.length ? setTab(lacking[0][0]) : setPrepOpen((v) => !v))} aria-expanded={todoList.length || !lacking.length ? prepOpen : undefined} data-press="row" className={`${card} mt-4 flex min-h-[2.875rem] w-full items-center gap-2.5 px-4 py-2 text-left`}>
              {todoList.length || lacking.length ? (
                <span className="size-2 shrink-0 rounded-full bg-amber-500" />
              ) : (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-white">
                  <Icon name="check" className="size-3" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{todoList.length ? [`${todoList.length} iş kaldı`, missText].filter(Boolean).join(" · ") : missText || "Hazırlık tamam"}</span>
              <Icon name="chev" className={`size-4 shrink-0 text-mut/60 transition ${prepOpen && (todoList.length || !lacking.length) ? "rotate-90" : ""}`} />
            </button>
          )}
          {!over && (!raceDay || prepOpen) && (
            <>
              <Label right={todoList.length ? `${todoList.length} iş` : ""}>Yapılacaklar</Label>
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                {todoList.map(taskRow)}
                {addRow}
                {doneTasks.length > 0 && (
                  <li>
                    <button type="button" onClick={() => setShowDone((v) => !v)} data-press="row" className="flex w-full items-center justify-between px-4 py-3 text-left text-[0.8125rem] text-mut">
                      Yapılanlar ({doneTasks.length})
                      <Icon name="chev" className={`size-4 shrink-0 text-mut/60 transition ${showDone ? "rotate-90" : ""}`} />
                    </button>
                  </li>
                )}
                {showDone && doneTasks.map(doneRow)}
              </ul>
              {hidden > 0 && (
                <button type="button" onClick={restoreSteps} data-press className="btn btn-text btn-sm mt-2 text-acc">
                  Çıkarılanları geri getir ({hidden})
                </button>
              )}
            </>
          )}

          <Label>Yarış</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {raceRows.map(linkRow)}
            <li className="flex items-start gap-3 px-4 py-2">
              <span className="w-[5.5rem] shrink-0 pt-[0.4375rem] text-[0.875rem] text-mut">Not</span>
              <textarea
                value={r.note}
                onChange={(e) => put("note", e.target.value)}
                aria-label="Not"
                placeholder="Not ekle"
                rows={Math.max(1, Math.min(8, (r.note || "").split("\n").length + (r.note ? 1 : 0)))}
                className="block min-h-[1.875rem] min-w-0 flex-1 resize-none bg-transparent py-1 text-[0.9375rem] leading-relaxed outline-none placeholder:text-mut/60"
              />
            </li>
          </ul>

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
          ) : !chosen.length ? (
            <div className={`${card} flex flex-col items-center px-6 py-8 text-center`}>
              <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name="users" className="size-7" />
              </span>
              <b className="mt-3 text-[1.0625rem] font-semibold">Katılacak sporcuları ekle</b>
              <span className="mt-1 text-[0.8125rem] text-mut">Evrak için önce sporcuları seç</span>
              <button type="button" onClick={() => setPick(true)} data-press className="btn btn-primary mt-5 w-full">
                <Icon name="plus" className="size-5" />
                Sporcu ekle
              </button>
            </div>
          ) : (
            <div className={`${card} divide-y divide-line overflow-hidden`}>
              <button type="button" onClick={() => setPick(true)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left text-acc">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10">
                  <Icon name="plus" className="size-5" />
                </span>
                <b className="text-[0.9375rem] font-semibold">Sporcu ekle ya da çıkar</b>
              </button>
              {chosen.map((a) => {
                const miss = missing(a, docs);
                const gone = raceExpired(a, r);
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/athletes/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-60">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.8125rem] font-semibold text-acc">{initials(a.studentName)}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</b>
                        <span className={`block truncate text-[0.8125rem] ${miss.length ? "text-amber-700" : "text-mut"}`}>
                          {miss.length ? `${miss.length} bilgi eksik: ${miss.join(", ")}` : [a.licenseNo && `Lisans ${a.licenseNo}`, a.studentSchool || a.studentSchoolAndClass].filter(Boolean).join(" · ")}
                        </span>
                        {gone.length > 0 && <span className="block truncate text-[0.75rem] font-medium text-rec">{gone.map((x) => `${x.label} bitişi ${x.date.slice(8, 10)}.${x.date.slice(5, 7)}, yarışta geçersiz`).join(" · ")}</span>}
                      </span>
                    </Link>
                    <button type="button" onClick={() => setFix(a)} className={`h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold ring-1 ${miss.length || gone.length ? "bg-amber-500/10 text-amber-700 ring-amber-500/30" : "text-acc ring-line"}`}>
                      {miss.length || gone.length ? "Tamamla" : "Bilgi"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {lost > 0 && <p className="mt-2 px-1 text-[0.75rem] text-mut">{lost} sporcu artık listede yok, belgeye girmez.</p>}
          {chosen.length > 0 && (
            <button type="button" onClick={() => setTab("docs")} data-press className="btn btn-primary mt-3 w-full">
              {file ? "Evraka git" : "Evrakı hazırla"}
              <Icon name="chev" className="size-4" />
            </button>
          )}
        </>
      )}

      {tab === "budget" && <BudgetView r={r} athletes={chosen} onChange={(b) => put("budget", b)} />}

      {tab === "trip" && (
        <>
          <Label>YOLCULUK</Label>
          <Group>
            <Pair>
              <Row label="Çıkış günü">{tripField("departDate", "", "date")}</Row>
              <Row label="Çıkış saati">{tripField("departTime", "", "time")}</Row>
            </Pair>
            <Row label="Çıkış yeri">{tripField("departFrom", "Dikili, kulüp önü")}</Row>
            <Row label="Buluşma noktası">{tripField("meetPoint", "Çıkış yeriyle aynıysa boş bırak")}</Row>
            <Pair>
              <Row label="Dönüş günü">{tripField("returnDate", "", "date")}</Row>
              <Row label="Dönüş saati">{tripField("returnTime", "", "time")}</Row>
            </Pair>
          </Group>

          <RaceHotels hotels={raceHotels(r)} onChange={(list) => put("hotels", list)} onRooms={r.noticeFile ? rereadRooms : null} roomsBusy={roomsBusy} />

          <AroundView r={r} onChange={(a) => put("around", a)} />
        </>
      )}

      {tab === "docs" && (
        <>
          {/* Hazır evrak bir bilgi değişince (stale) ya da bu telefonda yoksa (başka cihazda hazırlandı / telefon sildi): uyarı */}
          {!file && (stale || (checked && r.docsAt)) && chosen.length > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/30">
              <Icon name="alert" className="size-5 shrink-0 text-amber-600" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">{stale ? "Evrak eski, yenile" : "Evrak bu cihazda yok"}</b>
                <span className="block text-[0.8125rem] text-mut">{stale ? "Bir bilgi değişti, önceki evrak geçersiz." : "Başka cihazda hazırlandı ya da telefon sildi. Yeniden hazırla."}</span>
              </span>
              <button type="button" onClick={make} disabled={busy} className="h-9 shrink-0 rounded-full bg-amber-600 px-4 text-[0.8125rem] font-semibold text-white disabled:opacity-50">
                {busy ? "Hazırlanıyor…" : stale ? "Yenile" : "Hazırla"}
              </button>
            </div>
          )}

          {/* Özet: hazır evrak tek kartta */}
          {file && (
            <div className="mt-4 rounded-3xl bg-deep px-5 py-4 text-white">
              <p className="truncate text-[0.6875rem] font-semibold uppercase tracking-wider text-white/70">Evrak · {r.name || "yarış"}</p>
              <b className="mt-0.5 block text-[1.375rem] font-bold">{parts.length} belge hazır</b>
              <span className="block text-[0.8125rem] text-white/80">{[`${made?.pages || pages} sayfa`, made?.at && `${madeText(made.at)} hazırlandı`, `${chosen.length} sporcu`].filter(Boolean).join(" · ")}</span>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => openPdf()} className="h-10 flex-1 rounded-full bg-white text-[0.875rem] font-semibold text-deep">Tümünü aç</button>
                <button type="button" onClick={() => share()} className="h-10 flex-1 rounded-full bg-white/15 text-[0.875rem] font-semibold">Paylaş</button>
                {onMail && (
                  <button type="button" onClick={() => setMailPick(true)} disabled={mailing} aria-label="Mail at" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 disabled:opacity-50">
                    <Icon name="mail" className="size-5" />
                  </button>
                )}
                <button type="button" onClick={make} disabled={busy} className="h-10 flex-1 rounded-full bg-white/15 text-[0.875rem] font-semibold disabled:opacity-50">
                  {busy ? "…" : "Yenile"}
                </button>
              </div>
            </div>
          )}

          {/* Eksikler tek yerde; çoğu burada doldurulur */}
          {(lacks > 0 || signerAsk) && (
            <>
              <Label right={lacks ? `${lacks}` : "tamam"}>EKSİKLER</Label>
              <div className={`${card} divide-y divide-line overflow-hidden`}>
                {!ready[0][1] && (
                  <button type="button" onClick={() => setEdit(true)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <Icon name="alert" className="size-[1.125rem] shrink-0 text-rec" />
                    <span className="flex-1 text-[0.875rem] font-medium">{ready[0][0]}</span>
                    <span className="text-[0.8125rem] font-semibold text-acc">Düzelt</span>
                  </button>
                )}
                {!chosen.length && (
                  <button type="button" onClick={() => setTab("people")} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <Icon name="alert" className="size-[1.125rem] shrink-0 text-rec" />
                    <span className="flex-1 text-[0.875rem] font-medium">Sporcu seçilmedi</span>
                    <span className="text-[0.8125rem] font-semibold text-acc">Sporcu ekle</span>
                  </button>
                )}
                {signerAsk && (
                  <div className={r.signer.trim() ? "" : "bg-amber-500/5"}>
                    <p className="flex items-center gap-3 px-4 pt-3 text-[0.875rem] font-medium">
                      <Icon name={r.signer.trim() ? "check" : "alert"} className={`size-[1.125rem] shrink-0 ${r.signer.trim() ? "text-ok" : "text-rec"}`} />
                      Belgeleri imzalayan kulüp yetkilisi
                    </p>
                    <Pair>
                      <Row label="Ad soyad">{field("signer", "Ad Soyad")}</Row>
                      <Row label="Görevi">{field("signerTitle", "Başkan")}</Row>
                    </Pair>
                  </div>
                )}
                {fixList.map((a) => {
                  const miss = missing(a, docs);
                  const gone = raceExpired(a, r);
                  return (
                    <button key={a.id} type="button" onClick={() => setFix(a)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                      <Icon name="alert" className="size-[1.125rem] shrink-0 text-amber-600" />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[0.875rem] font-medium">{a.studentName}</b>
                        <span className="block truncate text-[0.75rem] text-mut">{[miss.length && `Eksik: ${miss.join(", ")}`, gone.length && `${gone.map((x) => x.label).join(", ")} yarışta geçersiz`].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-[0.8125rem] font-semibold text-acc">Tamamla</span>
                    </button>
                  );
                })}
                {coachLack.length > 0 && (
                  <button type="button" onClick={() => (setCoachOpen(true), setTimeout(() => coachRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50))} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <Icon name="alert" className="size-[1.125rem] shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1">
                      <b className="block text-[0.875rem] font-medium">Antrenör bilgisi</b>
                      <span className="block truncate text-[0.75rem] text-mut">Eksik: {coachLack.join(", ")}</span>
                    </span>
                    <span className="text-[0.8125rem] font-semibold text-acc">Tamamla</span>
                  </button>
                )}
              </div>
              <p className="mt-2 px-1 text-[0.75rem] text-mut">Kırmızılar olmadan evrak hazırlanmaz; diğerleri belgede boş kalır.</p>
            </>
          )}

          {/* Belgeler kategorilere göre: seçim, durum, ayarlar ve sporcular tek satırda */}
          {DOC_GROUPS.map(([gTitle, keys]) => (
            <div key={gTitle}>
              <Label right={`${keys.filter((x) => docs.includes(x)).length}/${keys.length}`}>{gTitle}</Label>
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                {keys.map((k) => {
                  const label = DOC_TITLE[k];
                  const on = docs.includes(k);
                  const part = parts.find((x) => x.key === k);
                  const people = part?.people || [];
                  const more = on && (DOC_SET.includes(k) || (k === "coach" && !docs.includes("entry")) || people.length > 0);
                  const open = more && openPart === k;
                  const warn = on && k === "hotel" && !hotel.hotel ? "Otel seçilmedi, elle yazılacak" : "";
                  const status = !on ? "Seçili değil" : warn || (part ? `Hazır · ${docSub(k, part)}` : docSub(k));
                  const main = () => (!on ? pickDoc(k, true) : more ? setOpenPart(open ? null : k) : part ? openPdf(part.file) : pickDoc(k, false));
                  return (
                    <li key={k}>
                      <div className="flex items-center gap-1 pl-2 pr-1.5">
                        <button type="button" onClick={() => pickDoc(k, !on)} aria-pressed={on} aria-label={`${label} ${on ? "çıkar" : "seç"}`} data-press className="btn btn-icon size-10 shrink-0">
                          <span className={`grid size-6 place-items-center rounded-md ring-2 ${on ? "bg-acc text-white ring-acc" : "ring-line"}`}>
                            {on && <Icon name="check" className="size-4 [stroke-width:3]" />}
                          </span>
                        </button>
                        <button type="button" onClick={main} aria-expanded={more ? open : undefined} data-press="row" className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left">
                          <span className="min-w-0 flex-1">
                            <b className={`block truncate text-[0.9375rem] font-semibold ${on ? "" : "text-mut"}`}>{label}</b>
                            <span className={`block truncate text-[0.8125rem] ${warn ? "text-amber-600" : part ? "text-acc" : "text-mut"}`}>{status}</span>
                          </span>
                          {more && <Icon name="chev" className={`size-5 shrink-0 text-mut transition-transform ${open ? "rotate-90" : ""}`} />}
                        </button>
                        {part && (
                          <button type="button" onClick={() => openPdf(part.file)} aria-label={`${label} aç`} data-press className="btn btn-icon size-10 shrink-0 text-acc">
                            <Icon name="print" className="size-5" />
                          </button>
                        )}
                      </div>
                      {open && (
                        <div className="border-t border-line bg-bg/40 pb-1 pt-3">
                  {on && k === "travel" && (
                    <div className="mx-4 mb-3 divide-y divide-line overflow-hidden rounded-xl bg-bg ring-1 ring-line">
                      <Row label="Seyahat türü">{field("travel", "Kendi İmkanları İle")}</Row>
                      <Pair>
                        <Row label="Araç plaka / model">{field("vehicle", "-")}</Row>
                        <Row label="Şoför / ehliyet">{field("drivers", "-")}</Row>
                      </Pair>
                    </div>
                  )}
                  {on && k === "club" && (
                    <div className="mx-4 mb-3">
                      <div className="divide-y divide-line overflow-hidden rounded-xl bg-bg ring-1 ring-line">
                        <Row label="Sayı (ilk sporcu)">{field("clubNo", "GID-2026-14")}</Row>
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
                      </div>
                      <p className="mt-1.5 px-1 text-[0.75rem] text-mut">
                        {[club.no && chosen.length > 1 && `Sayı sporcu başına artar: ${club.no} … ${nextNo(club.no, chosen.length - 1)}.`, "Boşlar yarış bilgisinden gelir."].filter(Boolean).join(" ")}
                      </p>
                      {(r.clubFrom || r.clubTo || r.clubEvent || r.clubPlace) && (
                        <button
                          type="button"
                          onClick={() => (dropFile(), setR((p) => ({ ...p, clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "" })))}
                          data-press className="btn btn-text btn-sm mt-1 text-acc"
                        >
                          Yarışın tarih, ad ve yerine dön
                        </button>
                      )}
                    </div>
                  )}
                  {on && k === "hotel" && (
                    <div className="mx-4 mb-3">
                      {/* Otel tek yerde, Yolculuk'ta (2026-10-28): burada yalnız seçilir; Yolculuk'ta otel yoksa ad elle yazılır */}
                      {hotels.length > 0 || hotel.hotel ? (
                        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Otel">
                          {(hotel.hotel && !hotels.includes(hotel.hotel) ? [hotel.hotel, ...hotels] : hotels).map((n) => {
                            const sel = hotel.hotel === n;
                            return (
                              <button key={n} type="button" role="radio" aria-checked={sel} onClick={() => set("hotelName")(sel ? "" : n)} className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${sel ? "bg-acc text-white" : "bg-acc/10 text-acc"}`}>
                                {n}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setTab("trip")} data-press className="btn btn-text btn-sm text-acc">
                          {"Oteli Yolculuk'a ekle"}
                        </button>
                      )}
                      <div className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-bg ring-1 ring-line">
                        <Pair>
                          <Row label="Giriş">{clubDate("hotelFrom", hotel.from)}</Row>
                          <Row label="Çıkış">{clubDate("hotelTo", hotel.to)}</Row>
                        </Pair>
                      </div>
                    </div>
                  )}
                  {on && k === (docs.includes("entry") ? "entry" : "coach") && (
                    <div className="mx-4 mb-3">
                      <div className="overflow-hidden rounded-xl bg-bg ring-1 ring-line">
                        <Row label="Sınıf (formda)">
                          <input value={r.entryClass || ""} onChange={(e) => set("entryClass")(e.target.value)} placeholder={autoClasses.join(", ") || "ILCA 4"} className={input} />
                        </Row>
                      </div>
                      <p className="mt-1.5 px-1 text-[0.75rem] text-mut">
                        {autoClasses.length > 1 && !(r.entryClass || "").trim()
                          ? `Sporcular ${autoClasses.length} sınıfta; her sınıfa ayrı form. Tek form için sınıfı yaz.`
                          : "Boşsa sporcuların sınıfı yazılır."}
                      </p>
                    </div>
                  )}
                          {people.length > 0 && (
                            <div className="mx-4 mb-3">
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-mut">Sporcular</span>
                                <button type="button" onClick={() => share(part.file)} className="text-[0.8125rem] font-semibold text-acc">Hepsini paylaş</button>
                              </div>
                              <PeopleList people={people} openPdf={openPdf} share={share} />
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <Label>VELİ</Label>
          <button type="button" onClick={() => setSheetOpen(true)} data-press="row" className={`${card} flex w-full items-center gap-3 px-4 py-3 text-left`}>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold">Veli bilgi notu</b>
              <span className="block truncate text-[0.8125rem] text-mut">{chosen.length ? `${chosen.length} sayfa · yolculuk, program, sporcu payı` : "Önce sporcuları ekle"}</span>
            </span>
            <Icon name="chev" className="size-5 shrink-0 text-mut" />
          </button>
          {file && <p className="mt-2 px-1 text-[0.75rem] text-mut">Hazır evrak bu telefonda saklanır. Sporcu kartında bir bilgiyi değiştirdiysen {"Yenile'ye bas."}</p>}

          <Label>ORTAK BİLGİLER</Label>
          <div className={`${card} overflow-hidden`}>
            <button type="button" onClick={() => setSignOpen(!signOpen)} aria-expanded={signOpen} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <Icon name="edit" className="size-5 shrink-0 text-acc" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">İmza ve tarih</b>
                <span className="block truncate text-[0.8125rem] text-mut">{[r.signer.trim() && `${r.signer.trim()}${r.signerTitle?.trim() ? `, ${r.signerTitle.trim()}` : ""}`, r.letterDate ? `evrak tarihi ${rangeText(r.letterDate, r.letterDate)}` : "evrak tarihi ilk hazırlamada yazılır"].filter(Boolean).join(" · ")}</span>
              </span>
              <Icon name="chev" className={`size-5 shrink-0 text-mut transition-transform ${signOpen ? "rotate-90" : ""}`} />
            </button>
            {signOpen && (
              <div className="divide-y divide-line border-t border-line">
                {!signerAsk && (
                  <Pair>
                    <Row label="İmzalayan (kulüp yetkilisi)">{field("signer", "Ad Soyad")}</Row>
                    <Row label="Görevi">{field("signerTitle", "Başkan")}</Row>
                  </Pair>
                )}
                <Row label="Evrak tarihi">{field("letterDate", "", "date")}</Row>
                <Pair>
                  <Row label="Okul izni başlangıcı">{field("leaveStart", "", "date")}</Row>
                  <Row label="Okul izni bitişi">{field("leaveEnd", "", "date")}</Row>
                </Pair>
              </div>
            )}
          </div>

          {coachOn && (
            <div ref={coachRef} className="scroll-mt-4">
              <Label right={coachSaved ? "kaydedildi ✓" : "hesabına kaydedilir"}>{tyf ? "ANTRENÖR VE DESTEK BOTU" : "ANTRENÖR"}</Label>
              {!coachOpen ? (
                <button type="button" onClick={() => setCoachOpen(true)} className={`${card} flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg`}>
                  <Icon name="user" className="size-5 shrink-0 text-acc" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{coach.name || "Antrenör"}</b>
                    <span className="block text-[0.8125rem] text-mut">{coachLack.length ? `Eksik: ${coachLack.join(", ")}` : "Bilgiler hesabında kayıtlı, belgelere kendiliğinden yazılır"}</span>
                  </span>
                  <span className="text-[0.8125rem] font-semibold text-acc">Düzenle</span>
                </button>
              ) : (
              <>
              <Group>
                {COACH_FIELDS.filter(([k]) => tyf || !TYF_ONLY.includes(k)).map(([k, label, mode]) => (
                  <Row key={k} label={label} className={coach[k] || !coachLackKeys.includes(k) ? "" : "bg-amber-500/5"}>
                    <input
                      value={coach[k]}
                      onChange={(e) => setCoachField(k)(e.target.value)}
                      type={mode === "date" ? "date" : undefined}
                      inputMode={mode && mode !== "date" ? mode : undefined}
                      maxLength={k === "tc" ? 11 : 120}
                      className={input}
                    />
                  </Row>
                ))}
              </Group>
              <p className="mt-2 px-1 text-[0.75rem] text-mut">Bir kez yaz, hesabına kaydedilir; sonraki yarışlarda ve diğer cihazlarda hazır gelir. Boş kalan alan formda boş çıkar.</p>
              </>
              )}
            </div>
          )}

          <Label right={(r.files || []).length + extras.length ? `${(r.files || []).length + extras.length}` : ""}>EKLENEN EVRAK</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {r.noticeFile && (
              <FileRow tag="PDF" title="Yarış talimatı" sub={`${sizeText(r.noticeFile.size)} · her cihazdan açılır`} onOpen={noticeOpen} onShare={noticeOpen} />
            )}
            {(r.files || []).map((x) => (
              <FileRow
                key={x.id}
                tag={/pdf/.test(x.type) ? "PDF" : /image/.test(x.type) ? "FOTO" : "DOSYA"}
                title={x.name}
                sub={`${sizeText(x.size)} · ${madeText(x.at)}`}
                onOpen={() => storedFile(x, (f) => (/pdf/.test(x.type) ? setDocView(f) : openFile(f, false)))}
                onShare={() => storedFile(x, shareFile)}
                onRemove={() => removeStored(x)}
              />
            ))}
            {extras.length > 0 && (
              <li className="flex items-center gap-3 bg-amber-50 px-4 py-3 dark:bg-amber-400/10">
                <span className="min-w-0 flex-1 text-[0.8125rem] text-amber-900 dark:text-amber-200">
                  <b className="block text-[0.875rem] font-semibold">{extras.length} evrak yalnız bu telefonda</b>
                  Telefon değişirse kaybolur, Mac&apos;ten açılmaz.
                </span>
                <button type="button" disabled={upload != null} onClick={sendLocal} data-press className="btn btn-primary btn-sm shrink-0">
                  Firebase&apos;e gönder
                </button>
              </li>
            )}
            {extras.map((x) => (
              <FileRow
                key={x.id}
                tag={/pdf/.test(x.type) ? "PDF" : /image/.test(x.type) ? "FOTO" : "DOSYA"}
                title={x.name}
                sub={`${sizeText(x.blob.size)} · yalnız bu telefonda`}
                onOpen={() => (/pdf/.test(x.type) ? setDocView(asFile(x)) : openFile(asFile(x), false))}
                onShare={() => shareFile(asFile(x))}
                onRemove={() => removeExtra(x)}
              />
            ))}
            <li>
              <button type="button" disabled={upload != null} onClick={() => pickExtra.current?.click()} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                  <Icon name="plus" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold text-acc">{upload != null ? `Yükleniyor… %${Math.round(upload * 100)}` : "Evrak ekle"}</b>
                  <span className="block text-[0.8125rem] text-mut">Kayıt formu, sağlık raporu, dekont… (PDF ya da fotoğraf)</span>
                </span>
              </button>
              <input
                ref={pickExtra}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addExtras([...(e.target.files || [])]);
                  e.target.value = "";
                }}
              />
            </li>
          </ul>

        </>
      )}

      {/* Alt çubuk: belge hazırla → aç / paylaş */}
      <div data-pagebar="" className={`${tab !== "docs" || file ? "hidden " : ""}fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6`}>
        <div className="mx-auto flex max-w-[26rem] gap-2">
          {file ? (
            <>
              <button type="button" onClick={() => openPdf()} data-press className="btn btn-secondary text-acc">
                <Icon name="print" className="size-5" />
                Aç
              </button>
              {onMail && (
                <button type="button" onClick={() => setMailPick(true)} disabled={mailing} aria-label="Mail at" data-press className="btn btn-secondary text-acc">
                  <Icon name="mail" className="size-5" />
                  {mailing ? "…" : "Mail"}
                </button>
              )}
              <button type="button" onClick={() => share()} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white">
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

      <Sheet open={!!ask} onClose={() => setAsk(null)} title="Talimat farklı">
        {ask && (
          <>
            <p className="text-[0.875rem] leading-relaxed text-mut">Yüklediğin talimat daha önce okunan bilgiden farklı:</p>
            <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
              {ask.diffs.map((d) => (
                <li key={d} className="flex items-start gap-2.5 px-4 py-2.5 text-[0.875rem] leading-snug">
                  <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1">{d}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <button type="button" onClick={() => (setAsk(null), takeNotice(ask.n, ask.pdf, "update"))} data-press className="btn btn-primary w-full">
                Bilgileri güncelle
              </button>
              <button type="button" onClick={() => (setAsk(null), takeNotice(ask.n, ask.pdf, "keep"))} data-press className="btn btn-secondary w-full text-acc">
                Yalnız dosyayı sakla
              </button>
              <button type="button" onClick={() => setAsk(null)} data-press className="btn btn-text btn-sm w-full text-mut">
                Vazgeç
              </button>
            </div>
          </>
        )}
      </Sheet>
      {onMail && <MailTo open={mailPick} onClose={() => setMailPick(false)} saved={mailTo} onSaved={onMailTo} onSend={mail} />}
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
              dropFile();
            }}
          />
        )}
      </Sheet>
      {docView && <PdfViewer title={docView.name} load={() => Promise.resolve(docView)} onClose={() => setDocView(null)} />}
      {viewer && r.noticeFile && <PdfViewer title={r.noticeFile.name || "Yarış talimatı"} load={loadViewer} onClose={() => setViewer(false)} />}
      </div>
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
            <button type="button" onClick={() => toggle(a.id)} aria-pressed={sel.has(a.id)} data-press="row" className="flex w-full items-center gap-3 py-2.5 text-left">
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
  const [f, setF] = useState(() => ({ ...Object.fromEntries([...fields, ...EXPIRY].map(([k]) => [k, a[k] || ""])), studentGender: a.studentGender || "", studentBirthDate: startDate }));
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
        <Row label="Cinsiyet" className={f.studentGender ? "" : "bg-amber-500/5"}>
          <select value={f.studentGender} onChange={(e) => setF((p) => ({ ...p, studentGender: e.target.value }))} className={input}>
            <option value="">—</option>
            <option value="Erkek">Erkek</option>
            <option value="Kız">Kız</option>
          </select>
        </Row>
        <Row label="Doğum tarihi" className={f.studentBirthDate ? "" : "bg-amber-500/5"}>
          <input type="date" value={f.studentBirthDate} onChange={(e) => setF((p) => ({ ...p, studentBirthDate: e.target.value }))} className={input} />
        </Row>
        {EXPIRY.map(([k, label]) => (
          <Row key={k} label={`${label} bitişi`}>
            <input type="date" value={f[k]} onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))} className={input} />
          </Row>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-5 mt-4 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button type="button" onClick={onClose} data-press className="btn btn-secondary">
          Vazgeç
        </button>
        <button type="button" onClick={save} disabled={busy} data-press className="btn btn-primary">
          {busy ? "Kaydediliyor…" : Object.keys(patch).length ? "Kaydet" : "Kapat"}
        </button>
      </div>
    </div>
  );
}

// Biten yarışın özeti (Seyhun: "tamamlanan yarışta hazırlıkları göstermeye gerek yok; kaç gün sürdü, kimler katıldı,
// sonuçları, bütçe durumu"; yapılmadan kalan işler bilgi olarak, istenirse yine yapıldı işaretlenir)
function RaceDone({ r, chosen, money, steps, doneCount, onTab, onMark, resHref }) {
  const from = r.startDate, to = r.endDate || r.startDate;
  const days = from ? Math.round((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 864e5) + 1 : 0;
  const placed = ourPlaces(r.results, chosen);
  const paid = chosen.filter((a) => r.budget?.paid?.[a.id]).length;
  const stats = [
    [days ? `${days} gün` : "–", from ? rangeText(from, to) : "Tarih yok"],
    [String(chosen.length), "sporcu katıldı"],
    [money.lines.length ? tl(money.total) : "–", "bütçe"],
  ];
  return (
    <>
      <Label>YARIŞ BİTTİ</Label>
      <div className={`${card} grid grid-cols-3 divide-x divide-line`}>
        {stats.map(([big, small]) => (
          <div key={small} className="min-w-0 px-2 py-3 text-center">
            <b className="block truncate text-[1.0625rem] font-semibold tabular-nums">{big}</b>
            <span className="block truncate text-[0.75rem] text-mut">{small}</span>
          </div>
        ))}
      </div>

      {/* Sonuçların yeri Multimedya › Sonuçlar (2026-10-28): burada bizimkilerin sırası tek satır */}
      <Label right={r.results?.fleet ? `${r.results.fleet} tekne` : ""}>SONUÇLAR</Label>
      {resHref ? (
        <Link href={resHref} className={`${card} flex min-h-[2.875rem] items-center gap-3 px-4 py-2.5 active:bg-bg`}>
          <span className={`min-w-0 flex-1 truncate text-[0.9375rem] ${placed.length ? "font-medium" : "text-mut"}`}>{placed.length ? placed.map((x) => `${x.name.split(" ")[0]} ${x.place}.`).join(" · ") : chosen.length ? "Sonuç yok" : "Sporcu eklenmemiş"}</span>
          <span className="shrink-0 text-[0.875rem] font-semibold text-acc">{placed.length ? "Tümü" : "Ekle"}</span>
          <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
        </Link>
      ) : (
        <p className={`${card} px-4 py-3 text-[0.875rem] text-mut`}>Sonuç yok</p>
      )}

      <Label>BÜTÇE</Label>
      <button type="button" onClick={() => onTab("budget")} className={`${card} block w-full divide-y divide-line overflow-hidden text-left`}>
        {money.lines.length ? (
          [
            ["Toplam", tl(money.total)],
            chosen.length > 0 && [money.varies ? "Ortak pay" : "Sporcu başı", tl(money.perAthlete)],
            chosen.length > 0 && ["Ödeyen", `${paid} / ${chosen.length} sporcu`, paid < chosen.length],
          ]
            .filter(Boolean)
            .map(([k, v, warn]) => (
              <span key={k} className="flex items-center justify-between px-4 py-2.5 text-[0.9375rem]">
                <span className="text-mut">{k}</span>
                <b className={`font-semibold tabular-nums ${warn ? "text-amber-700" : ""}`}>{v}</b>
              </span>
            ))
        ) : (
          <span className="block px-4 py-3 text-[0.875rem] text-mut">Bütçe çıkarılmamış.</span>
        )}
      </button>

      {steps.length > 0 && (
        <>
          <Label right={doneCount ? `${doneCount} yapıldı` : ""}>YAPILMADAN KALANLAR</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-1 pl-1 pr-4">
                <button type="button" onClick={() => onMark(s)} aria-label={`${s.label}: yapıldı`} data-press className="btn btn-icon shrink-0">
                  <span className="size-[1.375rem] rounded-full border-2 border-line" />
                </button>
                <span className="min-w-0 flex-1 py-3 text-[0.9375rem] leading-snug text-mut">{s.label}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 px-1 text-[0.75rem] text-mut">Yarış bitti, bunlar bilgi için duruyor. Yaptıysan daireye dokun.</p>
        </>
      )}
    </>
  );
}

// Yeni yarış: başka kulübün (ya da ana hesabın) eklediği yarışlardan seç; talimat, tarih ve yer hazır gelir (lib/sharedRace.js)
function SharedPick({ list, onPick }) {
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 5);
  return (
    <>
      <h2 className="mt-6 px-1 text-[1.375rem] font-semibold leading-tight">Ortak yarışlardan seç</h2>
      <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
        {shown.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onPick(s)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{s.name}</b>
                <span className="block truncate text-[0.8125rem] text-mut">{[placeText(s), rangeText(s.startDate, s.endDate), s.noticeFile && "Talimat var"].filter(Boolean).join(" · ")}</span>
              </span>
              <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
            </button>
          </li>
        ))}
      </ul>
      {list.length > 5 && !all && (
        <button type="button" onClick={() => setAll(true)} data-press className="btn btn-text btn-sm mt-1 w-full text-acc">
          Tümü ({list.length})
        </button>
      )}
    </>
  );
}
