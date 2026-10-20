// Elle yapılan işlerin asistanla yapılanları (assistMore.js komutları): sırayla denenir, ilk sahiplenen yapar.
// Her komut kendi işinin dosyasında; dönüş: true yapıldı, false bırak (sonrakilere bakma), undefined benim değil.
import * as yaris from "./yaris";
import * as para from "./para";
import * as yoklama from "./yoklama";
import * as alisveris from "./alisveris";
import * as kisi from "./kisi";
import * as mesaj from "./mesaj";
import * as sporcu from "./sporcu";
import * as arama from "./arama";
import * as boykilo from "./boykilo";
import * as yarisMedya from "./yarisMedya";
import * as antrenmanYaris from "./antrenmanYaris";

const first = async (list, ctx, s, viaVoice) => {
  for (const f of list) {
    const r = await f(ctx, s, viaVoice);
    if (r !== undefined) return r;
  }
  return false;
};

// Yarış sayfası, fiş, yoklama velileri, alışveriş, doğum günü, kişi silme, mesaj grubu
const EXTRA = [yaris.raceHereCmd, para.receiptPayCmd, para.receiptScopeCmd, yoklama.absentNotifyCmd, alisveris.shopClearCmd, kisi.birthdayDeleteCmd, kisi.personDeleteCmd, mesaj.groupCreateCmd];
// Yarış günü (rüzgâr kaydı, start sayacı), antrenman yarışı sonucu, sporcu boy/kilo, otel, kişi sayfası, sporcu kartı, fatura görevi, arama, aidat, kasa, nakit gelir, sporcu ekle/arşiv/sil
const MORE = [yarisMedya.timerCmd, yarisMedya.windLogCmd, antrenmanYaris.trainingResultCmd, boykilo.athleteBodyCmd, yaris.hotelAddCmd, kisi.personOpenCmd, sporcu.athleteOpenCmd, para.invoiceTaskCmd, arama.callCmd, para.duesCmd, para.cashCmd, para.incomeCmd, sporcu.athleteCmd];

export function runExtra(ctx, s, viaVoice) {
  return first(EXTRA, ctx, s, viaVoice);
}

// Görev listesindeki numaralı iş (actRun.js routeFromAct): komut alanlardan hazır gelir, cümle yeniden okunmaz
const PRE = { income: para.incomeCmd, dues: para.duesCmd, call: arama.callCmd, athlete: sporcu.athleteCmd };

export async function runMore(ctx, s, viaVoice, pre = null) {
  const { runExtra } = ctx;
  if (pre && PRE[pre.kind]) {
    const r = await PRE[pre.kind](ctx, s, viaVoice, pre.cmd);
    if (r !== undefined) return r;
  }
  if (await runExtra(s, viaVoice)) return true;
  return first(MORE, ctx, s, viaVoice);
}
