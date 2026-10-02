"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase/clientApp";
import { kindOf, loginMessage, shownLogin, waPhone } from "@/lib/kinds";

const randomPw = () => Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 9000);

// Giriş bilgilerini WhatsApp ile gönder. Şifreler okunamaz (güvenlik): her gönderimde yeni şifre oluşturulur,
// eski şifre geçersiz olur. Sporcunun telefonu yoksa bağlı velinin telefonuna gider.
export function SendLogin({ person, onClose }) {
  const { members, myUid } = useData();
  const toast = useToast();
  const parent = !person.phone && ["athlete", "student"].includes(kindOf(person)) ? members.find((m) => (m.children || []).includes(person.uid) && m.phone && m.status !== "left") : null;
  const [phone, setPhone] = useState(person.phone || parent?.phone || "");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const login = shownLogin(person.loginName || person.email);
  const to = waPhone(phone);

  async function make() {
    if (!to) return toast("Geçerli bir cep telefonu yaz");
    setBusy(true);
    const next = randomPw();
    try {
      const res = await authFetch("/api/staff", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ uid: person.uid, password: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Şifre oluşturulamadı");
      if (!person.phone && !parent) updateDoc(doc(db, "orgs", myUid, "members", person.uid), { phone }).catch(() => {}); // yazılan numara kişiye kaydedilsin
      setPw(next);
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  const text = pw ? loginMessage({ name: parent ? parent.name : person.name, forName: parent ? person.name : "", login, password: pw, site: typeof location !== "undefined" ? location.origin : "" }) : "";
  return (
    <Sheet open onClose={onClose} title={`${person.name} · giriş bilgileri`}>
      <div className="space-y-3.5 pb-2">
        <div className="rounded-2xl bg-bg p-3.5 text-[0.9375rem]">
          <p>
            Kullanıcı adı: <b className="font-semibold">{login || "—"}</b>
          </p>
          <p>
            Şifre: <b className="font-semibold tabular-nums">{pw || "yeni oluşturulacak"}</b>
          </p>
        </div>
        {parent && <p className="text-[0.8125rem] text-mut">Sporcunun telefonu yok; velisi {parent.name} ({parent.phone}) numarasına gönderilecek.</p>}
        {!pw ? (
          <>
            <label className="block">
              <span className="text-[0.8125rem] font-medium text-mut">WhatsApp numarası</span>
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" className="mt-1 h-11 w-full rounded-xl bg-card px-3 text-base outline-none ring-1 ring-line focus:ring-acc" />
            </label>
            <p className="text-[0.8125rem] leading-snug text-mut">Güvenlik için şifreler saklanmaz; gönderirken yeni bir şifre oluşturulur ve eskisi geçersiz olur.</p>
            <button type="button" onClick={make} disabled={busy || !to} className="h-12 w-full rounded-xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-40">
              {busy ? "Hazırlanıyor…" : "Yeni şifre oluştur"}
            </button>
          </>
        ) : (
          <>
            <pre className="whitespace-pre-wrap rounded-2xl bg-card p-3 font-sans text-[0.875rem] leading-snug ring-1 ring-line">{text}</pre>
            <a
              href={`https://wa.me/${to}?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] text-[0.9375rem] font-semibold text-white"
            >
              <Icon name="whatsapp" className="size-5" /> WhatsApp’ta gönder
            </a>
            <button type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))} className="h-11 w-full rounded-xl bg-card text-[0.875rem] font-semibold text-acc ring-1 ring-line">
              Metni kopyala
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
