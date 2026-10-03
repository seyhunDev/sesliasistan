"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Hero, HeroLabel, Label, Seg, Stat, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { cleanCost, cleanEvent, howText, kindOf, newId, rangeText, tl, totals, UNITS } from "./eventModel";
import { InfoFields } from "./EventForm";
import { leftText } from "./EventList";

const input =
  "h-11 w-full min-w-0 rounded-xl border border-transparent bg-bg px-3 text-[0.9375rem] text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
const area =
  "min-h-[5.5rem] w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-[0.9375rem] text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";

function Check({ on, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 transition active:scale-90 ${on ? "bg-ok text-white ring-ok" : "ring-line"}`}>
      {on && <Icon name="check" className="size-3.5" />}
    </button>
  );
}
function Del({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:scale-90 active:bg-bg">
      <Icon name="x" className="size-4" />
    </button>
  );
}

// Tek etkinlik: Özet (değerlendirme, öneriler, bilgiler, not) · İhtiyaçlar · Bütçe · Yapılacaklar.
// Her değişiklik kısa bir beklemeden sonra kendiliğinden kaydedilir.
export function EventEditor({ start, onSave, onDelete, onPlan, onAiFill }) {
  const toast = useToast();
  const [ev, setEv] = useState(start);
  const [tab, setTab] = useState("sum");
  const [info, setInfo] = useState(null); // bilgileri düzenleme penceresi
  const [cost, setCost] = useState(null); // bütçe kalemi penceresi
  const [busy, setBusy] = useState("");
  const timer = useRef(null);
  const latest = useRef(ev);

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = null;
    return onSave(latest.current).catch(() => toast("Kaydedilemedi, bağlantını kontrol et"));
  };
  const change = (patch) => {
    const next = cleanEvent({ ...latest.current, ...patch });
    next.id = latest.current.id;
    latest.current = next;
    setEv(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };
  // Sayfadan çıkınca bekleyen değişiklik kaybolmasın
  useEffect(() => {
    const out = () => timer.current && flush();
    window.addEventListener("pagehide", out);
    return () => {
      window.removeEventListener("pagehide", out);
      out();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = totals(ev);
  const doneNeeds = ev.needs.filter((n) => n.done).length;
  const doneTodos = ev.todos.filter((n) => n.done).length;
  const [, kindLabel, kindIcon] = kindOf(ev.kind);

  const plan = async () => {
    setBusy("plan");
    try {
      if (await onPlan(ev)) {
        change({ planAdded: true });
        toast("Planlara eklendi");
      } else toast("Planlara eklenemedi");
    } finally {
      setBusy("");
    }
  };
  const fill = async () => {
    setBusy("ai");
    try {
      const p = await onAiFill(ev);
      const has = (list, title) => list.some((x) => x.title.toLocaleLowerCase("tr-TR") === title.toLocaleLowerCase("tr-TR"));
      change({
        summary: ev.summary || p.summary,
        tips: ev.tips.length ? ev.tips : p.tips,
        needs: [...ev.needs, ...p.needs.filter((x) => !has(ev.needs, x.title))],
        budget: [...ev.budget, ...p.budget.filter((x) => !has(ev.budget, x.title))],
        todos: [...ev.todos, ...p.todos.filter((x) => !has(ev.todos, x.title))],
      });
      toast("Öneriler eklendi");
    } catch (e) {
      toast(e?.message || "Hazırlanamadı");
    } finally {
      setBusy("");
    }
  };
  const remove = async () => {
    if (!window.confirm(`“${ev.title || "Etkinlik"}” silinsin mi? İhtiyaç listesi, bütçe ve yapılacaklar da silinir.`)) return;
    clearTimeout(timer.current);
    timer.current = null;
    setBusy("del");
    await onDelete(ev.id);
    setBusy("");
  };

  return (
    <>
      <Hero className="mt-2">
        <div className="flex items-center justify-between gap-3">
          <HeroLabel>{kindLabel.toLocaleUpperCase("tr-TR")}</HeroLabel>
          <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-white/80">
            <Icon name={kindIcon} className="size-4" />
            {leftText(ev)}
          </span>
        </div>
        <b className="mt-2 block text-[1.375rem] font-semibold leading-tight tracking-tight">{ev.title || "Adsız etkinlik"}</b>
        <span className="mt-0.5 block text-[0.8125rem] text-white/75">{[rangeText(ev.startDate, ev.endDate), ev.place, ev.people ? `${ev.people} kişi` : ""].filter(Boolean).join(" · ") || "Yer ve tarih belli değil"}</span>
        <div className="mt-3 flex gap-2">
          <Stat n={`${doneNeeds}/${ev.needs.length}`} label="İhtiyaç hazır" />
          <Stat n={t.total ? tl(t.total) : "—"} label={t.est ? "Tahmini bütçe" : "Bütçe"} />
          <Stat n={ev.people > 1 && t.total ? tl(t.perPerson) : `${doneTodos}/${ev.todos.length}`} label={ev.people > 1 && t.total ? "Kişi başı" : "İş tamam"} />
        </div>
      </Hero>

      <Seg
        value={tab}
        onChange={setTab}
        className="mt-4"
        options={[
          ["sum", "Özet"],
          ["needs", "İhtiyaç", ev.needs.length - doneNeeds],
          ["budget", "Bütçe"],
          ["todos", "İşler", ev.todos.length - doneTodos],
        ]}
      />

      {tab === "sum" && (
        <>
          {ev.summary ? (
            <>
              <Label>DEĞERLENDİRME</Label>
              <p className={`${card} whitespace-pre-line px-4 py-3.5 text-[0.9375rem] leading-relaxed`}>{ev.summary}</p>
            </>
          ) : (
            <div className={`${card} mt-4 px-4 py-4 text-center`}>
              <p className="text-[0.875rem] text-mut">İhtiyaç listesi, bütçe ve yapılacakları yapay zeka önersin mi? Yer ya da tarih boşsa genel bir değerlendirme yapılır.</p>
              <Button className="mt-3" onClick={fill} loading={busy === "ai"} disabled={!!busy}>
                <Icon name="zap" className="size-5" />
                Yapay zekayla hazırla
              </Button>
            </div>
          )}
          {ev.tips.length > 0 && (
            <>
              <Label>ÖNERİLER</Label>
              <ul className={`${card} divide-y divide-line/70`}>
                {ev.tips.map((x, i) => (
                  <li key={i} className="flex gap-2.5 px-4 py-3 text-[0.9375rem] leading-snug">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-acc" />
                    {x}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Label>NOT</Label>
          <textarea value={ev.note} onChange={(e) => change({ note: e.target.value })} maxLength={2000} className={area} placeholder="Kendi notların" />
          <div className="mt-4 space-y-2.5">
            <Button variant="ghost" onClick={() => setInfo({ ...ev })}>
              <Icon name="edit" className="size-[1.125rem]" />
              Bilgileri düzenle
            </Button>
            {ev.startDate && !ev.planAdded && (
              <Button variant="ghost" onClick={plan} loading={busy === "plan"} disabled={!!busy}>
                <Icon name="cal" className="size-[1.125rem]" />
                Planlara ekle
              </Button>
            )}
            {ev.summary && (
              <Button variant="ghost" onClick={fill} loading={busy === "ai"} disabled={!!busy}>
                <Icon name="zap" className="size-[1.125rem]" />
                Eksikleri yapay zekayla tamamla
              </Button>
            )}
            <button type="button" onClick={remove} disabled={!!busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-semibold text-rec active:scale-[.98] disabled:opacity-60">
              <Icon name="trash" className="size-[1.125rem]" />
              Etkinliği sil
            </button>
          </div>
        </>
      )}

      {tab === "needs" && <Needs ev={ev} change={change} />}
      {tab === "budget" && <Budget ev={ev} t={t} onEdit={setCost} />}
      {tab === "todos" && <Todos ev={ev} change={change} />}

      <Sheet open={!!info} onClose={() => setInfo(null)} title="Bilgiler">
        {info && (
          <div className="pb-2">
            <InfoFields v={info} set={setInfo} />
            <Button
              className="mt-4"
              disabled={!info.title.trim()}
              onClick={() => {
                change({ title: info.title, kind: info.kind, place: info.place, startDate: info.startDate, endDate: info.endDate, people: info.people });
                setInfo(null);
              }}
            >
              Kaydet
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!cost} onClose={() => setCost(null)} title={cost?.id ? "Bütçe kalemi" : "Yeni kalem"}>
        {cost && (
          <CostForm
            start={cost}
            people={ev.people}
            onSave={(c) => {
              const item = cleanCost({ ...c, est: false });
              change({ budget: c.id ? ev.budget.map((x) => (x.id === c.id ? item : x)) : [...ev.budget, item] });
              setCost(null);
            }}
            onDelete={
              cost.id
                ? () => {
                    change({ budget: ev.budget.filter((x) => x.id !== cost.id) });
                    setCost(null);
                  }
                : null
            }
          />
        )}
      </Sheet>
    </>
  );
}
function Needs({ ev, change }) {
  const cats = [...new Set(ev.needs.map((n) => n.cat))];
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("");
  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    change({ needs: [...ev.needs, { id: newId(), cat: cat.trim() || "Diğer", title, done: false }] });
    setTitle("");
  };
  const toggle = (id) => change({ needs: ev.needs.map((n) => (n.id === id ? { ...n, done: !n.done } : n)) });
  const del = (id) => change({ needs: ev.needs.filter((n) => n.id !== id) });

  return (
    <>
      <form onSubmit={add} className={`${card} mt-4 space-y-2 p-3`}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Ne lazım? (ör. uyku tulumu)" className={input} />
        <div className="flex gap-2">
          <input value={cat} onChange={(e) => setCat(e.target.value)} list="event-cats" maxLength={24} placeholder="Kategori" className={input} />
          <datalist id="event-cats">
            {cats.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="submit" disabled={!title.trim()} className="h-11 shrink-0 rounded-xl bg-acc px-4 text-[0.9375rem] font-semibold text-white active:scale-95 disabled:opacity-50">
            Ekle
          </button>
        </div>
      </form>
      {!ev.needs.length && <p className="mt-6 text-center text-[0.875rem] text-mut">İhtiyaç listesi boş.</p>}
      {cats.map((c) => {
        const list = ev.needs.filter((n) => n.cat === c);
        return (
          <div key={c}>
            <Label right={`${list.filter((n) => n.done).length}/${list.length}`}>{c.toLocaleUpperCase("tr-TR")}</Label>
            <ul className={`${card} divide-y divide-line/70`}>
              {list.map((n) => (
                <li key={n.id} className="flex items-center gap-3 py-1.5 pl-4 pr-2">
                  <Check on={n.done} onClick={() => toggle(n.id)} label={n.done ? "Hazır değil yap" : "Hazır"} />
                  <span className={`min-w-0 flex-1 text-[0.9375rem] ${n.done ? "text-mut line-through" : ""}`}>{n.title}</span>
                  <Del onClick={() => del(n.id)} label={`${n.title} sil`} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function Budget({ ev, t, onEdit }) {
  return (
    <>
      <div className={`${card} mt-4 flex gap-3 px-4 py-3.5`}>
        <span className="min-w-0 flex-1">
          <small className="block text-[0.75rem] text-mut">{t.est ? "Toplam (tahmini)" : "Toplam"}</small>
          <b className="block text-[1.25rem] font-semibold tabular-nums">{tl(t.total)}</b>
        </span>
        <span className="min-w-0 flex-1">
          <small className="block text-[0.75rem] text-mut">Kişi başı · {t.people} kişi</small>
          <b className="block text-[1.25rem] font-semibold tabular-nums">{tl(t.perPerson)}</b>
        </span>
      </div>
      {!ev.people && <p className="mt-2 px-1 text-[0.75rem] text-mut">Kişi sayısı girilmedi; hesap 1 kişiye göre. Özet › Bilgileri düzenle’den girebilirsin.</p>}
      {t.lines.length > 0 && (
        <>
          <Label right={t.lines.length}>KALEMLER</Label>
          <ul className={`${card} divide-y divide-line/70`}>
            {t.lines.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => onEdit({ ...l })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">
                      {l.title}
                      {l.est && <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-amber-700">tahmini</span>}
                      {!l.amount && <span className="ml-1.5 rounded-full bg-rec/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rec">tutar gir</span>}
                    </b>
                    <small className="block truncate text-[0.75rem] text-mut">{howText(l, ev.people)}</small>
                  </span>
                  <b className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{tl(l.total)}</b>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <Button variant="ghost" className="mt-4" onClick={() => onEdit({ title: "", amount: 0, unit: "person", qty: 1 })}>
        <Icon name="plus" className="size-[1.125rem]" />
        Kalem ekle
      </Button>
    </>
  );
}

function CostForm({ start, people, onSave, onDelete }) {
  const [c, setC] = useState(start);
  return (
    <div className="space-y-3.5 pb-2">
      <Field label="Ne için" value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} maxLength={80} placeholder="Kamp alanı ücreti" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tutar (₺)" type="number" inputMode="decimal" min={0} value={c.amount || ""} onChange={(e) => setC({ ...c, amount: Number(e.target.value) || 0 })} placeholder="0" />
        <Field label="Adet / gün" type="number" inputMode="numeric" min={1} max={365} value={c.qty || ""} onChange={(e) => setC({ ...c, qty: Math.max(1, parseInt(e.target.value, 10) || 1) })} placeholder="1" />
      </div>
      <Seg value={c.unit} onChange={(unit) => setC({ ...c, unit })} options={UNITS} />
      <p className="px-1 text-[0.75rem] text-mut">{c.unit === "person" ? `Tutar ${Math.max(1, people || 0)} kişiyle çarpılır.` : "Toplam tutar, herkese bölünür."}</p>
      <Button onClick={() => onSave(c)} disabled={!c.title.trim()}>
        Kaydet
      </Button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-semibold text-rec active:scale-[.98]">
          <Icon name="trash" className="size-[1.125rem]" />
          Kalemi sil
        </button>
      )}
    </div>
  );
}

function Todos({ ev, change }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    change({ todos: [...ev.todos, { id: newId(), title, date, done: false }] });
    setTitle("");
    setDate("");
  };
  const list = [...ev.todos].sort((a, b) => a.done - b.done || (a.date || "9").localeCompare(b.date || "9"));
  const toggle = (id) => change({ todos: ev.todos.map((n) => (n.id === id ? { ...n, done: !n.done } : n)) });
  const del = (id) => change({ todos: ev.todos.filter((n) => n.id !== id) });
  const short = (s) => new Date(`${s}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

  return (
    <>
      <form onSubmit={add} className={`${card} mt-4 space-y-2 p-3`}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Yapılacak iş (ör. kamp yerini ayırt)" className={input} />
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Son tarih" className={input} />
          <button type="submit" disabled={!title.trim()} className="h-11 shrink-0 rounded-xl bg-acc px-4 text-[0.9375rem] font-semibold text-white active:scale-95 disabled:opacity-50">
            Ekle
          </button>
        </div>
      </form>
      {!list.length ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Yapılacak iş yok.</p>
      ) : (
        <ul className={`${card} mt-4 divide-y divide-line/70`}>
          {list.map((n) => (
            <li key={n.id} className="flex items-center gap-3 py-1.5 pl-4 pr-2">
              <Check on={n.done} onClick={() => toggle(n.id)} label={n.done ? "Yapılmadı yap" : "Yapıldı"} />
              <span className={`min-w-0 flex-1 text-[0.9375rem] ${n.done ? "text-mut line-through" : ""}`}>{n.title}</span>
              {n.date && <span className="shrink-0 text-[0.75rem] tabular-nums text-mut">{short(n.date)}</span>}
              <Del onClick={() => del(n.id)} label={`${n.title} sil`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
