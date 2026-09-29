"use client";

import { BarButton, VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { useAdd } from "./AddProvider";

const PH = { plan: "Yeni plan yaz", task: "Yeni görev yaz", note: "Yeni not yaz" };
const FORM = { plan: "Planı elle ekle", task: "Görevi elle ekle", note: "Notu elle ekle" };

// Tür sayfalarının altındaki ekleme çubuğu: + ile formla, "Konuş" ile sesle, "Yaz" ile yazarak ekle.
// Aynı sayfada hem ekler hem görürsün; ayrı ekleme sayfasına gitmek gerekmez.
// extra: + düğmesinin yanına eklenecek düğmeler (ör. notlarda toplantı kaydı)
export function AddBar({ type, extra }) {
  const { openAdd } = useAdd();
  return (
    <VoiceTextBar
      placeholder={PH[type]}
      onMic={() => openAdd({ listen: true, voice: true, prefer: type })}
      onSend={(t) => openAdd({ text: t, prefer: type })}
      leading={
        <>
          <BarButton icon="plus" label={FORM[type]} onClick={() => openAdd({ type })} />
          {extra}
        </>
      }
    />
  );
}
