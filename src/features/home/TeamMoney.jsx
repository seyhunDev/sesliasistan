"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { isAthleteSide, kindOf } from "@/lib/kinds";
import { money } from "@/lib/bankSheet";
import { db } from "@/lib/firebase/clientApp";
import { accountsOf } from "@/lib/mailBoard";
import { TLk, totalOf } from "@/lib/receipts";
import { initials } from "@/lib/utils/format";

const ONLINE_MS = 6 * 60e3;
const toMs = (v) => (!v ? 0 : typeof v.toMillis === "function" ? v.toMillis() : Date.parse(v) || 0);
const card = "rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]";
const label = "mb-2.5 flex items-center justify-between px-1 text-[0.75rem]";

// Kişiler kartının kutusu: başlık, büyük sayı, üst üste avatarlar (çevrimiçi noktası), alt satır ve tek kısayol
function Avatars({ list, now, max }) {
  return (
    <span className="flex items-center">
      {list.slice(0, max).map((m, i) => (
        <span key={m.uid} className={`relative size-6 shrink-0 rounded-full bg-card ring-2 ring-card ${i ? "-ml-1.5" : ""}`} style={{ zIndex: max - i }}>
          <span className="grid size-full place-items-center rounded-full bg-acc/10 text-[0.5625rem] font-bold text-acc">{initials(m.name)}</span>
          {now - toMs(m.lastSeen) < ONLINE_MS && <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-ok ring-2 ring-card" />}
        </span>
      ))}
      {list.length > max && <span className="ml-1 text-[0.6875rem] font-semibold text-mut">+{list.length - max}</span>}
    </span>
  );
}
function Tile({ href, icon, title, count, people, now, sub, action, compact }) {
  return (
    <div className={`${card} flex min-w-0 flex-col gap-2 p-3`}>
      <Link href={href} className="flex flex-1 flex-col gap-2 transition active:opacity-70">
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold">
          <Icon name={icon} className="size-4 shrink-0 text-acc" />
          <span className="truncate">{title}</span>
        </span>
        <span className="flex items-center justify-between gap-1.5">
          <b className="text-[1.5rem] font-semibold leading-none tabular-nums">{count}</b>
          {people?.length > 0 && <Avatars list={people} now={now} max={compact ? 2 : 3} />}
        </span>
        <span className="line-clamp-2 text-[0.75rem] leading-snug text-mut">{sub}</span>
      </Link>
      {action && (
        <Link href={action.href} className="flex h-8 items-center justify-center gap-1 rounded-full bg-acc/10 px-2 text-[0.8125rem] font-semibold text-acc active:scale-95">
          <Icon name={action.icon} className="size-4 shrink-0" /> <span className="truncate">{compact ? action.short || action.label : action.label}</span>
        </Link>
      )}
    </div>
  );
}

// Sporcular kutusu (izinli hesap): aktif sporcu sayısı, bugünkü yoklama, uygulamadaki sporcu hesapları; "Yoklama al"
function AthleteTile({ accounts, compact }) {
  const { data, err } = useDikili("list", loadAthletes);
  const d = new Date();
  const y = String(d.getFullYear());
  const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const active = (data?.athletes || []).filter(isActive);
  const marked = active.filter((a) => a.att?.[y]?.[md]);
  const present = marked.filter((a) => a.att[y][md] === "present").length;
  const sub = err ? "Kulüp hesabına bağlan" : !data ? "yükleniyor" : marked.length ? `bugün ${present}/${marked.length} geldi` : "bugün yoklama yok";
  return (
    <Tile
      href="/athletes"
      icon="anchor"
      title="Sporcular"
      count={err ? "—" : data ? active.length : "…"}
      sub={accounts ? `${sub} · ${accounts} uygulamada` : sub}
      action={err ? null : { href: "/athletes/attendance", icon: "check", label: "Yoklama al", short: "Yoklama" }}
      compact={compact}
    />
  );
}

// Kişiler (ana hesap): Çalışanlar, Aile (varsa) ve Sporcular (izinli hesapta) yan yana; başlıkta "Tümü" → Kişiler sayfası
export function TeamStrip() {
  const { profile } = useAuth();
  const { members, tasks } = useData();
  const [now] = useState(() => Date.now());
  const athletes = canSeeAthletes(profile?.email);
  const staff = members.filter((m) => kindOf(m) === "staff");
  const family = members.filter((m) => kindOf(m) === "family");
  const athleteAccounts = members.filter((m) => isAthleteSide(kindOf(m)) && m.account !== false).length;
  const online = (list) => list.filter((m) => m.account !== false && now - toMs(m.lastSeen) < ONLINE_MS).length;
  const compact = 1 + (family.length > 0) + !!athletes === 3; // üç kutu yan yana: kısa yazılar, iki avatar
  const openOf = (list) => tasks.filter((t) => !t.done && (t.assignees || []).some((u) => list.some((m) => m.uid === u))).length;
  const tiles = [
    <Tile
      key="staff"
      href="/staff"
      icon="users"
      title="Çalışanlar"
      count={staff.length}
      people={staff}
      now={now}
      sub={staff.length ? `${online(staff)} çevrimiçi · ${openOf(staff)} ${compact ? "iş" : "açık iş"}` : "henüz kimse yok"}
      action={staff.length ? { href: "/messages?c=team", icon: "chat", label: "Ekibe yaz", short: "Yaz" } : { href: "/staff", icon: "plus", label: "Ekle" }}
      compact={compact}
    />,
    family.length > 0 && (
      <Tile
        key="family"
        href="/staff"
        icon="home"
        title="Aile"
        count={family.length}
        people={family}
        now={now}
        sub={`${online(family)} çevrimiçi · ${openOf(family)} ${compact ? "iş" : "açık iş"}`}
        action={{ href: "/messages?c=family", icon: "chat", label: "Aileye yaz", short: "Yaz" }}
        compact={compact}
      />
    ),
    athletes && <AthleteTile key="athletes" accounts={athleteAccounts} compact={compact} />,
  ].filter(Boolean);
  return (
    <section aria-label="Kişiler">
      <div className={label}>
        <span className="font-bold tracking-[.08em] text-mut">KİŞİLER</span>
        <Link href="/staff" className="font-semibold text-acc active:opacity-60">
          Tümü · {members.length}
        </Link>
      </div>
      <div className={`grid gap-2 ${tiles.length === 3 ? "grid-cols-3" : tiles.length === 2 ? "grid-cols-2" : ""}`}>{tiles}</div>
    </section>
  );
}

// Küçük eğri (bakiye) ve çubuk (aylık fiş) grafikleri
function Spark({ vals, tone = "var(--ok)" }) {
  if (vals.length < 2) return <span className="block h-8" />;
  const w = 130;
  const h = 32;
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  const X = (i) => 2 + (i * (w - 4)) / (vals.length - 1);
  const Y = (v) => h - 4 - ((v - mn) / (mx - mn || 1)) * (h - 8);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" aria-hidden="true">
      <path d={`M2 ${h} L${pts.replaceAll(" ", " L")} L${X(vals.length - 1)} ${h} Z`} fill={tone} opacity=".12" />
      <polyline points={pts} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(vals.length - 1)} cy={Y(vals.at(-1))} r="3" fill={tone} />
    </svg>
  );
}
function Bars({ vals }) {
  const mx = Math.max(1, ...vals);
  return (
    <span className="flex h-8 items-end gap-1" aria-hidden="true">
      {vals.map((v, i) => (
        <span key={i} className={`flex-1 rounded-[3px] bg-acc ${i === vals.length - 1 ? "" : "opacity-30"}`} style={{ height: `${Math.max(10, (v / mx) * 100)}%` }} />
      ))}
    </span>
  );
}

// Para: banka (son hesap özetleri, ana hesap) ve fişler (son 5 ay)
export function MoneyRow() {
  const { profile } = useAuth();
  const { receipts, isStaff } = useData();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState([]);
  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(30)),
      (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMails([]),
    );
  }, [owner, profile?.uid]);

  const acc = accountsOf(mails).find((a) => a.currency === "TL") || accountsOf(mails)[0];
  // Aynı hesabın son özetlerindeki bakiyeler (eskiden yeniye)
  const series = acc
    ? mails
        .flatMap((m) => (m.sheets || []).map((s) => s.sum))
        .filter((s) => s && s.balance != null && s.currency === acc.currency && (s.last4 || "") === acc.last4)
        .map((s) => s.balance)
        .slice(0, 7)
        .reverse()
    : [];
  const first = series[0];
  const pct = acc && first ? ((acc.balance - first) / Math.abs(first)) * 100 : 0;

  const now = new Date();
  const months = [...Array(5)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 4 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const spend = months.map((m) => receipts.filter((r) => (r.date || "").startsWith(m)).reduce((a, r) => a + totalOf(r), 0));
  const monthName = now.toLocaleDateString("tr-TR", { month: "long" });

  return (
    <div className={`grid gap-2.5 ${owner && acc ? "grid-cols-2" : "grid-cols-1"}`}>
      {owner && acc && (
        <Link href="/mail" className={`${card} flex min-w-0 flex-col gap-1.5 p-3.5`}>
          <span className="flex items-center gap-1.5 text-[0.75rem] text-mut">
            <Icon name="wallet" className="size-4 text-acc" /> {acc.name}
          </span>
          <b className="truncate text-[1.0625rem] font-bold tabular-nums">
            {money(acc.balance)} {acc.currency}
          </b>
          <Spark vals={series} tone={pct < 0 ? "var(--rec)" : "var(--ok)"} />
          <span className={`text-[0.6875rem] font-semibold ${pct < 0 ? "text-rec" : "text-ok"}`}>
            {series.length > 1 ? `son ${series.length} özette ${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%` : "son özet"}
          </span>
        </Link>
      )}
      <Link href="/receipts" className={`${card} flex min-w-0 flex-col gap-1.5 p-3.5`}>
        <span className="flex items-center gap-1.5 text-[0.75rem] text-mut">
          <Icon name="receipt" className="size-4 text-acc" /> Fişler · <span className="capitalize">{monthName}</span>
        </span>
        <b className="truncate text-[1.0625rem] font-bold tabular-nums">{TLk(spend.at(-1))}</b>
        <Bars vals={spend} />
        <span className="text-[0.6875rem] text-mut">{isStaff ? "eklediğin fişler · son 5 ay" : "son 5 ay"}</span>
      </Link>
    </div>
  );
}
