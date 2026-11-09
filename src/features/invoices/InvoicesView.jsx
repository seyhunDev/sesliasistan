"use client";

import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { Empty, card } from "@/components/ui/Page";
import { ListHead } from "@/components/ui/Row";
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
  const confirmAsk = useConfirm();
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
  const camRef = useRef(null);
  const photoRef = useRef(null);
  const [choose, setChoose] = useState(false); // Fatura ekle: fotoğraf çek / fotoğraf seç / PDF
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

  const pick = () => setChoose(true);
  const from = (ref) => {
    setChoose(false);
    ref.current?.click();
  };

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
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={onFile} />
      <Sheet open={choose} onClose={() => setChoose(false)} title="Fatura ekle">
        <div className="space-y-2 pb-4">
          {[
            [camRef, "camera", "Fotoğrafını çek", "Kâğıt faturayı kamerayla çek"],
            [photoRef, "image", "Fotoğraflardan seç", "Ekran görüntüsü ya da kayıtlı fotoğraf"],
            [fileRef, "paperclip", "PDF ya da dosya seç", "Mailden gelen e-fatura PDF'i"],
          ].map(([ref, icon, title, sub]) => (
            <button key={title} onClick={() => from(ref)} className={`${card} flex w-full items-center gap-3 px-4 py-3 text-left active:scale-[.98]`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
                <Icon name={icon} className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold">{title}</b>
                <small className="block text-[0.8125rem] text-mut">{sub}</small>
              </span>
            </button>
          ))}
        </div>
      </Sheet>
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
              if (!(await confirmAsk({ title: "Fatura silinsin mi?", text: "Dosyası ve görevi de silinir." }))) return;
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

// Faturalar seçiliyken açık alan (yeni tasarım, 2026-11-03): tutar, Fatura ekle / Bankada kontrol ve Ödenmedi · Ödendi · Tümü lacivert üstte
// (ReceiptBook); burada bankada olası ödemeler ve liste. tab: open | paid | all
export function InvoicePanel({ desk, tab = "open" }) {
  const { list, guesses, confirmGuess } = desk;
  const shown = useMemo(() => (list || []).filter((x) => (tab === "all" ? true : tab === "paid" ? x.status === "paid" : x.status !== "paid")), [list, tab]);
  return (
    <>
      {guesses.length > 0 && (
        <section>
          <ListHead title="Bankada olası ödemeler" count={guesses.length} />
          <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
            {guesses.map((g) => (
              <div key={`${g.inv.id}${g.m.date}`} className="px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{g.inv.seller}</b>
                  <b className="shrink-0 text-[0.9375rem] font-bold tabular-nums">{amountText(g.inv)}</b>
                </div>
                <p className="truncate text-[0.8125rem] text-mut">
                  {g.m.date} · {g.m.desc}
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => confirmGuess(g, false)} data-press className="btn btn-secondary btn-sm h-10 flex-1">
                    Değil
                  </button>
                  <button onClick={() => confirmGuess(g, true)} data-press className="btn btn-primary btn-sm h-10 flex-1">
                    Ödendi
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!list ? (
        <Loading />
      ) : !shown.length ? (
        <Empty icon="receipt" title={list.length ? "Bu listede fatura yok" : "Henüz fatura yok"} />
      ) : (
        <section>
          <ListHead title={{ open: "Ödenmedi", paid: "Ödendi", all: "Faturalar" }[tab] || "Faturalar"} count={shown.length} />
          <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
            {shown.map((inv) => (
              <InvoiceRow key={inv.id} inv={inv} desk={desk} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// Listede bir fatura (yeni tasarım, 2026-11-03): solda durum çizgisi, firma, altında son gün/ödendi ve görevli, sağda tutar ve durum;
// badge: karışık listede alt satırın başında "Fatura"
const BAR = { paid: "bg-ok", late: "bg-rec", open: "bg-acc" };
const STATE_TX = { paid: "text-ok", late: "text-rec", open: "text-mut" };
export function InvoiceRow({ inv, desk, badge }) {
  const st = stateOf(inv, desk.today);
  const who = desk.whoOf(inv);
  return (
    <button onClick={() => desk.open(inv.id)} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 bg-card px-3.5 py-2.5 text-left">
      <span className={`w-[3px] self-stretch rounded-full ${BAR[st] || "bg-line"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{inv.seller || "Fatura"}</b>
        <small className="block truncate text-[0.8125rem] text-mut">
          {[badge && "Fatura", st === "paid" ? inv.paidAt && `Ödendi ${shortDay(inv.paidAt)}` : inv.due && `Son gün ${shortDay(inv.due)}`, who ? `Görevli: ${who}` : st !== "paid" && "Görevli yok", inv.desc].filter(Boolean).join(" · ")}
        </small>
      </span>
      <span className="shrink-0 text-right">
        <b className="block text-[0.9375rem] font-bold tabular-nums">{amountText(inv)}</b>
        <small className={`block text-[0.75rem] font-semibold ${STATE_TX[st] || "text-mut"}`}>{STATE[st]}</small>
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
    [inv.paidAt && shortDay(inv.paidAt), { bank: "bankadan görüldü", hand: "elle işaretlendi", task: "görevli tamamladı", cash: "nakit · kasadan düştü" }[inv.paidVia]].filter(Boolean).join(" · ");
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
          <Button variant="ghost" loading={busy === "pay"} onClick={() => run("pay", async () => (onChange(await setPaid(orgId, inv, false)), toast(inv.paidVia === "cash" ? "Ödenmedi yapıldı, kasaya geri eklendi" : "Ödenmedi olarak işaretlendi")))}>
            Ödenmedi yap
          </Button>
        ) : (
          <>
            <Button loading={busy === "pay"} onClick={() => run("pay", async () => (onChange(await setPaid(orgId, inv, true, "hand")), toast("Ödendi (EFT), görev de tamamlandı")))}>
              Ödendi (EFT)
            </Button>
            <Button variant="ghost" loading={busy === "cash"} onClick={() => run("cash", async () => (onChange(await setPaid(orgId, inv, true, "cash")), toast("Nakit ödendi, kasadan düştü")))}>
              Nakit ödendi
            </Button>
          </>
        )}
        <Button variant="ghost" className={inv.status === "paid" ? "" : "col-span-2"} onClick={() => navigator.clipboard?.writeText(payText(inv)).then(() => toast("Ödeme bilgisi kopyalandı"), () => toast("Kopyalanamadı"))}>
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
          <button onClick={onReplaceFile} data-press className="btn btn-secondary btn-sm h-10 flex-1">
            Dosyayı değiştir
          </button>
        )}
        <button onClick={onDelete} data-press className="btn btn-danger btn-sm h-10 flex-1">
          Faturayı sil
        </button>
      </div>
    </div>
  );
}
