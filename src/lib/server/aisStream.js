// aisstream.io bağlantısı (sunucu, /api/sea): kısa süre dinler, Dikili kutusundaki mesajları gemi parçalarına çevirir.
import { SEA_BOX, parseAis } from "@/lib/sea";

const AIS_URL = "wss://stream.aisstream.io/v0/stream";
const TYPES = ["PositionReport", "StandardClassBPositionReport", "ExtendedClassBPositionReport", "ShipStaticData", "StaticDataReport"];

const text = async (d) => (typeof d === "string" ? d : d instanceof Blob ? d.text() : new TextDecoder().decode(d));

// Node 22'de WebSocket hazır gelir; işlev eski Node'da çalışırsa ws paketi kullanılır (2026-10-23: canlıda veri gelmedi)
async function socket(url) {
  if (typeof globalThis.WebSocket === "function") return new globalThis.WebSocket(url);
  const { default: WS } = await import("ws");
  return new WS(url);
}

// aisstream'e bağlan, ms boyunca dinle, gelen parçaları döndür: { parts, err, n: gelen mesaj sayısı }
export async function collect(key, ms, url = AIS_URL) {
  let ws;
  try {
    ws = await socket(url);
  } catch (e) {
    return { parts: [], err: e, n: 0 };
  }
  return new Promise((done) => {
    const parts = [];
    let n = 0;
    const end = (err) => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      done({ parts, err, n });
    };
    const timer = setTimeout(() => end(null), ms);
    let got = false;
    ws.onopen = () => ws.send(JSON.stringify({ APIKey: key, BoundingBoxes: [SEA_BOX], FilterMessageTypes: TYPES }));
    ws.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(await text(ev.data));
        if (msg?.error) return end(new Error(`aisstream: ${msg.error}`));
        got = true;
        n++;
        const p = parseAis(msg);
        if (p) parts.push(p);
      } catch {}
    };
    ws.onerror = (e) => end(new Error(`bağlantı: ${e?.message || "hata"}`));
    // Hiç mesaj gelmeden kapandıysa (ör. anahtar reddedildi) hata say
    ws.onclose = (e) => end(got ? null : new Error(`kapandı ${e?.code || ""} ${e?.reason || ""}`.trim()));
  });
}

