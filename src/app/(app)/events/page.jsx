"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { EventList, isPast } from "@/features/events/EventList";
import { eventsNow, loadEvents } from "@/features/events/events";

// Etkinlikler: kamp, balık, gezi, konser… her biri için ihtiyaç listesi, bütçe, yapılacaklar (yalnız ana hesap)
export default function EventsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <Events orgId={profile.orgId} />;
}

// Yeni tasarım (2026-11-03): lacivert üstte ad, yaklaşan sayısı, "+ Etkinlik" ve Yaklaşan · Geçmiş çipleri; altta tek liste
function Events({ orgId }) {
  const router = useRouter();
  const [events, setEvents] = useState(() => eventsNow(orgId)); // bellekte varsa hemen, arkada tazelenir
  const [error, setError] = useState("");
  const [tab, setTab] = useState("up"); // up | past
  useEffect(() => {
    loadEvents(orgId).then(setEvents, (e) => (setEvents((l) => l || []), setError(e?.message || "Etkinlikler alınamadı.")));
  }, [orgId]);
  const up = events?.filter((e) => !isPast(e)).length || 0;
  const past = (events?.length || 0) - up;
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Etkinlikler">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Etkinlikler</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{events ? (up ? `${up} yaklaşan` : "Yaklaşan yok") : "Yükleniyor…"}</p>
          </div>
          <Link href="/events/new" data-press className="ck-btn shrink-0 !flex items-center gap-1">
            <Icon name="plus" className="size-4" />
            Etkinlik
          </Link>
        </header>
        {events?.length > 0 && (
          <div className="mt-4 flex gap-2">
            {[
              ["up", "Yaklaşan", up],
              ["past", "Geçmiş", past],
            ].map(([k, l, c]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} data-press className={`${pill0} ${tab === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
                {l}
                <span className="ml-1.5 tabular-nums opacity-70">{c}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!events ? <Loading label="Etkinlikler yükleniyor" /> : <EventList events={events} tab={tab} onOpen={(e) => router.push(`/events/${e.id}`)} />}
      </div>
    </main>
  );
}
