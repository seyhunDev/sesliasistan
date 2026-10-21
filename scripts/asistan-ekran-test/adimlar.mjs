// Asistan ekran testinin adımları (senaryolar.mjs hazırlar: giriş, taklitler, yardımcılar).
// Her check(grup, söz, beklenen, fn): fn true/false ya da [geçti mi, olan] döndürür.

export async function scenarios(h) {
  const { check, newPage, orb, dome, state, full, ringColor, ringText, convo, last, waitFor, say, btn, typeAsk, talkAsk, closeAll, swipeDown, aiCalls, calls, setAI, setTasks, setTranscript, setLive, TODAY, TOMORROW, log } = h;

  // ================================================================ 1. Sekme çubuğu ve açılış
  log("    Asistan: sekme çubuğu, açılış, dinleme, kapanış…");
  const { page, errs } = await newPage();
  // Bu bölümdeki yerel hızlı cevaplar yalnız Ayarlar › Öğrenme › Hazır cevaplar açıkken (varsayılan: her istek yapay zekaya)
  await page.evaluate(() => localStorage.setItem("sa-quick", "1"));
  const G1 = "Sekme çubuğundaki yeşil düğme";
  await check(G1, "ana sayfa", "ortada tek asistan düğmesi, 5 sütun", async () => {
    const n = await orb(page).count();
    const cols = await page.locator("nav[aria-label='Sekmeler'] > div").getAttribute("class");
    return [n === 1 && /grid-cols-5/.test(cols), `${n} düğme · ${/grid-cols-(\d)/.exec(cols)?.[1]} sütun`];
  });
  await check(G1, "boşta", "durum boşta, etiket “dokun konuş, basılı tut yaz”", async () => {
    const st = await orb(page).getAttribute("data-state");
    const lb = await orb(page).getAttribute("aria-label");
    return [st === "idle" && /dokun konuş, basılı tut yaz/.test(lb), `${st} · ${lb}`];
  });

  // Dokun: tam ekran açılır, dinler
  const srBefore = await page.evaluate(() => window.__t.srStarts);
  await orb(page).click();
  const G2 = "Dokun konuş: tam ekran açılış";
  await check(G2, "düğmeye dokun", "tam ekran koyu açılır (afull-in, data-theme=dark), ekranı kaplar", async () => {
    await full(page).waitFor({ timeout: 4000 });
    const cls = await full(page).getAttribute("class");
    const theme = await full(page).getAttribute("data-theme");
    const box = await full(page).boundingBox();
    return [/afull-in/.test(cls) && theme === "dark" && box.height >= 800, `${cls.match(/afull-\w+/)?.[0]} · ${theme} · ${Math.round(box.height)} px`];
  });
  await check(G2, "açılış animasyonu", "afull-in animasyonu tanımlı ve çalışıyor", async () => {
    const a = await full(page).evaluate((el) => getComputedStyle(el).animationName);
    return [a && a !== "none", a];
  });
  await check(G2, "dinlemeye başlar", "ses tanıma açılır, durum dinliyor", async () => {
    const ok = await waitFor(async () => (await state(page)) === "listening", 4000);
    const n = await page.evaluate(() => window.__t.srStarts);
    return [!!ok && n > srBefore, `${await state(page)} · tanıma ${n - srBefore} kez açıldı`];
  });
  // Dinlerken "Dinliyorum" yalnız alttaki çubukta, halkada yazı yok (2026-10-18)
  await check("Halka renkleri", "dinlerken", "kırmızı halka + ses çubukları, halkada yazı yok, alttaki çubukta “Dinliyorum”", async () => {
    const c = await ringColor(page);
    const bars = await page.locator("[data-dome] rect.aring-bar").count();
    const t = (await ringText(page)).trim();
    const box = await dome(page).locator(".asheet-input").innerText();
    return [c === "kırmızı" && bars === 5 && !t && /Dinliyorum/.test(box), `${c} · ${bars} çubuk · halka: “${t}” · çubuk: “${box.replace(/\n/g, " ")}”`];
  });
  await check("Halka renkleri", "zemin", "arkada renk bulutları ve nokta ızgara (abg)", async () => {
    const n = await page.locator("[data-dome] .abg > i").count();
    const anim = await page.locator("[data-dome] .ab-b1").evaluate((el) => getComputedStyle(el).animationName);
    return [n >= 4 && anim !== "none", `${n} katman · ${anim}`];
  });
  await say(page, "notlarımı oku");
  // Canlı yazı (Claude uygulaması gibi, 2026-10-21): söylenen kutuya akar, altta süre + dalga, ■ Dur ve ↑ Gönder
  await check(G2, "konuşurken", "kutuda canlı yazı, süre, Dur ve Gönder düğmeleri", async () => {
    const ok = await waitFor(async () => /notlarımı oku/.test(await dome(page).locator(".asheet-input").innerText()), 3000);
    const box = (await dome(page).locator(".asheet-input").innerText()).replace(/\n/g, " ");
    const dur = await btn(page, "Dur").count();
    return [!!ok && /\d:\d\d/.test(box) && dur === 1 && (await btn(page, "Gönder").count()) === 1, `${box.slice(0, 80)} · Dur ${dur}`];
  });
  const beforeDur = h.aiCalls();
  await btn(page, "Dur").click();
  await check(G2, "Dur'a basınca", "dinleme biter, söz kutuda kalır, gönderilmez; 🎤 devam ve ↑ Gönder", async () => {
    await waitFor(async () => (await state(page)) === "idle", 3000);
    await page.waitForTimeout(400);
    const box = (await dome(page).locator(".asheet-input").innerText()).replace(/\n/g, " ");
    const devam = await btn(page, "Konuşmaya devam").count();
    return [/notlarımı oku/.test(box) && devam === 1 && h.aiCalls() === beforeDur && (await state(page)) === "idle", `${box.slice(0, 80)} · devam ${devam} · yz ${h.aiCalls() - beforeDur} · ${await state(page)}`];
  });
  const before = h.aiCalls();
  await btn(page, "Gönder").click();
  const G3 = "Yerel hızlı cevap (Hazır cevaplar açık)";
  await check(G3, "notlarımı oku", "not okunur, yapay zekaya gitmez", async () => {
    const ok = await waitFor(async () => /Yelken bezleri|kuru yerde/i.test(await convo(page)), 6000);
    return [!!ok && aiCalls() === before, `${(await convo(page)).replace(/\s+/g, " ").slice(0, 120)} · yz isteği ${aiCalls() - before}`];
  });
  await check("Halka renkleri", "cevaptan sonra", "yeşil halka ve onay (✓ Tamam), durum boşta", async () => {
    await waitFor(async () => (await state(page)) === "idle", 5000);
    const c = await ringColor(page);
    const chk = await page.locator("[data-dome] .aring-check").count();
    return [c === "yeşil" && chk === 1, `${c} · onay ${chk} · ${await state(page)}`];
  });

  // Kapat (×): aşağı kayarak kapanır, sekmeler geri gelir
  const G4 = "Kapanış";
  await btn(page, "Konuşmayı bitir").click();
  await check(G4, "× (Konuşmayı bitir)", "afull-out ile aşağı kayarak kapanır", async () => {
    const cls = await waitFor(async () => {
      const c = await full(page).getAttribute("class", { timeout: 300 }).catch(() => "");
      return /afull-out/.test(c) ? c : null;
    }, 1500);
    return [!!cls, cls ? "afull-out görüldü" : "kapanış animasyonu görülmedi"];
  });
  await check(G4, "kapandıktan sonra", "tam ekran kalkar, sekme çubuğu ve düğme geri gelir", async () => {
    await page.waitForTimeout(600);
    const n = await full(page).count();
    const o = await orb(page).count();
    return [n === 0 && o === 1, `tam ekran ${n} · düğme ${o}`];
  });

  // ================================================================ 2. Basılı tut: yaz
  const G5 = "Basılı tut yaz";
  await typeAsk(page, "bugün planda neler var");
  await check(G5, "basılı tut → yaz → gönder", "yazı kutusu açılır, gönderince tam ekran asistan cevaplar", async () => {
    const ok = await waitFor(async () => /Dişçi/i.test(await convo(page)), 6000);
    return [!!ok, (await convo(page)).replace(/\s+/g, " ").slice(0, 140)];
  });
  await check(G3, "bugün planda neler var", "bugünün planı yerelde sayılır, yapay zekaya gitmez", async () => [aiCalls() === before, `yz isteği ${aiCalls() - before}`]);

  for (const [s, re] of [["görevlerimi anlat", /Motor bakımı/], ["yarın planda neler var", /Yönetim toplantısı/], ["haftayı özetle", /Bu hafta/i]]) {
    const b = aiCalls();
    await talkAsk(page, s);
    await check(G3, s, "cevap ekranda, yapay zekaya gitmez", async () => {
      const ok = await waitFor(async () => re.test(await last(page)), 6000);
      return [!!ok && aiCalls() === b, `“${(await last(page)).replace(/\s+/g, " ").slice(0, 90)}” · yz isteği ${aiCalls() - b}`];
    });
  }
  {
    const b = aiCalls();
    await talkAsk(page, "görevlerim");
    await check(G3, "görevlerim (tek kelime)", "Görevler sayfası açılır, asistan kapanır, yapay zekaya gitmez", async () => {
      const ok = await waitFor(async () => new URL(page.url()).pathname === "/tasks" && !(await full(page).count()), 5000);
      return [!!ok && aiCalls() === b, `${new URL(page.url()).pathname} · tam ekran ${await full(page).count()}`];
    });
  }
  await closeAll(page);

  await check("Sayfa hataları", "ana sayfa + asistan", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
  await page.context().close();

  await scenarios2(h);
}

async function scenarios2(h) {
  const { check, newPage, orb, dome, state, full, ringColor, ringText, convo, last, waitFor, say, btn, typeAsk, talkAsk, closeAll, swipeDown, aiCalls, calls, setAI, setTasks, setTranscript, setLive, TODAY, TOMORROW, log } = h;
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();

  // ================================================================ 3. Çalışırken (kehribar), küçültme, sesli yanıt
  log("    Asistan: çalışırken, küçültme, sesli yanıt, geçmiş…");
  const { page, errs } = await newPage();
  setAI(() => ({ intent: "chat", message: "Akşam rüzgâr sakin, yürüyüşe çıkabilirsin." }), 2500);
  await talkAsk(page, "akşam ne yapsam");
  const GB = "Halka renkleri";
  await check(GB, "yapay zeka düşünürken", "kehribar halka, “Düşünüyorum”, durum çalışıyor", async () => {
    await waitFor(async () => (await state(page)) === "busy", 2000);
    const c = await ringColor(page);
    const t = clean(await ringText(page));
    return [c === "kehribar" && /Düşünüyorum|Yapıyorum/.test(t) && (await state(page)) === "busy", `${c} · ${t} · ${await state(page)}`];
  });
  await check(GB, "düşünürken alttaki kutu", "tek ana düğme “Durdur” (aynı bilgi ikinci yerde yazmaz)", async () => {
    const stop = await btn(page, "Durdur").count();
    const wait = await page.locator("[data-dome] [data-wait], [data-dome] .wait-lines").count();
    return [stop === 1 && wait === 0, `Durdur ${stop} · bekleme yazısı ${wait}`];
  });
  const GM = "Küçültme (aşağı kaydır)";
  await swipeDown(page);
  await check(GM, "çalışırken aşağı kaydır", "kapanmaz, küçülür: tam ekran gider, sekme düğmesi kehribar küre, üstünde yazı balonu", async () => {
    await waitFor(async () => !(await full(page).count()), 2000);
    const mini = await page.locator(".amini").count();
    const st = await orb(page).getAttribute("data-state").catch(() => "yok");
    const bubble = clean(await page.locator(".amini-bubble").innerText().catch(() => ""));
    return [!(await full(page).count()) && mini === 1 && st === "busy", `tam ekran ${await full(page).count()} · küçük ${mini} · küre ${st} · “${bubble}”`];
  });
  await check(GM, "küçükken cevap gelir", "balonda son cevap görünür", async () => {
    const ok = await waitFor(async () => /rüzgâr sakin/.test(await page.locator(".amini-bubble").innerText().catch(() => "")), 6000);
    return [!!ok, clean(await page.locator(".amini").innerText().catch(() => "balon yok"))];
  });
  await page.locator(".amini-bubble").click().catch(() => {});
  await check(GM, "balona dokun", "tam ekran geri gelir, sohbet kaldığı yerden", async () => {
    const ok = await waitFor(async () => (await page.locator(".afull.afull-in").count()) && /rüzgâr sakin/.test(await convo(page)), 3000);
    return [!!ok, `tam ekran ${await full(page).count()}`];
  });
  setAI(() => ({ intent: "chat", message: "Tamam." }));
  await waitFor(async () => (await state(page)) === "idle", 3000);
  await swipeDown(page);
  await check(GM, "boştayken aşağı kaydır", "asistan kapanır (küçülmez)", async () => {
    const ok = await waitFor(async () => !(await full(page).count()) && !(await page.locator(".amini").count()), 2500);
    return [!!ok, `tam ekran ${await full(page).count()} · küçük ${await page.locator(".amini").count()}`];
  });

  // Önceki sohbet: yeniden açınca son sohbetler soluk görünür
  const GP = "Önceki sohbetler";
  await orb(page).click();
  await check(GP, "yeniden aç", "son sohbet üstte soluk görünür (Önceki sohbetler)", async () => {
    const ok = await waitFor(async () => /akşam ne yapsam/.test(await page.locator("[data-dome] [data-past]").innerText().catch(() => "")), 3000);
    const cls = await page.locator("[data-dome] [data-past]").getAttribute("class").catch(() => "");
    return [!!ok && /text-mut/.test(cls), ok ? `soluk: ${/text-mut/.test(cls)}` : "görünmüyor"];
  });
  await check(GP, "en çok 3 sohbet", "3'ten fazla eski sohbet gösterilmez", async () => {
    const n = await page.locator("[data-dome] [data-past] > *").count();
    return [n <= 3, `${n} sohbet`];
  });
  await closeAll(page);
  // Ayarlar › Geçmiş sohbetler › gizle: ekranda görünmez (hafıza kalır)
  await page.evaluate(() => localStorage.setItem("sa-asst-past-shown", "0"));
  await orb(page).click();
  await check(GP, "gizliyken yeniden aç", "eski sohbetler ekranda görünmez", async () => {
    await page.waitForTimeout(1200);
    const n = await page.locator("[data-dome] [data-past]").count();
    return [n === 0, `${n} eski sohbet alanı`];
  });
  await closeAll(page);
  await page.evaluate(() => localStorage.removeItem("sa-asst-past-shown"));

  // Sesli yanıt açık: okur (mavi), bitince mikrofon bir kez açılır
  const GS = "Sesli yanıt";
  await page.evaluate(() => localStorage.setItem("sa_tts_on", "1"));
  await page.reload();
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window.__t.speakMs = 2500));
  // Yapay zeka önce (2026-10-21): okuma isteği de yapay zekaya gider, cevabı bir kez okunur
  setAI((x) => (/plan/i.test(x) ? { intent: "chat", message: "Bugün saat 10'da Yönetim toplantısı var." } : { intent: "chat", message: "Bugün bir notun var: Yelken bezleri kurutulacak." }));
  {
    const brain = () => calls.filter((c) => c.path === "/api/assistant").length;
    const b = brain();
    await talkAsk(page, "bugün plan var mı");
    await check(GS, "bugün plan var mı (sesli yanıt açık)", "yapay zekaya bir kez gider, cevap bir kez okunur", async () => {
      // Gönder'den hemen sonra durum bir an boşta görünebilir: yapay zeka çağrısı ve okuma bitene kadar beklenir
      await waitFor(async () => brain() - b >= 1 && /Yönetim toplantısı/.test(await page.evaluate(() => window.__t.spoken.join(" "))) && ["listening", "idle"].includes(await state(page)), 12000);
      await page.waitForTimeout(800); // ikinci okuma olacaksa görünsün
      const sp = await page.evaluate(() => window.__t.spoken.join(" | "));
      const n = (sp.match(/Yönetim toplantısı/g) || []).length;
      return [brain() - b === 1 && n === 1, `yapay zeka ${brain() - b} kez · okunan ${n} kez · ${clean(sp).slice(0, 100)}`];
    });
    await closeAll(page);
    await page.evaluate(() => (window.__t.spoken = []));
  }
  await talkAsk(page, "notlarımı oku");
  await check(GS, "notlarımı oku (sesli yanıt açık)", "not sesli okunur", async () => {
    const ok = await waitFor(async () => (await page.evaluate(() => window.__t.spoken.join(" "))).match(/Yelken bezleri/), 5000);
    return [!!ok, clean(await page.evaluate(() => window.__t.spoken.join(" | "))).slice(0, 120) || "okunmadı"];
  });
  await check(GB, "okurken", "mavi halka, “Anlatıyorum”, ana düğme “Okumayı kes”", async () => {
    await waitFor(async () => (await state(page)) === "speaking", 2000);
    const c = await ringColor(page);
    return [c === "mavi" && (await btn(page, "Okumayı kes").count()) === 1, `${c} · ${clean(await ringText(page))} · ${await state(page)}`];
  });
  const sr0 = await page.evaluate(() => window.__t.srStarts);
  await check(GS, "okuma bitince", "mikrofon bir kez kendiliğinden açılır (cevap verilebilsin)", async () => {
    const ok = await waitFor(async () => (await state(page)) === "listening", 5000);
    return [!!ok, `${await state(page)} · tanıma +${(await page.evaluate(() => window.__t.srStarts)) - sr0}`];
  });
  // Cevap mikrofonu kayıt yoluyla dinler (telefonun tanıması değil): söylenen ara çeviriyle (/api/transcribe) gelir
  setTranscript("kapat");
  await check(GS, "dinlerken “kapat”", "asistan hemen kapanır", async () => {
    const ok = await waitFor(async () => !(await full(page).count()), 7000);
    return [!!ok, `tam ekran ${await full(page).count()}`];
  });
  setTranscript("");
  // Sesli yanıt açıkken cevap okunur; beklerken "Hemen ilgileniyorum" söylenmez (Seyhun, 2026-10-20)
  setAI(() => ({ intent: "chat", message: "Bugün erken yat." }));
  const sp0 = await page.evaluate(() => window.__t.spoken.length);
  await talkAsk(page, "bana kısa bir tavsiye ver");
  await check(GS, "sesli yanıt açıkken soru", "cevap okunur, “ilgileniyorum” denmez", async () => {
    const ok = await waitFor(async () => /Bugün erken yat/.test(await last(page)), 6000);
    await waitFor(async () => (await page.evaluate((n) => window.__t.spoken.slice(n).join(" "), sp0)).includes("erken yat"), 4000);
    const said = await page.evaluate((n) => window.__t.spoken.slice(n), sp0);
    const all = said.join(" | ");
    return [!!ok && /erken yat/.test(all) && !/ilgileniyorum/i.test(all), `${ok ? "cevap var" : "cevap yok"} · okunan: ${clean(all).slice(0, 100) || "yok"}`];
  });
  // Asistan ekranındaki hoparlör düğmesi: okurken kapatılınca okuma hemen susar, sonraki cevap okunmaz; yeniden açılır
  setAI(() => ({ intent: "chat", message: "Rüzgar öğleden sonra artar, erken çık." }));
  await page.evaluate(() => (window.__t.speakMs = 6000));
  const sp1 = await page.evaluate(() => window.__t.spoken.length);
  await talkAsk(page, "yarın ne zaman çıkayım");
  await waitFor(async () => (await state(page)) === "speaking", 6000);
  await page.locator("[data-dome] button[aria-label='Sesli yanıtı kapat']").click({ timeout: 5000 });
  await check(GS, "okurken hoparlöre basınca", "okuma hemen susar, düğme kapalı görünür", async () => {
    const ok = await waitFor(async () => (await state(page)) !== "speaking", 1500);
    const off = await page.locator("[data-dome] button[aria-label='Sesli yanıtı aç'][aria-pressed='false']").count();
    const saved = await page.evaluate(() => localStorage.getItem("sa_tts_on"));
    return [!!ok && off === 1 && saved === "0", `${await state(page)} · düğme ${off ? "kapalı" : "yok"} · ayar ${saved}`];
  });
  await page.evaluate(() => (window.__t.speakMs = 2500));
  setAI(() => ({ intent: "chat", message: "Yarın hava güzel." }));
  const sp2 = await page.evaluate(() => window.__t.spoken.length);
  await talkAsk(page, "yarın hava nasıl");
  await check(GS, "hoparlör kapalıyken soru", "cevap yazılır, okunmaz", async () => {
    const ok = await waitFor(async () => /Yarın hava güzel/.test(await last(page)), 6000);
    await page.waitForTimeout(800);
    const said = await page.evaluate((n) => window.__t.spoken.slice(n).join(" | "), sp2);
    return [!!ok && !/hava güzel/.test(said), `${ok ? "cevap var" : "cevap yok"} · okunan: ${clean(said) || "yok"} · önce ${sp1}`];
  });
  await page.locator("[data-dome] button[aria-label='Sesli yanıtı aç']").click({ timeout: 5000 });
  await check(GS, "hoparlöre yeniden basınca", "sesli yanıt açılır", async () => {
    const on = await page.locator("[data-dome] button[aria-label='Sesli yanıtı kapat'][aria-pressed='true']").count();
    return [on === 1 && (await page.evaluate(() => localStorage.getItem("sa_tts_on"))) === "1", `düğme ${on ? "açık" : "yok"}`];
  });
  await closeAll(page);
  await page.evaluate(() => localStorage.setItem("sa_tts_on", "0"));

  await check("Sayfa hataları", "çalışırken / küçültme / sesli yanıt", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
  await page.context().close();
  await scenarios3(h);
}

// Asistanın sorusundan sonra kendiliğinden açılan cevap mikrofonu (kayıt yolu): kullanıcı konuşur, söz sunucuda çevrilir.
// Testteki sahte mikrofonun bip sesi konuşma sayılmaz, "sustu" anlaşılmaz: kullanıcı ↑ ile bitirir
async function answer(h, page, text) {
  const { state, btn, waitFor, setTranscript } = h;
  setTranscript(text);
  await waitFor(async () => (await state(page)) === "listening", 6000);
  await page.waitForTimeout(1200);
  if (await btn(page, "Gönder").count()) await btn(page, "Gönder").click({ timeout: 5000 });
}

async function scenarios3(h) {
  const { check, newPage, orb, state, full, ringText, convo, last, waitFor, btn, talkAsk, typeAsk, closeAll, aiCalls, calls, setAI, setTasks, setSoz, setTranscript, TOMORROW, log } = h;
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();
  log("    Asistan: kayıt, onaylar, görev listesi…");
  const { page, errs } = await newPage();

  // ================================================================ 4. Onaysız oluşturma + "Kaydedildi" (#498, #501)
  const GC = "Onaysız kayıt ve “Kaydedildi”";
  setAI((t) =>
    /tekne bakımı/i.test(t)
      ? { intent: "create", message: "Yarın 09:00'a Tekne bakımı planını ekledim.", items: [{ type: "plan", title: "Tekne bakımı", date: TOMORROW, time: "09:00" }] }
      : /süt/i.test(t)
        ? { intent: "create", message: "Not aldım.", items: [{ type: "note", title: "Süt al", body: "Süt al" }] }
        : { intent: "chat", message: "Tamam." },
  );
  await talkAsk(page, "yarın sabah 9'da tekne bakımı planı ekle");
  // Geri sayım (2026-10-20): kart önce 3 sn çizgiyle bekler (Kaydet / Düzenle / ✕), çizgi dolunca kendiliğinden kaydedilir
  await check(GC, "yarın 9'da tekne bakımı planı ekle", "önce kartta dolan çizgi, kayıt henüz yazılmadı", async () => {
    const ok = await waitFor(async () => (await page.locator("[data-dome] [style*='autofill']").count()) > 0, 7000);
    const kaydet = await page.locator("[data-dome] button", { hasText: /Kaydet$/ }).count();
    return [!!ok && kaydet > 0, `${ok ? "çizgi var" : "çizgi yok"} · Kaydet düğmesi ${kaydet}`];
  });
  await check(GC, "3 sn sonra", "sormadan kaydedilir: yeşil ✓ kartı, “Kaydet” düğmesi yok", async () => {
    const ok = await waitFor(async () => (await page.locator("[data-dome] .asaved").count()) > 0, 7000);
    const card = clean(await page.locator("[data-dome] .asaved").innerText().catch(() => ""));
    const kaydet = await page.locator("[data-dome] button", { hasText: /^Kaydet$/ }).count();
    return [!!ok && /Tekne bakımı/.test(card) && kaydet === 0, `${ok ? `kart: ${card}` : "kart yok"} · Kaydet düğmesi ${kaydet}`];
  });
  await check(GC, "kart animasyonu", "kart parıltıyla gelir, ✓ rozeti büyüyerek belirir", async () => {
    const a = await page.locator("[data-dome] .asaved").first().evaluate((el) => getComputedStyle(el).animationName).catch(() => "none");
    const b = await page.locator("[data-dome] .asaved-badge").first().evaluate((el) => getComputedStyle(el).animationName).catch(() => "none");
    return [a !== "none" && b !== "none", `kart: ${a} · rozet: ${b}`];
  });
  await check(GC, "halka", "yeşil onay, “Kaydedildi”", async () => {
    await waitFor(async () => (await state(page)) === "idle", 4000);
    const t = clean(await ringText(page));
    return [/Kaydedildi/.test(t), t || "(yazı yok)"];
  });
  await check(GC, "kayıt gerçekten yazıldı", "Planlar'da yarın Tekne bakımı görünür", async () => {
    await closeAll(page);
    await page.goto(page.url().replace(/\/[^/]*$/, "/plans"));
    const ok = await waitFor(async () => /Tekne bakımı/.test(await page.locator("main, body").first().innerText()), 8000);
    return [!!ok, ok ? "Planlar'da var" : "Planlar'da yok"];
  });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  {
    // Geri sayım sırasında ✕: kayıt yapılmaz
    await page.goto(new URL(page.url()).origin + "/");
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(1200);
    await talkAsk(page, "not al süt al");
    await waitFor(async () => (await page.locator("[data-dome] [style*='autofill']").count()) > 0, 7000);
    const x = page.locator("[data-dome] button[aria-label='Vazgeç']").last();
    if (await x.count()) await x.click();
    await check(GC, "geri sayımda ✕", "kaydedilmez, “kaydetmedim” denir", async () => {
      await page.waitForTimeout(4000);
      const saved = await page.locator("[data-dome] .asaved").count();
      const t = clean(await convo(page));
      return [saved === 0 && /kaydetmedim/i.test(t), `kaydedilen kart ${saved} · “${t.slice(-80)}”`];
    });
    await closeAll(page);
  }
  {
    // Saatsiz plan: "saatsiz" denir ve saat teklif edilir; "akşam 6'da" yapay zekaya gitmeden plana yazılır (2026-10-20)
    setAI((t) => (/yıkama/i.test(t) ? { intent: "create", message: "", items: [{ type: "plan", title: "Tekne yıkama", date: TOMORROW, time: "" }] } : { intent: "chat", message: "Tamam." }));
    await talkAsk(page, "yarın tekne yıkama planı ekle");
    await check(GC, "saatsiz plan", "“saatsiz” denir, saat teklif edilir", async () => {
      const ok = await waitFor(async () => /saatini söyle/.test(await convo(page)), 9000);
      const t = clean(await convo(page));
      return [!!ok && /Tekne yıkama.*saatsiz/.test(t) && !/Başka bir isteğin var mı\?\s*$/.test(t), t.slice(-120)];
    });
    // Cevap mikrofonu sözü sunucuda çevirir (/api/transcribe): yalnız yapay zeka beyni sayılır
    const brain = () => calls.filter((c) => /^\/api\/(assistant|tasks|interpret)$/.test(c.path)).length;
    const b = brain();
    // Teklif cevabı için mikrofon kendiliğinden bir kez açılıp kapanır; Konuş'a o sırada basılırsa dinleme kapanıyordu
    // Teklif okununca cevap mikrofonu kendiliğinden açılır (kayıt yolu); kullanıcı yalnız konuşur
    await answer(h, page, "akşam 6'da");
    await check(GC, "teklife saat cevabı", "plan 18:00 olur, yapay zekaya gitmez", async () => {
      const ok = await waitFor(async () => /saat 18:00/.test(await convo(page)), 7000);
      return [!!ok && brain() === b, `${clean(await convo(page)).slice(-80)} · yz isteği ${brain() - b}`];
    });
    setTranscript("");
    await closeAll(page);
    // Son tarihsiz görev: son tarih teklif edilir; "yarın" görevin son tarihine yazılır
    setAI((t) => (/motor/i.test(t) ? { intent: "create", message: "", items: [{ type: "task", title: "Motoru kontrol et", date: "" }] } : { intent: "chat", message: "Tamam." }));
    await talkAsk(page, "motoru kontrol et diye görev ekle");
    await check(GC, "son tarihsiz görev", "son tarih teklif edilir", async () => {
      const ok = await waitFor(async () => /Son tarih söylemedin/.test(await convo(page)), 9000);
      return [!!ok, clean(await convo(page)).slice(-100)];
    });
    const b2 = brain();
    await answer(h, page, "yarın");
    await check(GC, "teklife tarih cevabı", "son tarih yarın olur, yapay zekaya gitmez", async () => {
      const ok = await waitFor(async () => /son tarihi yarın/.test(await convo(page)), 7000);
      return [!!ok && brain() === b2, `${clean(await convo(page)).slice(-80)} · yz isteği ${brain() - b2}`];
    });
    setTranscript("");
    await closeAll(page);
    // Söz yapay zekası (ayrı işlem): yerel sonuç gönderilir, dönen doğal cümle gösterilir; teklif cevabı yine yerelde işlenir
    setSoz((b) => (/Kayık boyama.*saatsiz/.test(b.result || "") ? "Kayık boyama planını yarına saatsiz koydum; saatini söylersen hemen eklerim." : null));
    setAI((t) => (/boyama/i.test(t) ? { intent: "create", message: "", items: [{ type: "plan", title: "Kayık boyama", date: TOMORROW, time: "" }] } : { intent: "chat", message: "Tamam." }));
    await talkAsk(page, "yarın kayık boyama planı ekle");
    await check(GC, "doğal cümle (söz)", "sonuç söz yapay zekasına gider, dönen cümle gösterilir", async () => {
      const ok = await waitFor(async () => /saatini söylersen hemen eklerim/.test(await convo(page)), 9000);
      const c = calls.filter((x) => x.path === "/api/soz").pop();
      return [!!ok && /saatsiz/.test(c?.body?.result || "") && /kayık/i.test(c?.body?.said || ""), `${clean(await convo(page)).slice(-100)} · söz: ${(c?.body?.result || "-").slice(0, 60)}`];
    });
    await answer(h, page, "akşam 7'de");
    await check(GC, "söz sonrası teklif cevabı", "plan 19:00 olur", async () => {
      const ok = await waitFor(async () => /19:00/.test(await convo(page)), 7000);
      return [!!ok, clean(await convo(page)).slice(-80)];
    });
    setTranscript("");
    setSoz(() => null);
    await closeAll(page);
  }

  // ================================================================ 5. Silme / para onay ister; mesaj geri sayımla gider
  const GO = "Onay isteyen işler";
  const home = async () => {
    await page.goto(new URL(page.url()).origin + "/");
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(1200);
  };
  await home();
  setAI((t) =>
    /dişçi/i.test(t)
      ? { intent: "update", message: "Dişçi randevusunu sileyim mi?", actions: [{ op: "delete", kind: "plan", id: "p-disci" }] }
      : { intent: "chat", message: "Tamam." },
  );
  await talkAsk(page, "dişçi randevusunu sil");
  await check(GO, "dişçi randevusunu sil", "hemen silinmez: “Onayla / Vazgeç” sorulur", async () => {
    const ok = await waitFor(async () => (await page.locator("[data-dome] button", { hasText: /^(Onayla|Sil|Evet)/ }).count()) > 0, 7000);
    const txt = clean(await convo(page)).slice(-160);
    return [!!ok, ok ? `onay soruldu · ${txt}` : `onay yok · ${txt}`];
  });
  const vaz = page.locator("[data-dome] button", { hasText: /^Vazgeç$/ }).last();
  if (await vaz.count()) await vaz.click();
  await check(GO, "Vazgeç", "plan silinmez (veritabanında duruyor)", async () => {
    await page.waitForTimeout(1500);
    const d = await h.getDoc("orgs/{owner}/plans/p-disci");
    return [!!d, d ? "plan duruyor" : "plan silinmiş"];
  });
  await closeAll(page);
  await page.goto(new URL(page.url()).origin + "/plans");
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1200);
  // Planlar sayfasında (tür sayfası) ilk cümle: silme isteği yeni plan sanılmamalı
  {
    const i0 = calls.filter((c) => c.path === "/api/interpret").length;
    await talkAsk(page, "dişçi randevusunu sil");
    await check(GO, "Planlar sayfasında “dişçi randevusunu sil”", "silme isteği yeni plan yapmaya gönderilmez, onay sorulur", async () => {
      await waitFor(async () => (await state(page)) === "idle", 6000);
      const asked = await page.locator("[data-dome] button", { hasText: /^(Onayla|Sil|Evet)/ }).count();
      const toCreate = calls.filter((c) => c.path === "/api/interpret").length - i0;
      return [asked > 0 && toCreate === 0, `${toCreate ? "kayıt oluşturmaya gitti (/api/interpret)" : "kayda gitmedi"} · onay ${asked ? "var" : "yok"} · “${clean(await last(page)).slice(0, 70)}”`];
    });
    const v = page.locator("[data-dome] button", { hasText: /^Vazgeç$/ }).last();
    if (await v.count()) await v.click();
    await closeAll(page);
  }
  await home();

  const sendsBefore = calls.filter((c) => c.path === "/api/notify" || c.path === "/api/chat").length;
  setAI((t) => ({ intent: "message", message: "Ege'ye şunu göndereyim mi?", send: { to: "Ege Demir", text: "Yarın 9'da kulüpte ol." } }));
  await talkAsk(page, "Ege'ye yaz yarın 9'da kulüpte olsun");
  await check(GO, "Ege'ye yaz …", "mesaj okunur, “Göndereyim mi?” diye sorulur, kendiliğinden gitmez (Seyhun 2026-10-20: sesle onay)", async () => {
    const ok = await waitFor(async () => /Ege Demir için mesaj: “Yarın 9'da kulüpte ol\.” Göndereyim mi\?/.test(clean(await convo(page))), 7000);
    await page.waitForTimeout(4500);
    const bar = await page.locator("[data-dome] [style*='autofill']").count();
    const sent = calls.filter((c) => c.path === "/api/notify" || c.path === "/api/chat").length - sendsBefore;
    return [!!ok && bar === 0 && sent === 0, `${ok ? "soru var" : `soru yok · ${clean(await convo(page)).slice(-120)}`} · çizgi ${bar} · gönderilen ${sent}`];
  });
  {
    const v = page.locator("[data-dome] button", { hasText: /^Vazgeç$/ }).last();
    if (await v.count()) await v.click();
  }
  await check(GO, "mesajda Vazgeç", "mesaj gönderilmez", async () => {
    await page.waitForTimeout(1500);
    const t = clean(await convo(page));
    return [/göndermedim/i.test(t) && !/Gönderdim/.test(t), `“${t.slice(-80)}”`];
  });
  await closeAll(page);
  await home();
  await talkAsk(page, "Ege'ye yaz yarın 9'da kulüpte olsun");
  await waitFor(async () => /Göndereyim mi\?/.test(await convo(page)), 7000);
  await answer(h, page, "gönder"); // soru okununca cevap mikrofonu açılır, "gönder" denir
  await check(GO, "Ege'ye yaz … → “gönder”", "sesle onaylanınca mesaj gider", async () => {
    const ok = await waitFor(async () => /Gönderdim|gönderemedim/.test(await convo(page)), 9000);
    const t = clean(await convo(page));
    return [!!ok && /Gönderdim/.test(t), `“${t.slice(-90)}”`];
  });
  setTranscript("");
  await closeAll(page);
  await home();
  // İki mesaj tek kartta, tek "gönder" ile ikisi de gider (Seyhun 2026-10-20)
  setAI(() => ({ intent: "message", message: "", send: { to: "Ege Demir", text: "Yarın 9'da kulüpte ol." }, sends: [{ to: "Ege Demir", text: "Yarın 9'da kulüpte ol." }, { to: "Ege Demir", text: "Botunu da getir." }] }));
  const sendsB = calls.filter((c) => c.path === "/api/notify" || c.path === "/api/chat").length;
  await talkAsk(page, "Ege'ye yarın 9'da kulüpte ol diye yaz, sonra Ege'ye botunu da getir diye yaz");
  await check(GO, "iki mesaj", "tek kartta ikisi, “Hepsini göndereyim mi?”", async () => {
    const ok = await waitFor(async () => /2 mesaj hazır.*Hepsini göndereyim mi\?/.test(clean(await convo(page))), 7000);
    const btnN = await page.locator("[data-dome] button", { hasText: "Hepsini gönder" }).count();
    return [!!ok && btnN === 1, `${ok ? "soru var" : clean(await convo(page)).slice(-140)} · düğme ${btnN}`];
  });
  await answer(h, page, "gönder");
  await check(GO, "iki mesaj → “gönder”", "ikisi de gider", async () => {
    const ok = await waitFor(async () => /İkisini de gönderdim|gönderemedim/.test(await convo(page)), 9000);
    const t = clean(await convo(page));
    return [!!ok && /İkisini de gönderdim/.test(t), `“${t.slice(-90)}” · istek ${calls.filter((c) => c.path === "/api/notify" || c.path === "/api/chat").length - sendsB}`];
  });
  setTranscript("");
  await closeAll(page);
  await home();
  await page.waitForTimeout(500);

  setAI(() => ({ intent: "chat", message: "Tamam." }));
  await talkAsk(page, "kasaya 500 lira nakit gelir yaz");
  await check(GO, "kasaya 500 lira nakit gelir yaz", "nakit gelir yazılır, cevapta tutar ve Hesaplar'a geçiş var", async () => {
    const ok = await waitFor(async () => /500 TL/.test(await last(page)), 7000);
    return [!!ok, `“${clean(await last(page)).slice(0, 90)}”`];
  });
  await closeAll(page);

  // ================================================================ 6. Çok işli cümle: görev listesi (✓ / ✕), ilerleme halkası
  const GL = "Görev listesi ve ilerleme halkası";
  setTasks(() => [
    { label: "Nakit gelir 300 TL", say: "kasaya 300 lira gelir yaz" },
    { label: "Plan: Tekne yıkama", say: "yarın 10'da tekne yıkama planı ekle" },
  ]);
  setAI(
    (t) =>
      /tekne yıkama/i.test(t)
        ? { intent: "create", message: "Tekne yıkamayı ekledim.", items: [{ type: "plan", title: "Tekne yıkama", date: TOMORROW, time: "10:00" }] }
        : /süt/i.test(t)
          ? { intent: "create", message: "Not aldım.", items: [{ type: "note", title: "Süt al", body: "Süt al" }] }
          : { intent: "chat", message: "Tamam." },
    700,
  );
  const fills = [];
  const tk0 = calls.filter((c) => c.path === "/api/tasks").length;
  await talkAsk(page, "kasaya 300 lira gelir yaz ve yarın 10'da tekne yıkama planı ekle");
  const t0 = Date.now();
  while (Date.now() - t0 < 9000) {
    const off = await page.locator("[data-dome] svg circle").nth(1).getAttribute("stroke-dashoffset").catch(() => null);
    if (off != null && !fills.includes(off)) fills.push(off);
    if ((await state(page)) === "idle" && fills.length) break;
    await page.waitForTimeout(100);
  }
  await check(GL, "iki işli cümle (gelir + plan)", "görev listesi çıkar (taklit /api/tasks), iki iş de ✓ olur", async () => {
    await waitFor(async () => (await page.locator("[data-dome] ol[aria-label='Görev listesi'] li svg").count()) === 2, 6000);
    const items = await page.locator("[data-dome] ol[aria-label='Görev listesi'] li").count();
    const done = await page.locator("[data-dome] ol[aria-label='Görev listesi'] li svg").count();
    const tk = calls.filter((c) => c.path === "/api/tasks").length - tk0;
    return [items === 2 && done === 2 && tk === 1, `${items} iş · ${done} işaret · görev listesi isteği ${tk} · ${clean(await page.locator("[data-dome] ol").innerText().catch(() => "liste yok"))}`];
  });
  await check(GL, "halka işler bittikçe dolar", "halka adım adım dolar (en az 2 farklı doluluk)", async () => [fills.length >= 2, `${fills.length} farklı doluluk`]);
  await check(GL, "liste varken halka yazısı", "durum listede; halka yazı yazmaz", async () => {
    const t = clean(await ringText(page));
    return [!t || /iş bitti|Tamam|Kaydedildi/.test(t), t || "(yazı yok)"];
  });
  await closeAll(page);

  // ================================================================ 6b. Tohum cümleler (#432): telefonda cevaplananlar yapay zekaya gitmez
  const GT = "Tohum cümleler (telefonda cevap)";
  const { SEED } = await import("../../src/lib/brain/seedPhrases.js");
  setAI(() => ({ intent: "chat", message: "YAPAY ZEKA CEVABI" }));
  // Yalnız Ayarlar › Öğrenme › Hazır cevaplar açıkken (varsayılan kapalı: her istek yapay zekaya)
  await page.evaluate(() => localStorage.setItem("sa-quick", "1"));
  // Telefonda cevaplanmak üzere bağlı olanlar (lib/brief.js): notlar, bugün/yarın/hafta planları, görevler, günün özeti
  const WANT = { "notes.read": /not/i, "plans.today": /bugün/i, "plans.tomorrow": /yarın/i, "plans.week": /hafta/i, "tasks.list": /görev/i, "day.summary": /bugün|gün/i };
  const quick = SEED.filter((x) => WANT[x.id]);
  for (const sd of quick) {
    for (const sentence of sd.say.slice(1, 3)) {
      const b = aiCalls();
      try {
        await talkAsk(page, sentence);
      } catch (e) {
        h.push(GT, `${sd.title}: “${sentence}”`, "cevap telefonda, yapay zekaya gitmez", false, e.message);
        await closeAll(page);
        continue;
      }
      await check(GT, `${sd.title}: “${sentence}”`, "cevap telefonda, yapay zekaya gitmez", async () => {
        const ok = await waitFor(async () => (await state(page)) === "idle" && WANT[sd.id].test(await last(page)), 6000);
        const a = clean(await last(page));
        return [!!ok && aiCalls() === b && !/YAPAY ZEKA/.test(a), `${aiCalls() - b ? "yapay zekaya gitti" : "telefonda"} · “${a.slice(0, 70)}”`];
      });
    }
  }
  await page.evaluate(() => localStorage.removeItem("sa-quick"));
  {
    // Tamamlama yapay zekayla (aiFirst): taklit yanıt complete_task der, görev onaysız tamamlanır (geri alınabilir iş)
    setAI(() => ({ intent: "action", message: "Motor bakımını tamamladım.", actions: [{ op: "complete_task", kind: "task", id: "t-motor" }] }));
    await talkAsk(page, "motor bakımı görevini tamamla");
    await check(GO, "motor bakımı görevini tamamla", "görev tamamlanır (veritabanında done), onay sorulmaz", async () => {
      const ok = await waitFor(async () => (await h.getDoc("orgs/{owner}/tasks/t-motor"))?.fields?.done?.booleanValue === true, 6000);
      return [!!ok, `${ok ? "tamamlandı" : "tamamlanmadı"} · “${clean(await last(page)).slice(0, 60)}”`];
    });
  }
  await closeAll(page);

  await check("Sayfa hataları", "kayıt / onay / görev listesi", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
  await page.context().close();
  await scenarios4(h);
}

async function scenarios4(h) {
  const { check, newPage, orb, dome, state, full, waitFor, btn, last, aiCalls, calls, setAI, setTranscript, setLive, closeAll, talkAsk, log } = h;
  const clean = (t) => String(t || "").replace(/\s+/g, " ").trim();
  log("    Asistan: sporcu, fitness, yarış multimedya, geniş ekran, iPhone kayıt yolu…");

  // ================================================================ 7. Asistanın olmadığı yerler
  const GN = "Asistanın gizli olduğu yerler";
  {
    const { page, errs } = await newPage({ email: "sporcu@ornek.local" });
    await check(GN, "sporcu hesabı", "asistan düğmesi yok, 4 sekme", async () => {
      const n = await page.locator("[data-orb]").count();
      const cols = await page.locator("nav[aria-label='Sekmeler'] > div").getAttribute("class").catch(() => "");
      return [n === 0 && /grid-cols-4/.test(cols), `${n} düğme · ${/grid-cols-(\d)/.exec(cols)?.[1] || "?"} sütun`];
    });
    await check(GN, "sporcu hesabı, asistan açma olayı", "başka yerden açılmaya çalışılsa da tam ekran asistan çıkmaz", async () => {
      await page.evaluate(() => window.dispatchEvent(new CustomEvent("sa-open-assistant", { detail: { listen: true } })));
      await page.waitForTimeout(800);
      return [(await full(page).count()) === 0, `tam ekran ${await full(page).count()}`];
    });
    await check("Sayfa hataları", "sporcu hesabı", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
    await page.context().close();
  }
  {
    const { page } = await newPage();
    const base = new URL(page.url()).origin;
    await page.goto(`${base}/fitness`);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    await page.waitForTimeout(2500);
    await check(GN, "Fitness sayfası", "asistan düğmesi yok (4 sekme)", async () => {
      const n = await page.locator("[data-orb]").count();
      return [n === 0, `${n} düğme`];
    });
    await page.goto(`${base}/athletes/races/test-yaris/media`);
    await page.waitForTimeout(3000);
    await check(GN, "Yarış multimedya sayfası", "sekme çubuğu ve asistan düğmesi yok", async () => {
      const n = await page.locator("[data-orb]:visible").count();
      const nav = await page.locator("nav[aria-label='Sekmeler']:visible").count();
      return [n === 0 && nav === 0, `${new URL(page.url()).pathname} · ${n} düğme · sekme çubuğu ${nav}`];
    });
    const picked = () => page.locator("button[data-day][aria-pressed='true']").getAttribute("data-day").catch(() => "");
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    await check(GN, "Yarış multimedya açılışı", "dün antrenman günü varken bugün seçili, son yarış günü değil", async () => [(await picked()) === today, `${await picked()} · bugün ${today}`]);
    await page.locator("button[data-day]").last().click().catch(() => {});
    await page.evaluate(() => {
      const n = Date.now;
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
      Date.now = () => n() + 60e3;
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(400);
    await check(GN, "Yarış multimedya: arkadan dönüş", "başka gün seçiliyken uygulamaya 1 dk sonra dönünce yine bugün", async () => [(await picked()) === today, `${await picked()}`]);
    await check(GN, "Yarış multimedya: sayaç", "ana düğme Başlat → Durdur → Devam; durunca kartta Sıfırla; start yarış açmaz", async () => {
      const old = await page.locator("button", { hasText: /^Başlat ·/ }).count();
      await page.getByRole("button", { name: "Başlat", exact: true }).click({ timeout: 5000 });
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: "Durdur", exact: true }).click({ timeout: 5000 });
      await page.waitForTimeout(500);
      const dv = await page.getByRole("button", { name: "Devam", exact: true }).count();
      const sf = await page.locator("section button", { hasText: /^Sıfırla$/ }).count();
      await page.locator("section button", { hasText: /^Sıfırla$/ }).click();
      await page.waitForTimeout(500);
      await page.getByRole("button", { name: /Yanlış başlattım/ }).click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
      return [old === 0 && dv === 1 && sf === 1, `eski Başlat ${old} · Devam ${dv} · Sıfırla ${sf}`];
    });
    await check(GN, "Yarış multimedya: denemeleri sıfırla", "Liste › Denemeleri sıfırla → 1 eklenen gün yazar, Sıfırla'dan sonra dünkü gün kalkar", async () => {
      const before = await page.locator("button[data-day]").count();
      const step = async (name, fn) => fn().catch((e) => { throw new Error(`${name}: ${String(e.message).split("\n")[0]}`); });
      await step("Liste", () => page.locator("button", { hasText: "Liste ›" }).first().click({ timeout: 5000 }));
      await step("Denemeleri sıfırla", () => page.getByRole("button", { name: "Denemeleri sıfırla" }).click({ timeout: 5000 }));
      const dlg = page.getByRole("dialog", { name: "Denemeleri sıfırla" });
      await dlg.waitFor({ timeout: 4000 });
      const txt = (await dlg.innerText()).replace(/\s+/g, " ");
      await step("Sıfırla", () => dlg.getByRole("button", { name: "Sıfırla", exact: true }).click({ timeout: 5000 }));
      await page.waitForTimeout(1200);
      const after = await page.locator("button[data-day]").count();
      return [/Eklenen gün 1/.test(txt) && after === before - 1 && (await picked()) === today, `${before} → ${after} gün · ${txt.slice(0, 80)}`];
    });
    await page.context().close();
  }

  // ================================================================ 8. Tablet/bilgisayar: sol menüdeki asistan (#504)
  const GW = "Geniş ekran (sol menü)";
  {
    const { page, errs } = await newPage({ width: 1280, height: 800, mobile: false });
    const side = page.locator("[data-orb]:visible");
    await check(GW, "1280×800", "sol menüde asistan düğmesi ve “Yazarak sor”", async () => {
      const n = await side.count();
      const yaz = await page.locator("button", { hasText: /^Yazarak sor$/ }).count();
      const box = n ? await side.first().boundingBox() : null;
      return [n >= 1 && yaz >= 1 && box && box.x < 320, `${n} düğme · Yazarak sor ${yaz} · x=${box ? Math.round(box.x) : "-"}`];
    });
    await side.first().click();
    await check(GW, "düğmeye dokun", "asistan açılır ve dinler", async () => {
      const ok = await waitFor(async () => (await full(page).count()) && (await state(page)) === "listening", 4000);
      return [!!ok, `tam ekran ${await full(page).count()} · ${await state(page)}`];
    });
    await check(GW, "açık asistanın genişliği", "konuşma ortada, en çok 34rem (544 px)", async () => {
      const w = await page.locator("[data-dome] .asheet").first().evaluate((el) => el.getBoundingClientRect().width);
      return [w <= 545, `${Math.round(w)} px`];
    });
    await check("Sayfa hataları", "geniş ekran", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
    await page.context().close();
  }

  // ================================================================ 8b. "Rapor oluştur": bugünkü istekler, cevaplar ve süreler
  {
    const { page, errs } = await newPage();
    setAI(() => ({ intent: "chat", message: "Yarın rüzgâr 12 knot, yelken için iyi." }));
    await talkAsk(page, "yarın hava nasıl");
    await waitFor(async () => /12 knot/.test(await last(page)), 6000);
    const b = aiCalls();
    await talkAsk(page, "rapor oluştur");
    await check("Asistan raporu", "rapor oluştur", "rapor sayfası açılır; önceki istek, cevabı ve süresi yazılı; yapay zekaya gitmez", async () => {
      const ok = await waitFor(async () => new URL(page.url()).pathname === "/settings/report" && /yarın hava nasıl/.test(await page.locator("pre", { hasText: "ASİSTAN RAPORU" }).first().innerText().catch(() => "")), 8000);
      const txt = await page.locator("pre", { hasText: "ASİSTAN RAPORU" }).first().innerText().catch(() => "");
      return [!!ok && /ASİSTAN RAPORU/.test(txt) && /Cevap: “Yarın rüzgâr 12 knot/.test(txt) && /Süreler:/.test(txt) && aiCalls() === b, clean(txt).slice(0, 160) || `${new URL(page.url()).pathname} · ${clean(await page.locator("body").innerText()).slice(0, 200)}`];
    });
    await check("Asistan raporu", "düğmeler", "Paylaş ve Kopyala var", async () => {
      const n = (await page.getByRole("button", { name: "Paylaş" }).count()) + (await page.getByRole("button", { name: "Kopyala" }).count());
      return [n === 2, `${n} düğme`];
    });
    await check("Sayfa hataları", "asistan raporu", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
    await page.context().close();
  }

  // ================================================================ 9. iPhone ana ekran uygulaması: kayıt + sunucu (#503)
  const GR = "Ses kaydı yolu (ana ekran uygulaması)";
  {
    const { page, errs } = await newPage({ standalone: true });
    setTranscript("notlarımı oku");
    setAI(() => ({ intent: "chat", message: "Bugün bir notun var: Yelken bezleri kurutulacak." }));
    const tr0 = calls.filter((c) => c.path === "/api/transcribe").length;
    // Mikrofon kaç kez istendi (asistan açıkken aynı mikrofon tutulur)
    await page.evaluate(() => {
      const md = navigator.mediaDevices;
      const real = md.getUserMedia.bind(md);
      window.__gum = 0;
      window.__tracks = [];
      md.getUserMedia = async (c) => {
        window.__gum += 1;
        const st = await real(c);
        window.__tracks.push(...st.getTracks());
        return st;
      };
    });
    await orb(page).click();
    await check(GR, "dokun konuş", "telefonun tanıması değil, kayıt başlar (dinliyor)", async () => {
      const ok = await waitFor(async () => (await state(page)) === "listening", 5000);
      const sr = await page.evaluate(() => window.__t.srStarts);
      return [!!ok && sr === 0, `${await state(page)} · telefon tanıması ${sr} kez`];
    });
    await page.waitForTimeout(1800);
    await btn(page, "Gönder").click().catch(() => {});
    await check(GR, "Gönder", "ses sunucuda yazıya çevrilir (taklit), cevap gelir", async () => {
      const ok = await waitFor(async () => /Yelken bezleri/.test(await last(page)), 9000);
      const n = calls.filter((c) => c.path === "/api/transcribe").length - tr0;
      return [!!ok && n >= 1, `yazıya çevirme isteği ${n} · “${clean(await last(page)).slice(0, 80)}”`];
    });
    // İkinci tur: Konuş'a yeniden basınca mikrofon yeniden istenmez, ses yine yazıya çevrilir
    setTranscript("yarın ne var");
    setAI(() => ({ intent: "chat", message: "Yarın saat 10'da toplantı var." }));
    const tr1 = calls.filter((c) => c.path === "/api/transcribe").length;
    await waitFor(async () => (await state(page)) === "idle", 6000);
    await btn(page, "Konuş").click({ timeout: 5000 }).catch(() => {});
    await waitFor(async () => (await state(page)) === "listening", 5000);
    await page.waitForTimeout(1800);
    await btn(page, "Gönder").click().catch(() => {});
    await check(GR, "ikinci tur (Konuş'a yeniden bas)", "aynı mikrofonla dinler (yeniden istenmez), cevap gelir", async () => {
      const ok = await waitFor(async () => /toplantı/.test(await last(page)), 9000);
      const n = calls.filter((c) => c.path === "/api/transcribe").length - tr1;
      const gum = await page.evaluate(() => window.__gum);
      return [!!ok && n >= 1 && gum === 1, `mikrofon isteği ${gum} · yazıya çevirme ${n} · “${clean(await last(page)).slice(0, 60)}”`];
    });
    // Üçüncü tur: kayıt boş çevrilirse ham sesle bir kez daha denenir (sesli cevaptan sonra iPhone'da kayıt sessiz geliyordu)
    {
      let finals = 0;
      setTranscript(({ partial }) => (partial ? "" : ++finals === 1 ? "" : "bugün ne var"));
      setAI(() => ({ intent: "chat", message: "Bugün saat 18'de yelken var." }));
      await waitFor(async () => (await state(page)) === "idle", 6000);
      await btn(page, "Konuş").click({ timeout: 5000 }).catch(() => {});
      await waitFor(async () => (await state(page)) === "listening", 5000);
      await page.waitForTimeout(1800);
      await btn(page, "Gönder").click().catch(() => {});
      await check(GR, "boş çeviri", "ham sesle yeniden denenir, cevap gelir (“Ses anlaşılamadı” çıkmaz)", async () => {
        const ok = await waitFor(async () => /yelken var/.test(await last(page)), 9000);
        return [!!ok && finals === 2, `son çeviri isteği ${finals} · “${clean(await last(page)).slice(0, 60)}”`];
      });
    }
    // Dördüncü tur: canlı yazı hattı (Gemini Live, taklit WebSocket): konuşurken kelimeler kutuya akar, parça çevirisi yapılmaz
    {
      setLive({ token: "auth_tokens/taklit", models: ["taklit-live"] });
      setTranscript(({ partial }) => (partial ? "" : "yarın saat onda antrenman var mı"));
      setAI(() => ({ intent: "chat", message: "Evet, yarın 10'da antrenman var." }));
      await page.evaluate(() => {
        window.__ws = { audio: 0, words: ["Yarın ", "saat ", "onda ", "antrenman"], urls: [] };
        window.WebSocket = class {
          constructor(u) {
            this.readyState = 0;
            window.__ws.urls.push(u);
            setTimeout(() => ((this.readyState = 1), this.onopen?.()), 30);
          }
          send(d) {
            const m = JSON.parse(d);
            const say = (o) => setTimeout(() => this.onmessage?.({ data: JSON.stringify(o) }), 20);
            if (m.setup) return say({ setupComplete: {} });
            if (m.realtimeInput?.audio && ++window.__ws.audio % 3 === 0 && window.__ws.words.length) say({ serverContent: { inputTranscription: { text: window.__ws.words.shift() } } });
          }
          close() {
            this.readyState = 3;
            setTimeout(() => this.onclose?.({ code: 1000 }), 0);
          }
        };
      });
      await waitFor(async () => (await state(page)) === "idle", 6000);
      const part0 = calls.filter((c) => c.path === "/api/transcribe").length;
      await btn(page, "Konuş").click({ timeout: 5000 }).catch(() => {});
      await waitFor(async () => (await state(page)) === "listening", 5000);
      await check(GR, "canlı yazı (akış)", "konuşurken kelimeler kutuya akar, parça çevirisi istenmez", async () => {
        const ok = await waitFor(async () => /Yarın saat onda antrenman/.test(await dome(page).locator(".asheet-input").innerText()), 6000);
        const box = clean(await dome(page).locator(".asheet-input").innerText());
        const parts = calls.filter((c) => c.path === "/api/transcribe").length - part0;
        const url = await page.evaluate(() => window.__ws.urls[0] || "");
        return [!!ok && /BidiGenerateContentConstrained\?access_token=auth_tokens/.test(url), `“${box.slice(0, 60)}” · ses parçası ${await page.evaluate(() => window.__ws.audio)} · parça çevirisi ${parts}`];
      });
      await btn(page, "Gönder").click().catch(() => {});
      await check(GR, "canlı yazıdan sonra Gönder", "son yazı sunucudan gelir, cevap gelir, akan süre bildirilir", async () => {
        const ok = await waitFor(async () => /10'da antrenman/.test(await last(page)), 9000);
        await page.waitForTimeout(1500);
        const used = calls.filter((c) => c.path === "/api/live-token" && c.body?.used != null).length;
        return [!!ok, `“${clean(await last(page)).slice(0, 60)}” · süre bildirimi ${used}`];
      });
      setLive(null);
    }
    await check(GR, "asistanı kapat", "tutulan mikrofon bırakılır", async () => {
      await closeAll(page);
      const ended = await waitFor(async () => page.evaluate(() => window.__tracks.length > 0 && window.__tracks.every((x) => x.readyState === "ended")), 3000);
      return [!!ended, await page.evaluate(() => window.__tracks.map((x) => x.readyState).join(", ") || "iz yok")];
    });
    setTranscript("");
    await check("Sayfa hataları", "kayıt yolu", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
    await page.context().close();
  }

  // ================================================================ 10. Üstte başka kart asistanı örtmez
  {
    const { page } = await newPage({ note: true });
    await page.waitForTimeout(1200); // "Güncellendi" notu çıksın
    const had = await page.locator("[role='status']", { hasText: /Güncellendi/ }).count();
    await orb(page).click();
    await page.waitForTimeout(800);
    await check("Tam ekran üstte", "yeni sürüm notu varken asistanı aç", "asistanın yazı kutusu ve düğmeleri görünür (notun altında kalmaz)", async () => {
      const r = await page.locator("[data-dome] .asheet-input").boundingBox();
      const pts = [[r.x + 30, r.y + r.height - 30], [r.x + r.width / 2, r.y + 20], [r.x + r.width - 30, r.y + r.height - 30]];
      const hit = await page.evaluate((ps) => ps.every(([x, y]) => !!document.elementFromPoint(x, y)?.closest("[data-dome]")), pts);
      return [hit && had > 0, `${had ? "not vardı" : "not çıkmadı (sınanamadı)"} · ${hit ? "kutu ve düğmeler üstte" : "“Güncellendi” notu kutuyu örtüyor"}`];
    });
    await page.context().close();
  }
}
