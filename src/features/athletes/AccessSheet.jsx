"use client";

import { useState } from "react";
import { arrayUnion, collection, doc } from "firebase/firestore";
import { addDoc, updateDoc } from "@/lib/firebase/write";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { LoginResult } from "@/features/people/LoginResult";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase/clientApp";
import { cleanLogin, suggestUsername, validUsername } from "@/lib/kinds";
import { linkParent, syncAthleteAtt } from "./mirror";

const digits = (s) => String(s || "").replace(/\D/g, "").replace(/^90/, "").replace(/^0/, "");
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").trim();
const randomPw = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join("").slice(0, 8);
const isoDay = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
};

async function staff(method, body) {
  const res = await authFetch("/api/staff", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hesap açılamadı");
  return data;
}

// Sporcu uygulama hesabı: tek pencere (sporcu detayı, Sporcular toplu seçim, Kişiler hep bunu açar; Seyhun 2026-11-25).
// Kişi kaydını sunucu kurar ve sporcunun var olan hesabını bulur (ikinci hesap açılmaz). Velisi kişi olarak bağlanır;
// "Veliye de hesap aç" seçilirse veliye de giriş açılır. Açılınca adres, kullanıcı adı, şifre tek ekranda (LoginResult).
export function AccessSheet({ open, onClose, athletes }) {
  const { members, myUid } = useData();
  const toast = useToast();
  const one = athletes.length === 1;
  const first = athletes[0];
  const hasParent = athletes.some((a) => a.parentName);
  const [login, setLogin] = useState(() => suggestUsername(first?.studentName || ""));
  const [password, setPassword] = useState(randomPw);
  const [parentAccount, setParentAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // [{ name, login, role, note, error, phone }]

  async function go(e) {
    e?.preventDefault();
    const pw = password.trim();
    if (pw.length < 6) return toast("Şifre en az 6 karakter olmalı");
    const wanted = cleanLogin(login);
    if (one && !wanted.includes("@") && !validUsername(wanted)) return toast("Kullanıcı adı: en az 3 karakter; harf, rakam ve nokta");
    setBusy(true);
    const out = [];
    const parents = [...members]; // bu turda eklenen veliler de eşleşsin
    for (const a of athletes) {
      try {
        const auto = !one || wanted === suggestUsername(a.studentName);
        const r = await staff("POST", {
          athleteId: a.id, name: a.studentName, kind: "athlete", login: one ? wanted : suggestUsername(a.studentName), password: pw, auto,
          birth: isoDay(a.studentBirthDate), phone: a.studentPhone || "",
        });
        const mid = r.member.uid;
        if (r.exists && one) {
          // Tek sporcu: hesabı zaten vardı (Kişiler'den açılmış olabilir) → bu şifre verilir, bilgiler yine tek ekranda
          await staff("PATCH", { uid: mid, password: pw });
          out.push({ name: a.studentName, login: r.member.login, role: "Sporcu", phone: a.studentPhone || a.parentPhone, note: "vardı, yeni şifre" });
        } else out.push({ name: a.studentName, login: r.member.login, role: "Sporcu", ...(r.exists ? { note: "zaten vardı" } : {}) });

        let parentIds;
        if (a.parentName) {
          let p = parents.find((x) => x.kind === "parent" && x.status !== "left" && ((digits(a.parentPhone) && digits(x.phone) === digits(a.parentPhone)) || low(x.name) === low(a.parentName)));
          if (parentAccount && (!p || p.account === false) && !p?._opened) {
            const pr = await staff("POST", {
              ...(p ? { memberId: p.uid } : { children: [mid] }), name: p?.name || a.parentName, kind: "parent", password: pw, auto: true,
              login: (p?.email || a.parentEmail || "").includes("@") ? (p?.email || a.parentEmail).toLowerCase() : suggestUsername(p?.name || a.parentName),
              phone: a.parentPhone || "",
            });
            if (p) await updateDoc(doc(db, "orgs", myUid, "members", p.uid), { children: arrayUnion(mid) });
            p = { ...(p || { name: a.parentName, kind: "parent", phone: a.parentPhone, status: "active" }), uid: pr.member.uid, account: true, _opened: true };
            parents.push(p);
            out.push({ name: p.name, login: pr.member.login, role: "Veli" });
          } else if (!p) {
            const ref = await addDoc(collection(db, "orgs", myUid, "members"), {
              name: a.parentName, kind: "parent", phone: a.parentPhone || "", email: (a.parentEmail || "").toLowerCase(), children: [mid], account: false, status: "active", createdAt: new Date().toISOString(),
            });
            await updateDoc(ref, { uid: ref.id });
            p = { uid: ref.id, name: a.parentName, kind: "parent", phone: a.parentPhone, account: false, status: "active" };
            parents.push(p);
          } else await updateDoc(doc(db, "orgs", myUid, "members", p.uid), { children: arrayUnion(mid) });
          parentIds = [p.uid];
        }
        await syncAthleteAtt(myUid, mid, a, parentIds);
        if (parentIds) await linkParent(myUid, mid, parentIds[0]);
      } catch (err) {
        out.push({ name: a.studentName, error: err.message });
      }
    }
    setDone(out);
    setBusy(false);
  }

  const close = () => onClose(!!done, done ? password.trim() : "");
  const single = one && done?.length && !done[0].error && done.filter((d) => d.role === "Sporcu").length === 1 && done.length === 1 ? done[0] : null;
  return (
    <Sheet open={open} onClose={close} title={done ? (single ? "Hesap açıldı" : `${athletes.length} sporcu · uygulama`) : one ? `${first?.studentName} · uygulama` : `${athletes.length} sporcu · uygulama`}>
      {done ? (
        single ? (
          <LoginResult name={first.studentName} login={single.login} password={password.trim()} phone={first.studentPhone || first.parentPhone} forName={!first.studentPhone && first.parentPhone ? first.studentName : ""} onDone={close} />
        ) : (
          <LoginResult password={password.trim()} list={done} onDone={close} />
        )
      ) : (
        <form onSubmit={go} className="space-y-3.5 pb-2">
          {one && (
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-mut">Kullanıcı adı</span>
              <input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="mt-1 h-11 w-full rounded-xl bg-bg px-3 text-base font-semibold outline-none ring-1 ring-line focus:ring-acc" />
            </label>
          )}
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-mut">{one ? "Şifre" : "Ortak şifre"}</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} className="mt-1 h-11 w-full rounded-xl bg-bg px-3 text-base font-semibold tabular-nums outline-none ring-1 ring-line focus:ring-acc" />
          </label>
          {hasParent && (
            <label className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 ring-1 ring-line">
              <input type="checkbox" checked={parentAccount} onChange={(e) => setParentAccount(e.target.checked)} className="size-5 accent-deep" />
              <span className="text-[0.9375rem]">Veliye de hesap aç</span>
            </label>
          )}
          <button type="submit" disabled={busy} data-press className="btn btn-primary h-12 w-full">
            {busy ? "Açılıyor…" : one ? "Hesabı aç" : `${athletes.length} hesap aç`}
          </button>
        </form>
      )}
    </Sheet>
  );
}
