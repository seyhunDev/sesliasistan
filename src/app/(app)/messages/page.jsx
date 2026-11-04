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

// Mac ve yatay iPad (sol menü, ≥64rem): iki bölme, solda sohbet listesi hep açık, sağda seçili sohbet (globals.css MESAJLAR).
// Telefonda ve dik iPad'de eskisi gibi ya liste ya sohbet (sohbet açıkken liste .chat-hide ile gizli).
function Messages() {
  const c = useSearchParams().get("c") || "";
  const open = /^[\w-]{1,120}$/.test(c);
  return (
    <>
      <div className={`chat-pane ${open ? "chat-hide" : ""}`}>
        <ChatList />
      </div>
      {open ? <ChatView key={c} cid={c} /> : <div className="chat-blank" aria-hidden />}
    </>
  );
}
