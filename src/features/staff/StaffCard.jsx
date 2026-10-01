"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { authFetch } from "@/lib/authFetch";
import { assigneesOf } from "@/lib/people";
import { isUpcoming, rel } from "@/lib/utils/format";

const ONLINE_MS = 6 * 60e3; // bu süreden yakın görüldüyse "çevrimiçi"

// Firestore zaman damgası ya da ISO metin → Date
const toDate = (v) => (!v ? null : typeof v.toDate === "function" ? v.toDate() : new Date(v));

// "Çevrimiçi", "12 dk önce", "Bugün 14:20", "Dün 18:05", "12 Eylül 09:30"
export function seenText(v, now = Date.now()) {
  const d = toDate(v);
  if (!d || isNaN(d)) return "Henüz görülmedi";
  const diff = now - d.getTime();
  if (diff < ONLINE_MS) return "Çevrimiçi";
  if (diff < 60 * 60e3) return `${Math.round(diff / 60e3)} dk önce görüldü`;
  const hm = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const day = (x) => new Date(x).toDateString();
  if (day(d) === day(now)) return `Bugün ${hm} görüldü`;
  if (day(d) === day(now - 864e5)) return `Dün ${hm} görüldü`;
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} ${hm} görüldü`;
}

// Çalışanın sorumlu olduğu (ya da eklediği) açık işler
function workOf(uid, { plans, tasks, notes }) {
  const his = (r) => r.createdByUid === uid || assigneesOf(r).includes(uid);
  return {
    tasks: tasks.filter((t) => !t.done && his(t)).sort((a, b) => (a.due || "9").localeCompare(b.due || "9")),
    plans: plans.filter((p) => isUpcoming(p) && his(p)).sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`)),
    notes: notes.filter(his),
  };
}

async function call(method, body) {
  const res = await authFetch("/api/staff", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "İşlem yapılamadı");
  return data;
}

// Ana hesap: çalışan hesabı ekler / kaldırır. Çalışan yalnızca kendi eklediği ve kendisine atanan kayıtları görür.
// page: Çalışanlar sayfasında (başlık sayfada; liste boşsa ekleme formu açık gelir)
export function StaffCard({ page = false }) {
  const { members, plans, tasks, notes } = useData();
  const toast = useToast();
  const [form, setForm] = useState(() => (page && !members.length ? { name: "", email: "", password: "" } : null)); // { name, email, password } | null
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(""); // kaldırma onayı bekleyen çalışan
  const [openId, setOpenId] = useState(""); // ayrıntısı açık çalışan
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60e3); // "dk önce" yazısı güncel kalsın
    return () => clearInterval(t);
  }, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await call("POST", form);
      toast(`${form.name} eklendi`);
      setForm(null);
    } catch (err) {
      toast(err.message);
    }
    setBusy(false);
  }

  async function remove(m) {
    if (armed !== m.uid) {
      setArmed(m.uid);
      setTimeout(() => setArmed(""), 3000);
      return;
    }
    setBusy(true);
    try {
      await call("DELETE", { uid: m.uid });
      toast(`${m.name} kaldırıldı`);
    } catch (err) {
      toast(err.message);
    }
    setBusy(false);
    setArmed("");
  }

  return (
    <div className={page ? "" : "mt-4 rounded-xl bg-bg p-3.5"}>
      {!page && <b className="block text-[0.9375rem] font-medium">Kişiler</b>}
      <small className="block text-[0.8125rem] leading-snug text-mut">
        Eklediğin kişi (ekip arkadaşı ya da aile üyesi) kendi hesabıyla girer; yalnızca kendi eklediklerini ve sorumlu olduğu kayıtları görür.{members.length ? " Ayrıntı için dokun." : ""}
      </small>

      {members.length > 0 && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl bg-card">
          {members.map((m) => {
            const seen = seenText(m.lastSeen, now);
            const online = seen === "Çevrimiçi";
            const w = workOf(m.uid, { plans, tasks, notes });
            const summary = [w.tasks.length && `${w.tasks.length} açık görev`, w.plans.length && `${w.plans.length} plan`, w.notes.length && `${w.notes.length} not`].filter(Boolean).join(" · ");
            const isOpen = openId === m.uid;
            return (
              <li key={m.uid}>
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <button type="button" onClick={() => setOpenId(isOpen ? "" : m.uid)} className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-60">
                    <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.875rem] font-semibold text-acc">
                      {(m.name || "?")[0]}
                      <span className={`absolute -bottom-px -right-px size-3 rounded-full ring-2 ring-card ${online ? "bg-ok" : "bg-line"}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-medium">{m.name}</b>
                      <small className={`block truncate text-[0.75rem] ${online ? "font-medium text-ok" : "text-mut"}`}>{seen}</small>
                      <small className="block truncate text-[0.75rem] text-mut">{summary || "Üzerinde iş yok"}</small>
                    </span>
                    <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${isOpen ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-line bg-bg/60 px-3.5 py-3 text-[0.875rem]">
                    <p className="truncate text-[0.75rem] text-mut">{m.email}</p>
                    {w.tasks.length + w.plans.length === 0 ? (
                      <p className="mt-2 text-mut">Açık görevi ya da yaklaşan planı yok.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {w.plans.slice(0, 5).map((p) => (
                          <li key={p.id} className="flex items-center gap-2">
                            <Icon name="cal" className="size-4 shrink-0 text-acc" />
                            <span className="min-w-0 flex-1 truncate">{p.title}</span>
                            <small className="shrink-0 text-[0.75rem] text-mut">{rel(p.date)}{p.time ? ` ${p.time}` : ""}</small>
                          </li>
                        ))}
                        {w.tasks.slice(0, 5).map((t) => (
                          <li key={t.id} className="flex items-center gap-2">
                            <Icon name="task" className="size-4 shrink-0 text-acc" />
                            <span className="min-w-0 flex-1 truncate">{t.title}</span>
                            {t.due && <small className="shrink-0 text-[0.75rem] text-mut">{rel(t.due)}</small>}
                          </li>
                        ))}
                      </ul>
                    )}
                    <button
                      onClick={() => remove(m)}
                      disabled={busy}
                      className={`mt-3 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium transition active:scale-95 ${armed === m.uid ? "bg-rec text-white" : "-ml-3 text-rec"}`}
                    >
                      {armed === m.uid ? "Emin misin? Hesabı kaldır" : "Kişiyi kaldır"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {form ? (
        <form onSubmit={add} className="mt-3 space-y-3 rounded-xl bg-card p-3.5">
          <Field label="Ad soyad" autoCapitalize="words" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          <Field label="E-posta" type="email" inputMode="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <PasswordField label="Şifre" autoComplete="new-password" hint="En az 6 karakter. Kişiye sen ilet; sonra “Şifremi unuttum” ile değiştirebilir." value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setForm(null)} className="flex-1">Vazgeç</Button>
            <Button type="submit" loading={busy} className="flex-1">Hesabı oluştur</Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setForm({ name: "", email: "", password: "" })}
          className={
            page
              ? "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white transition active:scale-[.98]"
              : "mt-3 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-acc active:opacity-60"
          }
        >
          <Icon name="plus" className="size-4" /> Kişi ekle
        </button>
      )}
    </div>
  );
}
