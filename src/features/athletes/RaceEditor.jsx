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
import { DOCS, buildRaceDocs, clubInfo, hotelInfo, loadFonts, missing, nextNo, rangeText } from "./raceDocs";
import { raceNames } from "./raceNames";
import { applyNotice, readNotice, readNoticeText } from "./raceNotice";
import { NoticeDeadlines, NoticeDetails, NoticeUpload } from "./NoticeView";
import { MailTo } from "@/features/mail/MailTo";
import { openFile, shareFile } from "./fileActions";
import { BudgetView } from "./BudgetView";
import { dropExtras, dropRaceFile, getExtras, getRaceFile, saveExtras, saveRaceFile } from "./raceFiles";
import { cleanTodos, doneCount, shiftDay, stepsOf, todoKey } from "./races";
import { DateBadge, Progress, initials, leftText, placeText } from "./RaceList";

const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const daysTo = (d) => Math.round((new Date(`${d}T12:00:00`) - new Date(`${todayStr()}T12:00:00`)) / 864e5);
const madeText = (iso) => new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const sizeText = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const partName = (all, title) => `${all.replace(/-evrak\.pdf$/, "")}-${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.pdf`;
const asFile = (x) => new File([x.blob], x.name, { type: x.type });
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const input = "mt-0.5 block h-7 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60";

// Belgelerin kısa tanımı
const DOC_INFO = {
  school: ["book", "GSİM'e: sporcuların okul ve il-ilçe listesi"],
  kafile: ["flag", "Valilik onayı: kafile ve lisans numaraları"],
  travel: ["mail", "GSİM Spor Faaliyetleri Birimine dilekçe"],
  parent: ["users", "Her sporcu için bir sayfa, veli imzalar"],
  club: ["note", "Kulüpten okula, her sporcuya ayrı; tarihleri ayrı"],
  hotel: ["home", "Tek sayfa: tüm velilerin otel konaklama imzası"],
};

// Dosya satırı: tür etiketi, ad, alt bilgi; aç, paylaş, (varsa) sil
function FileRow({ tag, title, sub, onOpen, onShare, onRemove }) {
  return (
    <li className="flex items-center gap-1 pl-4 pr-1.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-[0.625rem] font-bold text-rec">{tag}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
          <span className="block truncate text-[0.8125rem] text-mut">{sub}</span>
        </span>
      </button>
      <button type="button" onClick={onShare} aria-label={`${title} paylaş`} className="grid size-10 shrink-0 place-items-center text-acc">
        <Icon name="up" className="size-5" />
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`${title} sil`} className="grid size-10 shrink-0 place-items-center text-mut">
          <Icon name="x" className="size-4" />
        </button>
      )}
    </li>
  );
}

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
export function RaceEditor({ start, athletes, athletesErr, onRetryAthletes, onSave, onDelete, onPlan, onNoticePlan, onSaveAthlete, onMail, mailTo, onMailTo }) {
  const toast = useToast();
  const [r, setR] = useState(start);
  const [tab, setTab] = useState(start.name ? "sum" : "info");
  const [pick, setPick] = useState(false);
  const [fix, setFix] = useState(null); // bilgisi tamamlanacak sporcu
  const [docs, setDocs] = useState(DOCS.map(([k]) => k));
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null); // hazırlanan PDF
  const [mailText, setMailText] = useState(""); // hazır PDF'in mail metni
  const [made, setMade] = useState(null); // { at, pages } hazırlanma zamanı (bu cihazda saklı)
  const [parts, setParts] = useState([]); // her belge ayrı PDF: [{ key, title, file, pages }]
  const [extras, setExtras] = useState([]); // elle eklenen evrak: [{ id, name, type, blob, at }]
  // Hazır PDF bu cihazda saklıdır; sayfaya dönünce yeniden hazırlamak gerekmez
  useEffect(() => {
    let live = true;
    getRaceFile(start.id).then((f) => {
      if (!live || !f?.blob) return;
      setFile(new File([f.blob], f.name, { type: "application/pdf" }));
      if (Array.isArray(f.docs) && f.docs.length) setDocs(f.docs);
      setMailText(f.mailText || "");
      setMade({ at: f.at, pages: f.pages });
      setParts((f.parts || []).map((x) => ({ ...x, file: new File([x.blob], partName(f.name, x.title), { type: "application/pdf" }) })));
    });
    getExtras(start.id).then((l) => live && setExtras(l));
    return () => void (live = false);
  }, [start.id]);
  const [known] = useState(raceNames); // daha önce yazılmış yarış adları (öneri)

  // Belgeyi değiştiren alanlar hazır PDF'i geçersiz kılar (cihazdaki kopya da silinir)
  const dropFile = () => {
    setFile(null);
    setMade(null);
    setParts([]);
    dropRaceFile(id.current);
  };
  const set = (k) => (v) => {
    dropFile();
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
  const hotel = hotelInfo(r);
  // Talimattaki oteller öneri olarak çıkar (dokununca otel adı olur)
  const hotels = [...new Set((r.notice?.hotels || []).map((h) => String(h?.name || "").trim()).filter(Boolean))].slice(0, 4);
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
  // Asistan bu yarışı değiştirdiyse (sporcu, not, tarih, bütçe) sayfa yeniden kaydetmeden güncellenir
  useEffect(() => {
    const on = (e) => {
      const n = e.detail;
      if (!n?.id || n.id !== id.current) return;
      const p = latest.current;
      if (n.startDate !== p.startDate || n.endDate !== p.endDate || n.athleteIds.join() !== p.athleteIds.join()) dropFile();
      first.current = !dirty.current; // asistanın değişikliği kaydedildi; sayfada bekleyen değişiklik varsa birlikte yazılır
      setR({ ...p, athleteIds: n.athleteIds, note: n.note, city: n.city, district: n.district, startDate: n.startDate, endDate: n.endDate, leaveStart: n.leaveStart, leaveEnd: n.leaveEnd, budget: n.budget });
    };
    window.addEventListener("sa-race-saved", on);
    return () => window.removeEventListener("sa-race-saved", on);
  });

  const pages =
    (docs.includes("school") ? 1 : 0) + (docs.includes("kafile") ? 1 : 0) + (docs.includes("travel") ? 1 : 0) + (docs.includes("parent") ? chosen.length : 0) + (docs.includes("club") ? chosen.length : 0) + (docs.includes("hotel") ? 1 : 0);
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
      const text = [
        `${r.name.trim()} · ${rangeText(r.startDate, r.endDate || r.startDate)}${placeText(r) ? ` · ${placeText(r)}` : ""}`,
        "",
        `Belgeler: ${DOCS.filter(([k]) => docs.includes(k)).map(([, t]) => t).join(", ")}`,
        `Sporcular (${chosen.length}): ${chosen.map((a) => a.studentName).join(", ")}`,
        "",
        "Sesli Asistan ile hazırlandı.",
      ].join("\n");
      // Her belge ayrıca tek başına (listede ayrı açılır, paylaşılır)
      const fonts = await loadFonts();
      const each = [];
      for (const [k, title] of DOCS.filter(([k]) => docs.includes(k))) {
        const b = await buildRaceDocs({ ...r, endDate: r.endDate || r.startDate }, chosen, fonts, [k]);
        each.push({ key: k, title, blob: new Blob([b], { type: "application/pdf" }), pages: k === "parent" || k === "club" ? chosen.length : 1 });
      }
      const at = new Date().toISOString();
      setFile(new File([bytes], name, { type: "application/pdf" }));
      setMailText(text);
      setMade({ at, pages });
      setParts(each.map((x) => ({ ...x, file: new File([x.blob], partName(name, x.title), { type: "application/pdf" }) })));
      await queue.current.catch(() => {});
      if (id.current) saveRaceFile({ id: id.current, blob: new Blob([bytes], { type: "application/pdf" }), name, docs, pages, at, mailText: text, parts: each });
      setTab("docs");
      if (docs.length === DOCS.length && !r.checks?.docs) put("checks", { ...r.checks, docs: true });
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
  const openPdf = (download, f = file) => openFile(f, download);
  // Elle evrak ekleme (PDF, fotoğraf…): bu cihazda yarışa bağlı saklanır
  const pickExtra = useRef(null);
  const addExtras = async (list) => {
    await queue.current.catch(() => {});
    if (!id.current) return toast("Önce yarış adını yaz");
    const add = [...list].filter((f) => f.size <= 25 * 1024 * 1024).map((f) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: f.name || "evrak", type: f.type || "application/octet-stream", blob: f, at: new Date().toISOString() }));
    if (add.length < list.length) toast("25 MB'tan büyük dosya eklenmedi");
    if (!add.length) return;
    const next = [...extras, ...add];
    setExtras(next);
    await saveExtras(id.current, next);
    toast(add.length > 1 ? `${add.length} evrak eklendi` : "Evrak eklendi");
  };
  const removeExtra = async (x) => {
    if (!confirm(`"${x.name}" silinsin mi?`)) return;
    const next = extras.filter((e) => e.id !== x.id);
    setExtras(next);
    await saveExtras(id.current, next);
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
      dropFile();
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
    dropRaceFile(id.current);
    dropExtras(id.current);
    await onDelete(id.current);
  };

  const n = doneCount(r);
  const steps = stepsOf(r);
  const fromNotice = steps.some((x) => x.group === "notice");
  const inGroup = (group) => steps.filter((x) => (group === "docs" ? x.group === "docs" : x.group !== "docs"));
  const count = (group) => `${inGroup(group).filter((x) => r.checks?.[x.key]).length}/${inGroup(group).length}`;
  // Elle iş ekleme/silme (her yarışa ayrı)
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
  const removeTodo = (key) => {
    const checks = { ...r.checks };
    delete checks[key];
    setR((p) => ({ ...p, todos: (p.todos || []).filter((t) => todoKey(t.title) !== key), checks }));
  };
  const stepList = (group) => (
    <ul className={`${card} divide-y divide-line overflow-hidden`}>
      {inGroup(group).map(({ key, label, date, detail, group: g }) => {
        const on = !!r.checks?.[key];
        const left = date ? daysTo(date) : null;
        return (
          <li key={key} className="flex items-center">
            <button type="button" onClick={() => put("checks", { ...r.checks, [key]: !on })} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-bg">
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
            {g === "own" && (
              <button type="button" onClick={() => removeTodo(key)} aria-label={`${label} işini sil`} className="-ml-2 grid size-11 shrink-0 place-items-center text-mut">
                <Icon name="x" className="size-4" />
              </button>
            )}
          </li>
        );
      })}
      {group === "prep" && (
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-2">
          <Icon name="plus" className="size-5 shrink-0 text-acc" />
          <input
            value={todo}
            onChange={(e) => setTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="İş ekle (ör. Tekne römorkunu ayarla)"
            className="h-9 min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut/60"
          />
          {todo.trim() && (
            <span className="flex w-full items-center gap-2 pb-1 pl-7">
              <span className="text-[0.8125rem] text-mut">Son tarih</span>
              <input type="date" value={todoDate} onChange={(e) => setTodoDate(e.target.value)} aria-label="Son tarih (isteğe bağlı)" className="h-9 min-w-0 flex-1 rounded-lg bg-bg px-2 text-[0.8125rem]" />
              <button type="button" onClick={addTodo} className="h-9 shrink-0 rounded-full bg-acc px-3.5 text-[0.8125rem] font-semibold text-white active:scale-95">
                Ekle
              </button>
            </span>
          )}
        </li>
      )}
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
        options={[["sum", "Özet"], ["people", "Sporcu", chosen.length], ["info", "Bilgi"], ["budget", "Bütçe"], ["docs", "Evrak"]]}
        className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-[5] mt-3"
      />

      {tab === "sum" && (
        <>
          <Label right={`${fromNotice ? "talimata göre · " : ""}${count("prep")}`}>KAYIT VE HAZIRLIK</Label>
          {stepList("prep")}
          {!fromNotice && <p className="mt-2 px-1 text-[0.75rem] text-mut">{r.notice ? "Talimatta iş bulunamadı; işleri elle ekleyebilirsin." : "Talimatı yüklersen kayıt, ödeme, konaklama gibi işler son tarihleriyle buraya gelir. İstediğin işi elle de ekleyebilirsin."}</p>}

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

      {tab === "budget" && <BudgetView r={r} athletes={chosen} onChange={(b) => put("budget", b)} />}

      {tab === "docs" && (
        <>
          {file && (
            <>
              <Label right={made?.at ? `${madeText(made.at)} hazırlandı` : ""}>HAZIRLANAN EVRAK</Label>
              <ul className={`${card} divide-y divide-line overflow-hidden`}>
                <FileRow tag="PDF" title="Tümü (tek dosya)" sub={`${made?.pages || pages} sayfa · yazdır, imzala, gönder`} onOpen={() => openPdf(false)} onShare={() => share()} />
                {parts.map((x) => (
                  <FileRow key={x.key} tag="PDF" title={x.title} sub={`${x.pages} sayfa`} onOpen={() => openPdf(false, x.file)} onShare={() => share(x.file)} />
                ))}
              </ul>
              <div className="mt-2 flex items-start gap-3 px-1">
                <p className="flex-1 text-[0.75rem] text-mut">Bu telefonda saklanır. Sporcu kartında bir bilgiyi değiştirdiysen yeniden hazırla.</p>
                <button type="button" onClick={make} disabled={busy} className="h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
                  {busy ? "Hazırlanıyor…" : "Yenile"}
                </button>
              </div>
            </>
          )}

          <Label right={extras.length ? `${extras.length}` : ""}>EKLENEN EVRAK</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {extras.map((x) => (
              <FileRow
                key={x.id}
                tag={/pdf/.test(x.type) ? "PDF" : /image/.test(x.type) ? "FOTO" : "DOSYA"}
                title={x.name}
                sub={`${sizeText(x.blob.size)} · ${madeText(x.at)}`}
                onOpen={() => openFile(asFile(x), false)}
                onShare={() => shareFile(asFile(x))}
                onRemove={() => removeExtra(x)}
              />
            ))}
            <li>
              <button type="button" onClick={() => pickExtra.current?.click()} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                  <Icon name="plus" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold text-acc">Evrak ekle</b>
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

          <Label right={`${docs.length}/${DOCS.length} seçili`}>{file ? "BELGELERİ DEĞİŞTİR" : "BELGELER"}</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {DOCS.map(([k, label]) => {
              const on = docs.includes(k);
              const [icon, sub] = DOC_INFO[k];
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => (dropFile(), setDocs((d) => (on ? d.filter((x) => x !== k) : DOCS.map(([x]) => x).filter((x) => x === k || d.includes(x)))))}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg"
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                      <Icon name={icon} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className={`block text-[0.9375rem] font-semibold ${on ? "" : "text-mut"}`}>{label}</b>
                      <span className="block text-[0.8125rem] leading-snug text-mut">{k === "parent" && chosen.length ? `${chosen.length} sayfa · veli imzalar` : k === "club" && chosen.length ? `${chosen.length} sayfa · her sporcunun okuluna` : k === "hotel" && chosen.length ? `1 sayfa · ${chosen.length} veli imzalar` : sub}</span>
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
                  onClick={() => (dropFile(), setR((p) => ({ ...p, clubFrom: "", clubTo: "", clubEvent: "", clubPlace: "" })))}
                  className="mt-1 px-1 text-[0.8125rem] font-semibold text-acc"
                >
                  Yarışın tarih, ad ve yerine dön
                </button>
              )}
            </>
          )}

          {docs.includes("hotel") && (
            <>
              <Label>OTEL KONAKLAMA İZNİ</Label>
              <Group>
                <Row label="Otel adı">{field("hotelName", "Boş kalırsa elle yazılır")}</Row>
                <Pair>
                  <Row label="Giriş">{clubDate("hotelFrom", hotel.from)}</Row>
                  <Row label="Çıkış">{clubDate("hotelTo", hotel.to)}</Row>
                </Pair>
              </Group>
              {!r.hotelName.trim() && hotels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                  {hotels.map((n) => (
                    <button key={n} type="button" onClick={() => set("hotelName")(n)} className="rounded-full bg-acc/10 px-3 py-1 text-[0.8125rem] font-semibold text-acc">
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-2 px-1 text-[0.75rem] text-mut">Veli adı ve telefonu sporcu kartından gelir; eksikse tabloda boş kalır. Etkinlik adı, yer ve imzalayan kulüp izin yazısıyla aynı.</p>
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

        </>
      )}

      {/* Alt çubuk: belge hazırla → aç / paylaş */}
      <div data-pagebar="" className={`${tab === "budget" ? "hidden " : ""}fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6`}>
        <div className="mx-auto flex max-w-[26rem] gap-2">
          {file ? (
            <>
              <button type="button" onClick={() => openPdf(false)} className="flex h-12 items-center gap-1.5 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line">
                <Icon name="print" className="size-5" />
                Aç
              </button>
              {onMail && (
                <button type="button" onClick={() => setMailPick(true)} disabled={mailing} aria-label="Mail at" className="flex h-12 items-center gap-1.5 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line disabled:opacity-50">
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
