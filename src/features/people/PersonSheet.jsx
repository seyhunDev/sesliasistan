"use client";

import { useState } from "react";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { clubAthleteFor } from "@/features/athletes/memberSync";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase/clientApp";
import { KINDS, KIND_LABEL, RELATIONS, kindOf, shownLogin, suggestUsername, validUsername } from "@/lib/kinds";
import { assigneesOf } from "@/lib/people";
import { TLk, totalOf } from "@/lib/receipts";
import { isUpcoming } from "@/lib/utils/format";

async function call(method, body) {
  const res = await authFetch("/api/staff", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "İşlem yapılamadı");
  return data;
}

const chip = (on) =>
  `h-9 rounded-full px-3.5 text-[0.875rem] font-semibold transition active:scale-95 ${on ? "bg-deep text-white" : "bg-bg text-fg ring-1 ring-line"}`;
const section = "rounded-2xl bg-bg p-3.5";
const birthParts = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? { year: +m[1], month: +m[2], day: +m[3] } : null;
};
// Kolay paylaşım: giriş bilgileri WhatsApp ile
const shareText = (name, login, pw) =>
  `Merhaba ${name.split(" ")[0]}, Sesli Asistan uygulamasına giriş bilgilerin:\n${typeof location !== "undefined" ? location.origin : ""}\nGiriş: ${login}\nŞifre: ${pw}\nGirdikten sonra şifreni Ayarlar'dan değiştirebilirsin.`;
const randomPw = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join("").slice(0, 8);

// Kişi ekle / düzenle (ana hesap): ad, tür, yakınlık/unvan, telefon, e-posta, doğum günü; hesap aç/kapat, şifre; sil.
// person: düzenlenecek kişi (null = yeni). Doğum günü girilirse ana hesabın takvimine kişiye bağlı eklenir.
// prefill: yeni kişi için asistanın topladığı bilgiler (form dolu açılır, kaydetmek yine "Ekle" ile)
export function PersonSheet({ open, onClose, person, defaultKind = "staff", initialStep = "edit", prefill = null }) {
  const { birthdays, saveBirthday, deleteRecord, updateRecord, plans, tasks, notes, receipts, myUid, members } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const isNew = !person;
  const [f, setF] = useState(() => {
    const src = person || prefill || {};
    return {
      name: src.name || "",
      kind: kindOf(person || { kind: prefill?.kind || defaultKind }),
      relation: src.relation || "",
      title: src.title || "",
      phone: src.phone || "",
      email: src.email || "",
      birth: src.birth || "",
    };
  });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(person && initialStep === "account" ? "account" : "edit"); // edit | account | password | delete
  const [acc, setAcc] = useState(() => (person && initialStep === "account" ? { login: person.email || suggestUsername(person.name), password: randomPw() } : { login: "", password: "" }));
  const [made, setMade] = useState(null); // hesap açılınca: { login, password } (kişiye iletmek için)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const hasAccount = person && person.account !== false;

  const linkedBday = person ? birthdays.find((b) => b.memberUid === person.uid) : null;

  async function syncBirthday(id, name) {
    const bp = birthParts(f.birth);
    if (!bp) return;
    const body = { name, month: bp.month, day: bp.day, year: bp.year, phone: f.phone, memberUid: id, note: KIND_LABEL[f.kind] };
    saveBirthday(body, linkedBday?.id);
  }

  async function save(e) {
    e?.preventDefault();
    const name = f.name.trim();
    if (!name) return toast("Ad yaz");
    setBusy(true);
    const data = {
      name,
      kind: f.kind,
      relation: f.kind === "family" ? f.relation : "",
      title: f.kind === "staff" ? f.title.trim() : "",
      phone: f.phone.replace(/[^\d+ ]/g, "").trim(),
      email: f.email.trim().toLowerCase(),
      birth: f.birth,
      updatedAt: new Date().toISOString(),
    };
    try {
      if (isNew) {
        const ref = await addDoc(collection(db, "orgs", myUid, "members"), { ...data, account: false, status: "active", createdAt: data.updatedAt });
        await updateDoc(ref, { uid: ref.id });
        await syncBirthday(ref.id, name);
        // Sporcu kulüp listesine de (diğer Firebase projesi) eklenir ya da aynı adlı kulüp sporcusuna bağlanır
        let club = "";
        if (f.kind === "athlete" && canSeeAthletes(profile?.email)) {
          try {
            const athleteId = await clubAthleteFor({ name, birth: f.birth, phone: data.phone }, members);
            await updateDoc(ref, { athleteId });
          } catch {
            club = " (kulüp listesine eklenemedi; Sporcular'dan ekle)";
          }
        }
        toast(`${name} eklendi${club}`);
        onClose(ref.id);
      } else {
        await updateDoc(doc(db, "orgs", myUid, "members", person.uid), data);
        if (hasAccount && (name !== person.name || f.kind !== kindOf(person))) await call("PATCH", { uid: person.uid, name, kind: f.kind }).catch((err) => toast(err.message));
        await syncBirthday(person.uid, name);
        toast("Kaydedildi");
        onClose();
      }
    } catch (err) {
      toast(err.message || "Kaydedilemedi");
    }
    setBusy(false);
  }

  async function openAccount(e) {
    e.preventDefault();
    const login = acc.login.trim().toLowerCase();
    if (!login.includes("@") && !validUsername(login)) return toast("Kullanıcı adı: en az 3 karakter; harf, rakam ve nokta");
    setBusy(true);
    try {
      await call("POST", { memberId: person.uid, name: f.name.trim() || person.name, kind: f.kind, login, password: acc.password });
      setMade({ login, password: acc.password });
      toast("Hesap açıldı");
    } catch (err) {
      toast(err.message);
    }
    setBusy(false);
  }

  async function changePassword(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await call("PATCH", { uid: person.uid, password: acc.password });
      setMade({ login: shownLogin(person.loginName || person.email), password: acc.password });
      toast("Şifre değiştirildi");
    } catch (err) {
      toast(err.message);
    }
    setBusy(false);
  }

  async function closeAccount() {
    setBusy(true);
    try {
      await call("DELETE", { uid: person.uid, mode: "account" });
      toast("Hesap kapatıldı; kişi kayıtlı kalır");
      onClose();
    } catch (err) {
      toast(err.message);
    }
    setBusy(false);
  }

  const startAccount = () => {
    setAcc({ login: f.email || suggestUsername(f.name), password: randomPw() });
    setMade(null);
    setStep("account");
  };

  const title = isNew ? "Kişi ekle" : step === "delete" ? `${person.name} · sil` : person.name;
  return (
    <Sheet open={open} onClose={() => onClose()} title={title}>
      {step === "edit" && (
        <form onSubmit={save} className="space-y-4 pb-2">
          <Field label="Ad soyad" autoCapitalize="words" value={f.name} onChange={set("name")} required autoFocus={isNew} />
          <div>
            <span className="text-[0.8125rem] font-medium text-mut">Tür</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => set("kind")(k)} aria-pressed={f.kind === k} className={chip(f.kind === k)}>
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
          </div>
          {f.kind === "family" && (
            <div>
              <span className="text-[0.8125rem] font-medium text-mut">Yakınlık</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {RELATIONS.map((r) => (
                  <button key={r} type="button" onClick={() => set("relation")(f.relation === r ? "" : r)} aria-pressed={f.relation === r} className={chip(f.relation === r)}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          {f.kind === "staff" && <Field label="Görevi / unvanı (isteğe bağlı)" placeholder="Antrenör, muhasebe…" value={f.title} onChange={set("title")} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefon" type="tel" inputMode="tel" autoComplete="off" placeholder="05xx…" value={f.phone} onChange={set("phone")} />
            <Field label="Doğum günü" type="date" value={f.birth} onChange={set("birth")} />
          </div>
          <Field label="E-posta" type="email" inputMode="email" autoComplete="off" value={f.email} onChange={set("email")} />
          {f.birth && <p className="-mt-2 text-[0.75rem] text-mut">Doğum günü takvimine eklenir; o gün ana sayfada hatırlatılır.</p>}

          {!isNew && (
            <div className={section}>
              <b className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                <Icon name="user" className="size-4 text-acc" /> Uygulama hesabı
              </b>
              {hasAccount ? (
                <>
                  <p className="mt-1 text-[0.8125rem] text-mut">
                    Giriş: <b className="font-semibold text-fg">{shownLogin(person.loginName || person.email) || "—"}</b>
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <button type="button" onClick={() => (setAcc({ login: "", password: randomPw() }), setMade(null), setStep("password"))} className="h-9 rounded-full bg-card px-3.5 text-[0.8125rem] font-semibold text-acc ring-1 ring-line">
                      Şifreyi değiştir
                    </button>
                    <button type="button" onClick={closeAccount} disabled={busy} className="h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold text-rec">
                      Hesabı kapat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[0.8125rem] leading-snug text-mut">Hesap açınca kendi telefonundan girer; yalnızca kendine verilen işleri ve grubunu görür.</p>
                  <button type="button" onClick={startAccount} className="mt-2.5 h-9 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white active:scale-95">
                    Hesap aç
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {!isNew && (
              <Button type="button" variant="ghost" onClick={() => setStep("delete")} className="text-rec">
                Sil
              </Button>
            )}
            <Button type="submit" loading={busy} className="flex-1">
              {isNew ? "Ekle" : "Kaydet"}
            </Button>
          </div>
        </form>
      )}

      {(step === "account" || step === "password") &&
        (made ? (
          <div className="space-y-3 pb-2">
            <div className={section}>
              <p className="text-[0.8125rem] text-mut">Giriş bilgileri — kişiye ilet:</p>
              <p className="mt-1.5 text-[1rem]">
                Giriş: <b className="font-semibold">{made.login}</b>
              </p>
              <p className="text-[1rem]">
                Şifre: <b className="font-semibold tabular-nums">{made.password}</b>
              </p>
            </div>
            <a
              href={`https://wa.me/${(f.phone || "").replace(/\D/g, "").replace(/^0/, "90")}?text=${encodeURIComponent(shareText(f.name || person.name, made.login, made.password))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25d366] text-[0.9375rem] font-semibold text-white"
            >
              <Icon name="whatsapp" className="size-5" /> WhatsApp ile gönder
            </a>
            <Button variant="ghost" onClick={() => onClose()}>
              Tamam
            </Button>
          </div>
        ) : (
          <form onSubmit={step === "account" ? openAccount : changePassword} className="space-y-4 pb-2">
            {step === "account" && (
              <Field
                label="Giriş: e-posta ya da kullanıcı adı"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={acc.login}
                onChange={(e) => setAcc((a) => ({ ...a, login: e.target.value }))}
                hint="E-postası yoksa kullanıcı adı yeterli (ör. ege.demir)."
                required
              />
            )}
            <PasswordField label={step === "account" ? "Şifre" : "Yeni şifre"} autoComplete="new-password" hint="En az 6 karakter. Önerilen şifreyi kullanabilir ya da değiştirebilirsin." value={acc.password} onChange={(e) => setAcc((a) => ({ ...a, password: e.target.value }))} required />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setStep("edit")} className="flex-1">
                Geri
              </Button>
              <Button type="submit" loading={busy} className="flex-1">
                {step === "account" ? "Hesabı aç" : "Değiştir"}
              </Button>
            </div>
          </form>
        ))}

      {step === "delete" && person && (
        <DeleteStep person={person} linkedBday={linkedBday} data={{ plans, tasks, notes, receipts }} myUid={myUid} onBack={() => setStep("edit")} onDone={() => onClose()} deps={{ deleteRecord, updateRecord, toast }} />
      )}
    </Sheet>
  );
}

// Silme: ona verilmiş açık işler (devret / sorumlusuz bırak / sil), doğum günü, ödeme bekleyen fişler
function DeleteStep({ person, linkedBday, data, myUid, onBack, onDone, deps }) {
  const { deleteRecord, updateRecord, toast } = deps;
  const id = person.uid;
  const open = [
    ...data.tasks.filter((t) => !t.done && assigneesOf(t).includes(id)).map((r) => ["task", r]),
    ...data.plans.filter((p) => isUpcoming(p) && assigneesOf(p).includes(id)).map((r) => ["plan", r]),
    ...data.notes.filter((n) => !n.archived && assigneesOf(n).includes(id)).map((r) => ["note", r]),
  ];
  const pending = data.receipts.filter((r) => r.createdByUid === id && r.payStatus === "pending");
  const [what, setWhat] = useState("me"); // me | none | delete
  const [dropBday, setDropBday] = useState(true);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      for (const [kind, r] of open) {
        if (what === "delete" && r.createdByUid !== id) deleteRecord(kind, r.id);
        else {
          const rest = assigneesOf(r).filter((x) => x !== id);
          await updateRecord(kind, r.id, { assignees: what === "me" ? [...new Set([...rest, myUid])] : rest }, { name: "Ana hesap" });
        }
      }
      if (dropBday && linkedBday) deleteRecord("birthday", linkedBday.id);
      if (person.account === false) await updateDoc(doc(db, "orgs", myUid, "members", id), { status: "left", leftAt: new Date().toISOString() });
      else await call("DELETE", { uid: id, mode: "person" });
      toast(`${person.name} silindi`);
      onDone();
    } catch (err) {
      toast(err.message || "Silinemedi");
    }
    setBusy(false);
  }

  const opt = (v, label, desc) => (
    <button type="button" onClick={() => setWhat(v)} aria-pressed={what === v} className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ${what === v ? "bg-acc/[.07] ring-acc" : "bg-card ring-line"}`}>
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ring-2 ${what === v ? "ring-acc" : "ring-line"}`}>{what === v && <span className="size-2.5 rounded-full bg-acc" />}</span>
      <span>
        <b className="block text-[0.9375rem] font-semibold">{label}</b>
        <small className="block text-[0.8125rem] text-mut">{desc}</small>
      </span>
    </button>
  );

  return (
    <div className="space-y-4 pb-2">
      <p className="text-[0.875rem] leading-snug text-mut">
        {person.account === false ? "" : "Hesabı kapanır, giriş yapamaz. "}Kişi listeden kalkar; arşivde ve eski mesajlarda adı görünmeye devam eder.
      </p>
      {open.length > 0 && (
        <div className="space-y-2">
          <b className="block text-[0.875rem] font-semibold">Ona verilmiş {open.length} açık iş var</b>
          {opt("me", "Bana devret", "Sorumlu sen olursun")}
          {opt("none", "Sorumlusuz bırak", "İşler kalır, sorumlusu boşalır")}
          {opt("delete", "Sil", "Onun için açılan işler silinir (kendi eklediklerine dokunulmaz)")}
        </div>
      )}
      {linkedBday && (
        <label className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-line">
          <input type="checkbox" checked={dropBday} onChange={(e) => setDropBday(e.target.checked)} className="size-5 accent-deep" />
          <span className="text-[0.9375rem]">Doğum günü takvimden silinsin</span>
        </label>
      )}
      {pending.length > 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] leading-snug text-amber-900 ring-1 ring-amber-200">
          {pending.length} fişi ödeme bekliyor ({TLk(pending.reduce((a, r) => a + totalOf(r), 0))}). Fişler kalır; ödemeyi Fişler’den yapabilirsin.
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
          Vazgeç
        </Button>
        <button type="button" onClick={go} disabled={busy} className="h-12 flex-1 rounded-xl bg-rec text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-50">
          {busy ? "Siliniyor…" : "Sil"}
        </button>
      </div>
    </div>
  );
}
