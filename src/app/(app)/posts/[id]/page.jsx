"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { PostEditor } from "@/features/posts/PostEditor";
import { RACE_KEY, freshPost, postFromRace } from "@/features/posts/postModel";
import { deletePost, loadPhoto, loadPost, savePost } from "@/features/posts/posts";
import { loadRaces } from "@/features/athletes/races";
import { todayStr } from "@/lib/utils/format";

// Tek gönderi (yeni gönderi için /posts/new)
export default function PostPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId || !user) return null;
  return <Post orgId={profile.orgId} uid={user.uid} />;
}

function fromRace() {
  try {
    const raw = sessionStorage.getItem(RACE_KEY);
    if (raw) setTimeout(() => sessionStorage.removeItem(RACE_KEY), 1500);
    return raw ? postFromRace(JSON.parse(raw), todayStr()) : null;
  } catch {
    return null;
  }
}

function Post({ orgId, uid }) {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(null);
  const [missing, setMissing] = useState(false);
  const made = useRef("");
  useEffect(() => {
    let live = true;
    if (id === made.current) return; // yeni gönderi kaydedilince adres değişti; zaten açık
    if (id === "new") {
      Promise.resolve().then(() => live && setState({ post: fromRace() || freshPost(), photo: "" }));
    } else {
      loadPost(orgId, id).then(
        async (p) => {
          if (!p) return live && setMissing(true);
          const photo = p.hasPhoto ? await loadPhoto(orgId, id).catch(() => "") : "";
          if (live) setState({ post: p, photo });
        },
        () => live && setMissing(true),
      );
    }
    return () => {
      live = false;
    };
  }, [orgId, id]);

  const onSave = useCallback(async (p, photo) => (made.current = await savePost(orgId, uid, p, photo)), [orgId, uid]);
  const onDelete = async (p) => {
    if (p.id) await deletePost(orgId, p);
    toast("Gönderi silindi");
    router.push("/posts");
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={id === "new" ? "Yeni gönderi" : "Gönderi"} back="/posts" />
      {missing ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Gönderi bulunamadı.</p>
      ) : !state ? (
        <Loading label="Gönderi yükleniyor" />
      ) : (
        <PostEditor start={state.post} startPhoto={state.photo} onSave={onSave} onDelete={onDelete} onRaces={() => loadRaces(orgId)} />
      )}
    </main>
  );
}
