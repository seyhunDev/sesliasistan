"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { Empty, Hero, HeroLabel, Label, Seg, Stat, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { input } from "@/features/inventory/ItemForm";
import { todayStr } from "@/lib/utils/format";
import { STATE, TL, amountText, cleanIban, payText, shortDay, stateOf, summaryOf, taskDone } from "@/lib/invoices";
import { bankCheck, createInvoice, deleteInvoice, ensureTask, loadInvoices, openInvoiceFile, prepFile, readInvoice, replaceFile, setPaid, shareInvoiceFile, syncIndex, updateInvoice } from "./invoiceData";

const lab = "block text-[0.75rem] font-medium text-mut";
const dateFix = "appearance-none [&::-webkit-date-and-time-value]:text-left";
const TONE = { paid: "bg-ok/10 text-ok", late: "bg-rec/10 text-rec", open: "bg-proc/15 text-fg" };
const blank = () => ({ seller: "", no: "", date: todayStr(), due: "", amount: "", currency: "TL", iban: "", taxId: "", desc: "", note: "" });
const toNum = (v) => {
  const s = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const n = Number(s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
// Formdaki metin alanlarından kayda yazılacak alanlar
const fieldsOf = (f) => ({
  seller: f.seller.trim().slice(0, 120),
  no: f.no.trim().slice(0, 40),
  date: f.date || "",
  due: f.due || "",
  amount: toNum(f.amount),
  currency: f.currency || "TL",
  iban: cleanIban(f.iban) || f.iban.trim().slice(0, 40),
  taxId: String(f.taxId || "").replace(/\D/g, "").slice(0, 11),
  desc: f.desc.trim().slice(0, 80),
  note: f.note.trim().slice(0, 500),
});
const formOf = (inv) => ({ ...blank(), ...inv, amount: inv.amount ? String(inv.amount).replace(".", ",") : "" });

// Faturaların verisi ve pencereleri (yükleme, ayrıntı); Fişler ve faturalar sayfası kullanır, orgId yoksa (çalışan) boş kalır
export function useInvoiceDesk(orgId) {
  const toast = useToast();
  const { profile } = useAuth();
  const { tasks, members = [], updateRecord, nameOf } = useData();
  const me = useMemo(() => ({ uid: profile?.uid, name: profile?.name || "" }), [profile?.uid, profile?.name]);
  const today = todayStr();
  const [list, setList] = useState(null);
  const [add, setAdd] = useState(null); // { form, prepared, reading, assignee }
  const [openId, setOpenId] = useState("");
  const [checking, setChecking] = useState(false);
  const [guesses, setGuesses] = useState([]);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);

  const reload = useCallback(
    (fresh = false) =>
      orgId &&
      loadInvoices(orgId, { fresh }).then(
        (l) => setList(l),
        () => (setList((p) => p || []), toast("Faturalar okunamadı")),
      ),
    [orgId, toast],
  );
  useEffect(() => {
    if (!orgId) return;
    reload();
    const on = () => reload(true);
    window.addEventListener("sa-invoices-saved", on);
    return () => window.removeEventListener("sa-invoices-saved", on);
  }, [reload, orgId]);
  // Sunucunun baktığı açık fatura listesi bu cihazda bir kez tazelenir (eski kayıtlar için)
  const synced = useRef(false);
  useEffect(() => {
    if (orgId && list && !synced.current) {
      synced.current = true;
      syncIndex(orgId, list);
    }
  }, [list, orgId]);

  // Görevli görevi tamamladıysa fatura ödendi olur
  const busy = useRef(new Set());
  useEffect(() => {
    if (!list) return;
    for (const inv of list) {
      if (inv.status === "paid" || !inv.taskId || busy.current.has(inv.id)) continue;
      const t = tasks.find((x) => x.id === inv.taskId);
      if (!taskDone(t)) continue;
      busy.current.add(inv.id);
      setPaid(orgId, inv, true, "task").then((next) => setList((p) => p.map((x) => (x.id === next.id ? next : x))), () => busy.current.delete(inv.id));
    }
  }, [list, tasks, orgId]);

  const replace = (next) => setList((p) => p.map((x) => (x.id === next.id ? next : x)));
  const sum = useMemo(() => summaryOf(list || [], today), [list, today]);
  const current = (list || []).find((x) => x.id === openId) || null;
  const taskOf = (inv) => tasks.find((t) => t.id === inv?.taskId);
  const whoOf = (inv) => (taskOf(inv)?.assignees || []).map((u) => nameOf?.(u)).filter(Boolean).join(", ");

  const pick = () => fileRef.current?.click();

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let prepared;
    try {
      prepared = await prepFile(file);
    } catch (err) {
      return toast(err.message || "Dosya okunamadı");
    }
    setAdd({ form: blank(), prepared, reading: true, assignee: "" });
    try {
      const r = await readInvoice(prepared);
      setAdd((a) => a && { ...a, reading: false, form: formOf({ ...blank(), ...r }) });
    } catch (err) {
      setAdd((a) => a && { ...a, reading: false, error: `${err.message} Bilgileri elle yazabilirsin.` });
    }
  }

  const [saving, setSaving] = useState(false);
  async function save() {
    const f = fieldsOf(add.form);
    if (!f.seller) return toast("Firma adını yaz");
    if (!f.amount) return toast("Tutarı yaz");
    setSaving(true);
    try {
      const inv = await createInvoice(orgId, f, add.prepared, me, add.assignee);
      setList((p) => [inv, ...(p || []).filter((x) => x.id !== inv.id)]);
      setAdd(null);
      toast(add.assignee ? `Kaydedildi, ${nameOf?.(add.assignee) || "görevliye"} bildirim gitti` : "Kaydedildi, görevlere de eklendi");
    } catch (err) {
      toast(err.message || "Kaydedilemedi");
    }
    setSaving(false);
  }

  async function check() {
    setChecking(true);
    try {
      const r = await bankCheck(orgId, list || []);
      r.paid.forEach(replace);
      setGuesses(r.guesses);
      toast(
        !r.sources
          ? "Banka maili bulunamadı (Gmail betiği kurulu mu?)"
          : r.paid.length
            ? `${r.paid.length} fatura bankada ödenmiş görünüyor, ödendi yazıldı`
            : r.guesses.length
              ? "Kesin eşleşme yok, aşağıdaki önerilere bak"
              : "Bankada açık faturalara uyan ödeme bulunamadı",
      );
    } catch (err) {
      toast(err.message || "Banka hareketleri okunamadı");
    }
    setChecking(false);
  }

  async function confirmGuess(g, ok) {
    setGuesses((p) => p.filter((x) => x !== g));
    if (!ok) return;
    try {
      replace(await setPaid(orgId, g.inv, true, "bank", g.m));
      toast("Ödendi olarak işaretlendi");
    } catch {
      toast("Kaydedilemedi");
    }
  }

  const sheets = (
    <>
      <input ref={fileRef} type="file" accept="application/pdf,image/*" hidden onChange={onFile} />
      {/* Yeni fatura: okunan bilgiler, görevli */}
      <Sheet open={!!add} onClose={() => !saving && setAdd(null)} title="Yeni fatura">
        {add && (
          <div className="pb-4">
            {add.reading ? (
              <div className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-4 text-[0.875rem]">
                <Icon name="load" className="size-5 animate-spin text-acc" /> Fatura okunuyor…
              </div>
            ) : (
              <>
                {add.error && <p className="mb-3 rounded-xl bg-rec/10 px-3 py-2 text-[0.8125rem] text-rec">{add.error}</p>}
                <InvoiceForm form={add.form} set={(form) => setAdd((a) => ({ ...a, form }))} />
                <Assignee members={members} value={add.assignee} onChange={(assignee) => setAdd((a) => ({ ...a, assignee }))} />
                <p className="mt-2 text-[0.75rem] leading-snug text-mut">Görevlere &quot;Fatura öde&quot; olarak eklenir. Görevli seçersen ona tutar, son gün ve IBAN ile bildirim gider; sonra da seçebilirsin.</p>
                <Button className="mt-4" onClick={save} loading={saving}>
                  Kaydet
                </Button>
              </>
            )}
          </div>
        )}
      </Sheet>

      {/* Fatura ayrıntısı */}
      <Sheet open={!!current} onClose={() => setOpenId("")} title={current?.seller || "Fatura"}>
        {current && (
          <Detail
            key={current.id}
            inv={current}
            orgId={orgId}
            me={me}
            task={taskOf(current)}
            members={members}
            today={today}
            onChange={replace}
            onAssign={async (uid) => {
              let inv = current;
              if (!taskOf(inv)) inv = await ensureTask(orgId, inv, me).then((n) => (replace(n), n));
              await updateRecord("task", inv.taskId, { assignees: uid ? [uid] : [] }, { name: me.name });
              toast(uid ? `${nameOf?.(uid) || "Görevliye"} bildirim gitti` : "Görevli kaldırıldı");
            }}
            onReplaceFile={() => replaceRef.current?.click()}
            onDelete={async () => {
              if (!confirm("Fatura, dosyası ve görevi silinsin mi?")) return;
              await deleteInvoice(orgId, current).catch(() => toast("Silinemedi"));
              setList((p) => p.filter((x) => x.id !== current.id));
              setOpenId("");
            }}
          />
        )}
        <input
          ref={replaceRef}
          type="file"
          accept="application/pdf,image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !current) return;
            try {
              replace(await replaceFile(orgId, current, await prepFile(file)));
              toast("Dosya eklendi");
            } catch (err) {
              toast(err.message || "Dosya eklenemedi");
            }
          }}
        />
      </Sheet>
    </>
  );
  return { list, sum, today, pick, check, checking, guesses, confirmGuess, open: setOpenId, whoOf, sheets };
}

// Faturalar seçiliyken: ödenmemiş toplam, yükle / bankada kontrol, olası ödemeler, liste
export function InvoicePanel({ desk }) {
  const { list, sum, pick, check, checking, guesses, confirmGuess } = desk;
  const [tab, setTab] = useState("open");
  const shown = useMemo(() => (list || []).filter((x) => (tab === "all" ? true : tab === "paid" ? x.status === "paid" : x.status !== "paid")), [list, tab]);
  return (
    <>
      <Hero className="mt-3">
        <HeroLabel>ÖDENMEMİŞ</HeroLabel>
        <div className="mt-1 text-[1.75rem] font-bold leading-tight tabular-nums">{TL(sum.sum)}</div>
        <div className="mt-3 flex gap-2">
          <Stat n={sum.open} label="Ödenmedi" />
          <Stat n={sum.late} label="Son günü geçti" tone={sum.late ? "rec" : ""} />
        </div>
      </Hero>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={pick} className={`${card} flex h-12 items-center justify-center gap-2 text-[0.9375rem] font-semibold text-acc active:scale-[.98]`}>
          <Icon name="plus" className="size-5" /> Fatura yükle
        </button>
        <button onClick={check} disabled={checking || !sum.open} className={`${card} flex h-12 items-center justify-center gap-2 text-[0.9375rem] font-semibold disabled:opacity-50 active:scale-[.98]`}>
          <Icon name={checking ? "load" : "wallet"} className={`size-5 ${checking ? "animate-spin" : ""}`} /> Bankada kontrol et
        </button>
      </div>

      {guesses.length > 0 && (
        <>
          <Label right={guesses.length}>BANKADA OLASI ÖDEMELER</Label>
          <div className="space-y-2">
            {guesses.map((g) => (
              <div key={`${g.inv.id}${g.m.date}`} className={`${card} p-4`}>
                <p className="text-[0.875rem] leading-snug">
                  <b className="font-semibold">{g.inv.seller}</b> · {amountText(g.inv)}
                </p>
                <p className="mt-1 text-[0.8125rem] leading-snug text-mut">
                  {g.m.date} · {g.m.desc}
                </p>
                <p className="mt-0.5 text-[0.75rem] text-mut">Tutar ve tarih tutuyor, açıklamada firma adı yok.</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => confirmGuess(g, true)} className="h-10 flex-1 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98]">
                    Bu ödeme, ödendi
                  </button>
                  <button onClick={() => confirmGuess(g, false)} className="h-10 flex-1 rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98]">
                    Değil
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Seg
        className="mt-5"
        value={tab}
        onChange={setTab}
        options={[
          ["open", "Ödenmedi", sum.open],
          ["paid", "Ödendi", (list || []).length - sum.open],
          ["all", "Tümü"],
        ]}
      />

      {!list ? (
        <Loading />
      ) : !shown.length ? (
        <Empty icon="receipt" title={list.length ? "Bu listede fatura yok" : "Henüz fatura yok"} sub={list.length ? "" : "Faturanın PDF'ini ya da fotoğrafını yükle; firma, tutar ve son gün kendiliğinden okunur, görevlere de eklenir."} />
      ) : (
        <div className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          {shown.map((inv) => (
            <InvoiceRow key={inv.id} inv={inv} desk={desk} />
          ))}
        </div>
      )}
    </>
  );
}

// Listede bir fatura: firma, son gün/ödendi, görevli, tutar ve durum; badge "Fatura" işareti (karışık listede)
export function InvoiceRow({ inv, desk, badge }) {
  const st = stateOf(inv, desk.today);
  const who = desk.whoOf(inv);
  return (
    <button onClick={() => desk.open(inv.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
      <span className={`grid size-9 shrink-0 place-items-center rounded-[0.625rem] ${st === "paid" ? "bg-bg text-fg" : st === "late" ? "bg-rec/10 text-rec" : "bg-proc/20 text-fg"}`}>
        <Icon name="receipt" className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">
          {badge && <span className="mr-1.5 rounded-md bg-proc/20 px-1.5 py-0.5 align-[1px] text-[0.6875rem] font-bold uppercase tracking-wide text-fg">Fatura</span>}
          {inv.seller || "Fatura"}
        </b>
        <span className="block truncate text-[0.8125rem] text-mut">
          {[st === "paid" ? inv.paidAt && `Ödendi ${shortDay(inv.paidAt)}` : inv.due && `Son gün ${shortDay(inv.due)}`, who ? `Görevli: ${who}` : st !== "paid" && "Görevli yok", inv.desc].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <b className="block text-[0.9375rem] font-semibold tabular-nums">{amountText(inv)}</b>
        <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${TONE[st]}`}>{STATE[st]}</span>
      </span>
    </button>
  );
}


function InvoiceForm({ form, set }) {
  const f = (k) => ({ value: form[k] ?? "", onChange: (e) => set({ ...form, [k]: e.target.value }) });
  return (
    <div className="space-y-3">
      <label className={lab}>
        Firma
        <input {...f("seller")} maxLength={120} className={`mt-1.5 ${input}`} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={lab}>
          Tutar ({form.currency || "TL"})
          <input {...f("amount")} inputMode="decimal" placeholder="0,00" className={`mt-1.5 ${input} tabular-nums`} />
        </label>
        <label className={lab}>
          Fatura no
          <input {...f("no")} maxLength={40} className={`mt-1.5 ${input}`} />
        </label>
        <label className={lab}>
          Fatura tarihi
          <input type="date" {...f("date")} className={`mt-1.5 ${input} ${dateFix}`} />
        </label>
        <label className={lab}>
          Son ödeme
          <input type="date" {...f("due")} className={`mt-1.5 ${input} ${dateFix}`} />
        </label>
      </div>
      <label className={lab}>
        IBAN
        <input {...f("iban")} maxLength={40} placeholder="TR.." className={`mt-1.5 ${input} tabular-nums`} />
      </label>
      <label className={lab}>
        Ne için
        <input {...f("desc")} maxLength={80} className={`mt-1.5 ${input}`} />
      </label>
      <label className={lab}>
        Not
        <input {...f("note")} maxLength={500} className={`mt-1.5 ${input}`} />
      </label>
    </div>
  );
}

function Assignee({ members, value, onChange }) {
  return (
    <label className={`${lab} mt-3`}>
      Görevli (ödemeyi yapacak kişi)
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className={`mt-1.5 ${input}`}>
        <option value="">Şimdilik yok</option>
        {members.map((m) => (
          <option key={m.uid} value={m.uid}>
            {m.name || m.email}
          </option>
        ))}
      </select>
    </label>
  );
}

function Detail({ inv, orgId, task, members, today, onChange, onAssign, onReplaceFile, onDelete }) {
  const toast = useToast();
  const [form, setForm] = useState(() => formOf(inv));
  const [busy, setBusy] = useState("");
  const st = stateOf(inv, today);
  const dirty = JSON.stringify(fieldsOf(form)) !== JSON.stringify(fieldsOf(formOf(inv)));
  const run = async (k, fn) => {
    setBusy(k);
    try {
      await fn();
    } catch (e) {
      toast(e?.message || "Yapılamadı");
    }
    setBusy("");
  };
  const paidInfo =
    inv.status === "paid" &&
    [inv.paidAt && shortDay(inv.paidAt), { bank: "bankadan görüldü", hand: "elle işaretlendi", task: "görevli tamamladı" }[inv.paidVia]].filter(Boolean).join(" · ");
  return (
    <div className="pb-4">
      <div className={`rounded-2xl px-4 py-3 ${st === "paid" ? "bg-ok/10" : st === "late" ? "bg-rec/10" : "bg-bg"}`}>
        <div className="flex items-baseline justify-between gap-3">
          <b className="text-[1.375rem] font-bold tabular-nums">{amountText(inv)}</b>
          <span className={`text-[0.8125rem] font-semibold ${st === "paid" ? "text-ok" : st === "late" ? "text-rec" : ""}`}>{STATE[st]}</span>
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-mut">{paidInfo || (inv.due ? `Son ödeme ${shortDay(inv.due)}` : "Son ödeme tarihi yok")}</p>
        {inv.paidMov?.desc && <p className="mt-1 text-[0.75rem] leading-snug text-mut">Banka: {inv.paidMov.date} · {inv.paidMov.desc}</p>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {inv.status === "paid" ? (
          <Button variant="ghost" loading={busy === "pay"} onClick={() => run("pay", async () => (onChange(await setPaid(orgId, inv, false)), toast("Ödenmedi olarak işaretlendi")))}>
            Ödenmedi yap
          </Button>
        ) : (
          <Button loading={busy === "pay"} onClick={() => run("pay", async () => (onChange(await setPaid(orgId, inv, true, "hand")), toast("Ödendi, görev de tamamlandı")))}>
            Ödendi
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(payText(inv)).then(() => toast("Ödeme bilgisi kopyalandı"), () => toast("Kopyalanamadı"))}>
          <Icon name="copy" className="size-4" /> Kopyala
        </Button>
      </div>

      {inv.file ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="ghost" loading={busy === "open"} onClick={() => run("open", () => openInvoiceFile(orgId, inv.file))}>
            <Icon name="note" className="size-4" /> Faturayı aç
          </Button>
          <Button variant="ghost" loading={busy === "share"} onClick={() => run("share", () => shareInvoiceFile(orgId, inv.file).catch((e) => e?.name !== "AbortError" && Promise.reject(e)))}>
            <Icon name="share" className="size-4" /> Paylaş
          </Button>
        </div>
      ) : (
        <Button variant="ghost" className="mt-2" onClick={onReplaceFile}>
          <Icon name="paperclip" className="size-4" /> Dosya ekle
        </Button>
      )}

      <Assignee members={members} value={task?.assignees?.[0] || ""} onChange={(uid) => run("who", () => onAssign(uid))} />
      {!task && inv.taskId && <p className="mt-1 text-[0.75rem] text-mut">Görevi silinmiş; görevli seçince yeniden açılır.</p>}

      <div className="mt-4">
        <InvoiceForm form={form} set={setForm} />
      </div>
      {dirty && (
        <Button className="mt-3" loading={busy === "save"} onClick={() => run("save", async () => (onChange(await updateInvoice(orgId, inv, fieldsOf(form))), toast("Kaydedildi")))}>
          Değişiklikleri kaydet
        </Button>
      )}
      <div className="mt-4 flex gap-2">
        {inv.file && (
          <button onClick={onReplaceFile} className="h-10 flex-1 rounded-xl bg-bg text-[0.8125rem] font-semibold active:scale-[.98]">
            Dosyayı değiştir
          </button>
        )}
        <button onClick={onDelete} className="h-10 flex-1 rounded-xl bg-rec/10 text-[0.8125rem] font-semibold text-rec active:scale-[.98]">
          Faturayı sil
        </button>
      </div>
    </div>
  );
}
