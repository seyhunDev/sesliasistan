"use client";

import { BarButton, VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useAdd } from "./AddProvider";

const PH = { plan: "Yeni plan yaz", task: "Yeni görev yaz", note: "Yeni not yaz" };
const FORM = { plan: "Planı elle ekle", task: "Görevi elle ekle", note: "Notu elle ekle" };

// Tür sayfalarının altındaki ekleme çubuğu: + ile formla, "Konuş" / "Yaz" ile ana sayfadaki asistan paneli açılır.
// prefer: panel, soru olmayan ilk cümleyi bu türde kayıt taslağına çevirir (ör. Notlar'da "yelken siparişi" → not).
// extra: + düğmesinin yanına eklenecek düğmeler (ör. notlarda toplantı kaydı)
export function AddBar({ type, extra }) {
  const { openAdd } = useAdd();
  const { openAssistant } = useAssistant();
  return (
    <VoiceTextBar
      placeholder={PH[type]}
      onMic={() => openAssistant({ listen: true, prefer: type })}
      onSend={(t) => openAssistant({ text: t, prefer: type })}
      leading={
        <>
          <BarButton icon="plus" label={FORM[type]} onClick={() => openAdd({ type })} />
          {extra}
        </>
      }
    />
  );
}
