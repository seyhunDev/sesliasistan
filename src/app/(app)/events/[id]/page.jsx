"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { EventEditor } from "@/features/events/EventEditor";
import { EventForm } from "@/features/events/EventForm";
import { freshEvent, cleanEvent } from "@/features/events/eventModel";
import { kindFromText } from "@/features/events/eventWords";
import { addEventPlan, askPlan, deleteEvent, loadEvents, saveEvent } from "@/features/events/events";
import { goBack } from "@/lib/navTrail";

// Tek etkinlik (yeni etkinlik için /events/new)
export default function EventPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId || !user) return null;
  return <Event orgId={profile.orgId} uid={user.uid} by={{ name: profile?.name ?? "Kullanıcı" }} />;
}

function Event({ orgId, uid, by }) {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { saveDrafts } = useData();
  const [ev, setEv] = useState(id === "new" ? freshEvent() : null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (id === "new") return;
    loadEvents(orgId).then(
      (list) => {
        const e = list.find((x) => x.id === id);
        if (e) setEv(e);
        else setMissing(true);
      },
      () => setMissing(true),
    );
  }, [orgId, id]);

  const onSave = useCallback((e) => saveEvent(orgId, uid, e), [orgId, uid]);
  const created = (nid) => router.replace(`/events/${nid}`);

  // Yeni: boş oluşturulur; plan etkinlik ekranındaki "Yapay zekayla hazırla" ya da ana asistanla gelir
  const onBlank = async (form, idea) => {
    const nid = await saveEvent(orgId, uid, cleanEvent({ ...form, kind: form.kind || kindFromText(form.title), note: idea, source: "manual" }));
    created(nid);
  };
  const onDelete = async (eid) => {
    try {
      await deleteEvent(orgId, eid);
      toast("Etkinlik silindi");
      goBack(router, "/events");
    } catch {
      toast("Silinemedi");
    }
  };
  const onAiFill = async (e) => (await askPlan({ text: [e.title, e.note].filter(Boolean).join("\n"), event: e, general: true })).event;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={id === "new" ? "Yeni etkinlik" : ev?.title || "Etkinlik"} back="/events" />
      {missing ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Etkinlik bulunamadı.</p>
      ) : !ev ? (
        <Loading label="Etkinlik yükleniyor" />
      ) : id === "new" ? (
        <EventForm start={ev} onBlank={onBlank} />
      ) : (
        <EventEditor key={id} start={ev} onSave={onSave} onDelete={onDelete} onPlan={(e) => addEventPlan(saveDrafts, e, by)} onAiFill={onAiFill} />
      )}
    </main>
  );
}
