"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { EventList, isPast } from "@/features/events/EventList";
import { loadEvents } from "@/features/events/events";

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

function Events({ orgId }) {
  const router = useRouter();
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadEvents(orgId).then(setEvents, (e) => (setEvents([]), setError(e?.message || "Etkinlikler alınamadı.")));
  }, [orgId]);
  const up = events?.filter((e) => !isPast(e)).length || 0;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Etkinlikler" sub={events ? (up ? `${up} yaklaşan etkinlik` : "Yaklaşan etkinlik yok") : "Yükleniyor…"}>
        <Link href="/events/new" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-[1.125rem]" />
          Etkinlik
        </Link>
      </PageHeader>
      {error && <p className="mt-3 text-center text-[0.875rem] text-rec">{error}</p>}
      {!events ? <Loading label="Etkinlikler yükleniyor" /> : <EventList events={events} onOpen={(e) => router.push(`/events/${e.id}`)} />}
    </main>
  );
}
