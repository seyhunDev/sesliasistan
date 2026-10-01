"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatList } from "@/features/chat/ChatList";
import { ChatView } from "@/features/chat/ChatView";

// Mesajlar: /messages → sohbet listesi, /messages?c=<sohbet> → sohbet ekranı
export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <Messages />
    </Suspense>
  );
}

function Messages() {
  const c = useSearchParams().get("c") || "";
  return /^[\w-]{1,120}$/.test(c) ? <ChatView key={c} cid={c} /> : <ChatList />;
}
