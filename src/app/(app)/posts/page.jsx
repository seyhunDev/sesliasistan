"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { PostList } from "@/features/posts/PostList";
import { loadPosts } from "@/features/posts/posts";
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
  useEffect(() => {
    loadPosts(orgId).then(
      (list) => {
        setPosts(list);
        // Ana sayfadaki Instagram kartı için kısa özet bu cihazda (ek okuma yok)
        saveSum("posts", { count: list.length, last: list[0] ? { title: list[0].headline || list[0].topic.slice(0, 40), at: list[0].at } : null });
      },
      (e) => (setPosts([]), setError(e?.message || "Gönderiler alınamadı.")),
    );
  }, [orgId]);

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Instagram" sub={posts ? (posts.length ? `${posts.length} gönderi` : "Gönderi yok") : "Yükleniyor…"}>
        <Link href="/posts/new" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-[1.125rem]" />
          Gönderi
        </Link>
      </PageHeader>
      {error && <p className="mt-3 text-center text-[0.875rem] text-rec">{error}</p>}
      {!posts ? <Loading label="Gönderiler yükleniyor" /> : <PostList posts={posts} onOpen={(p) => router.push(`/posts/${p.id}`)} />}
    </main>
  );
}
