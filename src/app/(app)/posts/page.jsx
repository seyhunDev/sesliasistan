"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { PostList } from "@/features/posts/PostList";
import { archivePost, loadPosts } from "@/features/posts/posts";
import { Seg } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { saveSum } from "@/lib/homeTiles";

// Instagram gönderileri: görsel + açıklama hazırla, kaydet, paylaş (yalnız ana hesap)
export default function PostsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = !!profile && profile.role !== "staff";
  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  if (!owner || !profile?.orgId) return null;
  return <Posts orgId={profile.orgId} />;
}

function Posts({ orgId }) {
  const router = useRouter();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("live");
  const toast = useToast();
  // Ana sayfadaki Instagram kartı için kısa özet bu cihazda (ek okuma yok); arşivdekiler sayılmaz
  const sum = (list) => {
    const live = list.filter((p) => !p.archived);
    saveSum("posts", { count: live.length, last: live[0] ? { title: live[0].headline || live[0].topic.slice(0, 40), at: live[0].at } : null });
  };
  useEffect(() => {
    loadPosts(orgId).then(
      (list) => {
        setPosts(list);
        sum(list);
      },
      (e) => (setPosts([]), setError(e?.message || "Gönderiler alınamadı.")),
    );
  }, [orgId]);

  const live = posts?.filter((p) => !p.archived) || [];
  const old = posts?.filter((p) => p.archived) || [];
  // Köşedeki düğme: hemen listeden çıkar, yazılamazsa geri gelir
  const flip = async (p) => {
    const next = posts.map((x) => (x.id === p.id ? { ...x, archived: !p.archived } : x));
    setPosts(next);
    sum(next);
    try {
      await archivePost(orgId, p.id, !p.archived);
      toast(p.archived ? "Arşivden çıkarıldı" : "Arşive kaldırıldı");
    } catch {
      setPosts(posts);
      sum(posts);
      toast(p.archived ? "Arşivden çıkarılamadı" : "Arşive kaldırılamadı");
    }
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Instagram" sub={posts ? (live.length ? `${live.length} gönderi` : "Gönderi yok") + (old.length ? ` · arşivde ${old.length}` : "") : "Yükleniyor…"}>
        <Link href="/posts/new" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-[1.125rem]" />
          Gönderi
        </Link>
      </PageHeader>
      {error && <p className="mt-3 text-center text-[0.875rem] text-rec">{error}</p>}
      {posts && (old.length > 0 || tab === "old") && <Seg value={tab} onChange={setTab} options={[["live", "Gönderiler", live.length], ["old", "Arşiv", old.length]]} className="mt-3" />}
      {!posts ? <Loading label="Gönderiler yükleniyor" /> : <PostList posts={tab === "old" ? old : live} archive={tab === "old"} onArchive={flip} onOpen={(p) => router.push(`/posts/${p.id}`)} />}
    </main>
  );
}
