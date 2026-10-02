"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { MANIFEST, gmailScript } from "@/features/mail/script";
import { Group, Row } from "@/features/settings/ui";
import { sendersOf } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";

const VALID = /^([^\s@]+@)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const PROJECT = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
const LIVE_SITE = "https://sesliasistan.netlify.app";
// Betiğin bildirim için çağıracağı site: yayındaki adres (kod bilgisayardaki denemede kopyalansa da yayındaki site yazılır)
const siteOf = () => {
  const o = typeof window === "undefined" ? "" : window.location.origin;
  return !o || /localhost|127\.0\.0\.1|192\.168\./.test(o) ? process.env.NEXT_PUBLIC_SITE_URL || LIVE_SITE : o;
};

const ago = (iso, now) => {
  const m = Math.round((now - Date.parse(iso)) / 60e3);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  if (m < 1440) return `${Math.round(m / 60)} saat önce`;
  return `${Math.round(m / 1440)} gün önce`;
};

// Kopyalanabilir kod kutusu
function CodeBox({ label, code, toast }) {
  const [open, setOpen] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(code).then(
      () => toast(`${label} kopyalandı`),
      () => toast("Kopyalanamadı; kodu seçip kopyala"),
    );
  return (
    <div className="px-4 pb-3.5 pl-[3.75rem]">
      <div className="flex gap-2">
        <button type="button" onClick={copy} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98]">
          <Icon name="checks" className="size-[1.125rem]" /> {label} kopyala
        </button>
        <button type="button" onClick={() => setOpen((v) => !v)} className="h-10 shrink-0 rounded-xl bg-bg px-3.5 text-[0.875rem] font-semibold active:scale-[.98]">
          {open ? "Gizle" : "Göster"}
        </button>
      </div>
      {open && <pre className="mt-2 max-h-[12rem] overflow-auto rounded-xl bg-bg p-3 text-[0.6875rem] leading-snug text-fg/80">{code}</pre>}
    </div>
  );
}

// Numaralı adım
function Step({ n, title, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-acc text-[0.75rem] font-bold text-white">{n}</span>
      <span className="min-w-0 text-[0.875rem] leading-snug">
        <b className="block text-[0.9375rem] font-semibold">{title}</b>
        <span className="text-mut">{children}</span>
      </span>
    </li>
  );
}

// Mail kurulumu. Gmail betiği mailleri doğrudan bu hesabın veritabanına yazar (sunucu ve gizli anahtar yok):
// kod bu sayfada hazırlanır, kullanıcı Apps Script'e yapıştırır ve kendi Google hesabıyla izin verir.
export default function MailSetupPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const owner = profile?.role === "owner";
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner) return null;

  const rules = sendersOf(profile.mailFrom); // sabit İş Bankası + eklenenler
  const own = rules.filter((r) => !r.fixed);
  const save = (list, msg) =>
    updateDoc(doc(db, "users", profile.uid), { mailFrom: list.map(({ name: n, from: f }) => ({ name: n, from: f })) })
      .then(() => msg && toast(msg))
      .catch(() => toast("Kaydedilemedi, tekrar dene"));
  const add = () => {
    const f = from.trim().toLowerCase().replace(/^@/, "");
    if (!name.trim() || !VALID.test(f)) return toast("Ad ve geçerli bir adres yaz");
    if (rules.some((x) => x.from === f)) return toast("Bu adres zaten ekli");
    save([...own, { name: name.trim().slice(0, 40), from: f }], `${name.trim()} eklendi`);
    setName("");
    setFrom("");
  };
  const remove = (f) => save(own.filter((x) => x.from !== f), "Kaldırıldı");

  const code = gmailScript({ project: PROJECT, uid: profile.uid, site: siteOf() });
  const seen = profile.mailSeen;
  const live = seen && now - Date.parse(seen) < 20 * 60e3;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Mail ayarları" back="/mail" />

      <Group title="Durum" footer={seen && !profile.mailOutbox ? "Yeni: uygulamada hazırlanan belgeleri (yarış evrakı) kendine mail atabilirsin. Bunun için aşağıdaki kodu ve appsscript.json'u bir kez yeniden kopyala, kur'u çalıştırıp yeni izni onayla." : seen ? "Yarış evrakını Mail düğmesiyle bu Gmail adresine gönderebilirsin." : undefined}>
        <Row
          icon="mail"
          tone={live ? "ok" : "slate"}
          title={live ? "Gmail bağlı" : seen ? "Gmail bir süredir bağlanmadı" : "Gmail henüz bağlanmadı"}
          sub={seen ? `Son kontrol ${ago(seen, now)} · 5 dakikada bir bakılır` : "Aşağıdaki kurulumu bir kez yap"}
        />
      </Group>

      <Group title="Takip edilen gönderenler" footer="Yalnızca bu adreslerden gelen mailler alınır. İş Bankası sabittir. Eklediğin adres betiğe kendiliğinden geçer; kodu yeniden kopyalaman gerekmez.">
        {rules.map((r) => (
          <Row
            key={r.from}
            icon="mail"
            tone="acc"
            title={r.name}
            sub={r.from}
            right={
              r.fixed ? (
                <span className="shrink-0 rounded-full bg-acc/10 px-2.5 py-1 text-[0.75rem] font-semibold text-acc">Sabit</span>
              ) : (
                <button type="button" onClick={() => remove(r.from)} aria-label={`${r.name} kaldır`} className="grid size-9 place-items-center rounded-full text-mut active:bg-bg">
                  <Icon name="trash" className="size-[1.125rem]" />
                </button>
              )
            }
          />
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
          className="space-y-2 px-4 py-3.5"
        >
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad (ör. Garanti)" className="h-11 w-full rounded-xl bg-bg px-3.5 text-[0.9375rem]" />
          <div className="flex gap-2">
            <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Gönderen adresi" inputMode="email" autoCapitalize="off" autoCorrect="off" className="h-11 min-w-0 flex-1 rounded-xl bg-bg px-3.5 text-[0.9375rem]" />
            <button type="submit" className="h-11 shrink-0 rounded-xl bg-acc px-4 text-[0.9375rem] font-semibold text-white active:scale-95">
              Ekle
            </button>
          </div>
        </form>
      </Group>

      <Group title="Kurulum (bir kez, bilgisayardan)" footer="Betik senin Gmail hesabında çalışır ve mailleri doğrudan senin veritabanına yazar. Yeni mail bulunca telefonuna hemen bildirim gönderilir (bildirimler açık olmalı). Başka mailler okunmaz. Gizli anahtar yoktur; kodu tekrar tekrar kopyalayabilirsin.">
        <ol className="space-y-3.5 px-4 py-3.5">
          <Step n={1} title="Apps Script projesini aç">
            script.google.com › Yeni proje (varsa eski projeni aç). Bankanın maillerinin geldiği Gmail hesabıyla gir; bu hesap Firebase projende de yetkili olmalı (projeyi açan hesap ise zaten öyle).
          </Step>
          <Step n={2} title="İzin dosyasını ekle">
            Sol menü › Proje Ayarları (dişli) › &quot;appsscript.json manifest dosyasını düzenleyicide göster&quot; kutusunu işaretle. Düzenleyiciye dön, appsscript.json dosyasının içini sil ve aşağıdaki izin dosyasını yapıştır.
          </Step>
        </ol>
        <CodeBox label="İzin dosyasını" code={MANIFEST} toast={toast} />
        <ol className="space-y-3.5 px-4 pb-3.5" start={3}>
          <Step n={3} title="Kodu yapıştır">
            Kod.gs dosyasının içini tamamen sil, aşağıdaki kodu yapıştır, Kaydet.
          </Step>
        </ol>
        <CodeBox label="Kodu" code={code} toast={toast} />
        <ol className="space-y-3.5 px-4 pb-3.5">
          <Step n={4} title="Çalıştır ve izin ver">
            Üstteki listeden kur&apos;u seç, Çalıştır. &quot;Doğrulanmadı&quot; uyarısında Gelişmiş › Projeye git › Tümünü seç › Devam. Yürütme günlüğünde &quot;Kontrol bitti&quot; görünmeli; birkaç saniye içinde yukarıdaki durum Gmail bağlı olur.
          </Step>
        </ol>
      </Group>

      <Group title="Nasıl denerim?">
        <p className="px-4 py-3.5 text-[0.875rem] leading-snug">
          Gönderenlere geçici olarak kendi Gmail adresini ekle, kendine ekinde Excel olan bir mail gönder. Apps Script&apos;te kontrol&apos;ü çalıştır (ya da 5 dakika bekle): mail Mailler sayfasına düşer, Excel tabloya çevrilir. Deneme bitince kendi adresini kaldır.
        </p>
      </Group>
    </main>
  );
}
