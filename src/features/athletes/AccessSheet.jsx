"use client";

import { useState } from "react";
import { addDoc, arrayUnion, collection, doc, updateDoc } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase/clientApp";
import { suggestUsername } from "@/lib/kinds";
import { linkParent, syncAthleteAtt } from "./mirror";

const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").trim();
const randomPw = () => Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 9000);
const isoDay = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
};

// Hesap aç; kullanıcı adı alınmışsa sonuna sayı ekleyip yeniden dener (ege.demir → ege.demir2)
async function openAccount({ memberId, name, kind, login, password }) {
  const base = login;
  for (let i = 1; i <= 5; i++) {
    const tryLogin = i === 1 ? base : `${base}${i}`;
    const res = await authFetch("/api/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId, name, kind, login: tryLogin, password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return tryLogin;
    if (!/alınmış/.test(data.error || "") || base.includes("@")) throw new Error(data.error || "Hesap açılamadı");
  }
  throw new Error("Uygun kullanıcı adı bulunamadı");
}

// Sporculara uygulama hesabı (tek ya da toplu). İsteğe bağlı: velisini kişi olarak ekle/bağla, veliye de hesap aç.
// Her sporcunun yoklama geçmişi kopyalanır (kendisi ve velisi uygulamada görür).
export function AccessSheet({ open, onClose, athletes }) {
  const { members, myUid } = useData();
  const toast = useToast();
  const [withParent, setWithParent] = useState(true);
  const [parentAccount, setParentAccount] = useState(false);
  const [password, setPassword] = useState(randomPw);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // [{ name, login, role, error }]

  async function go() {
    if (password.length < 6) return toast("Şifre en az 6 karakter olmalı");
    setBusy(true);
    const out = [];
    const parents = [...members]; // bu turda eklenen veliler de eşleşsin
    for (const a of athletes) {
      try {
        let m = members.find((x) => x.athleteId === a.id && x.status !== "left");
        let mid = m?.uid;
        if (!mid) {
          const ref = await addDoc(collection(db, "orgs", myUid, "members"), {
            name: a.studentName, kind: "athlete", athleteId: a.id, birth: isoDay(a.studentBirthDate), account: false, status: "active", createdAt: new Date().toISOString(),
          });
          await updateDoc(ref, { uid: ref.id });
          mid = ref.id;
        }
        if (!m || m.account === false) {
          const login = await openAccount({ memberId: mid, name: a.studentName, kind: "athlete", login: suggestUsername(a.studentName), password });
          out.push({ name: a.studentName, login, role: "Sporcu" });
        } else out.push({ name: a.studentName, login: m.loginName || "", role: "Sporcu", note: "zaten vardı" });
        let parentIds;
        if (withParent && a.parentName) {
          let p = parents.find((x) => x.kind === "parent" && x.status !== "left" && ((digits(a.parentPhone) && digits(x.phone) === digits(a.parentPhone)) || low(x.name) === low(a.parentName)));
          if (!p) {
            const ref = await addDoc(collection(db, "orgs", myUid, "members"), {
              name: a.parentName, kind: "parent", phone: a.parentPhone || "", email: (a.parentEmail || "").toLowerCase(), children: [mid], account: false, status: "active", createdAt: new Date().toISOString(),
            });
            await updateDoc(ref, { uid: ref.id });
            p = { uid: ref.id, name: a.parentName, kind: "parent", phone: a.parentPhone, email: a.parentEmail, account: false, status: "active" };
            parents.push(p);
          } else await updateDoc(doc(db, "orgs", myUid, "members", p.uid), { children: arrayUnion(mid) });
          parentIds = [p.uid];
          if (parentAccount && p.account === false && !p._opened) {
            const login = await openAccount({ memberId: p.uid, name: p.name, kind: "parent", login: (p.email || "").includes("@") ? p.email : suggestUsername(p.name), password });
            p._opened = true;
            out.push({ name: p.name, login, role: "Veli" });
          }
        }
        await syncAthleteAtt(myUid, mid, a, parentIds);
        if (parentIds) await linkParent(myUid, mid, parentIds[0]);
      } catch (e) {
        out.push({ name: a.studentName, error: e.message });
      }
    }
    setDone(out);
    setBusy(false);
  }

  const text = done ? `Sesli Asistan giriş bilgileri\n${typeof location !== "undefined" ? location.origin : ""}\nŞifre: ${password}\n${done.filter((d) => d.login && !d.note).map((d) => `${d.name}: ${d.login}`).join("\n")}` : "";
  const one = athletes.length === 1;
  return (
    <Sheet open={open} onClose={() => onClose(!!done)} title={one ? `${athletes[0]?.studentName} · uygulama` : `${athletes.length} sporcu · uygulama`}>
      {done ? (
        <div className="space-y-3 pb-2">
          <div className="rounded-2xl bg-bg p-3.5 text-[0.875rem]">
            <p className="text-mut">
              Ortak şifre: <b className="font-semibold tabular-nums text-fg">{password}</b>
            </p>
            <ul className="mt-2 space-y-1">
              {done.map((d, i) => (
                <li key={i} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">
                    {d.name} <small className="text-mut">· {d.role || "Sporcu"}</small>
                  </span>
                  {d.error ? <small className="shrink-0 text-rec">{d.error}</small> : <b className="shrink-0 font-semibold">{d.login}{d.note ? <small className="font-normal text-mut"> ({d.note})</small> : ""}</b>}
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(text).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-card text-[0.9375rem] font-semibold text-acc ring-1 ring-line"
          >
            <Icon name="clip" className="size-5" /> Giriş bilgilerini kopyala
          </button>
          <button type="button" onClick={() => onClose(true)} className="h-11 w-full rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white">
            Tamam
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 pb-2">
          <p className="text-[0.875rem] leading-snug text-mut">
            {one ? "Sporcu" : "Seçilen sporcular"} kendi telefonundan girer: kendi yoklamasını, kendine verilen planları ve Sporcular grubunu görür; size ve antrenörlere yazabilir.
            Kullanıcı adı addan oluşur (ör. {suggestUsername(athletes[0]?.studentName || "Ege Demir")}).
          </p>
          <label className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-line">
            <input type="checkbox" checked={withParent} onChange={(e) => setWithParent(e.target.checked)} className="size-5 accent-[#2c5163]" />
            <span className="text-[0.9375rem]">Velisini de kişi olarak ekle (bağla)</span>
          </label>
          {withParent && (
            <label className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-line">
              <input type="checkbox" checked={parentAccount} onChange={(e) => setParentAccount(e.target.checked)} className="size-5 accent-[#2c5163]" />
              <span className="text-[0.9375rem]">Veliye de hesap aç (çocuğunun yoklamasını görür)</span>
            </label>
          )}
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">Ortak ilk şifre (sonra kişi bazında değiştirilebilir)</span>
            <input value={password} onChange={(e) => setPassword(e.target.value.trim())} className="mt-1 h-11 w-full rounded-xl bg-bg px-3 text-base tabular-nums outline-none ring-1 ring-line focus:ring-acc" />
          </label>
          <button type="button" onClick={go} disabled={busy} className="h-12 w-full rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white disabled:opacity-50">
            {busy ? "Hesaplar açılıyor…" : one ? "Hesap aç" : `${athletes.length} hesap aç`}
          </button>
        </div>
      )}
    </Sheet>
  );
}
