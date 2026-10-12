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

const first = async (list, ctx, s, viaVoice) => {
  for (const f of list) {
    const r = await f(ctx, s, viaVoice);
    if (r !== undefined) return r;
  }
  return false;
};

// Yarış sayfası, fiş, yoklama velileri, alışveriş, doğum günü, kişi silme, mesaj grubu
const EXTRA = [yaris.raceHereCmd, para.receiptPayCmd, yoklama.absentNotifyCmd, alisveris.shopClearCmd, kisi.birthdayDeleteCmd, kisi.personDeleteCmd, mesaj.groupCreateCmd];
// Otel, sporcu kartı, fatura görevi, arama, aidat, kasa, nakit gelir, sporcu ekle/arşiv/sil
const MORE = [yaris.hotelAddCmd, sporcu.athleteOpenCmd, para.invoiceTaskCmd, arama.callCmd, para.duesCmd, para.cashCmd, para.incomeCmd, sporcu.athleteCmd];

export function runExtra(ctx, s, viaVoice) {
  return first(EXTRA, ctx, s, viaVoice);
}

export async function runMore(ctx, s, viaVoice) {
  const { runExtra } = ctx;
  if (await runExtra(s, viaVoice)) return true;
  return first(MORE, ctx, s, viaVoice);
}
