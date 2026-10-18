// Asistan ekran testinin adımları (senaryolar.mjs hazırlar: giriş, taklitler, yardımcılar).
// Her check(grup, söz, beklenen, fn): fn true/false ya da [geçti mi, olan] döndürür.

export async function scenarios(h) {
  const { check, newPage, orb, dome, state, full, ringColor, ringText, convo, last, waitFor, say, btn, typeAsk, talkAsk, closeAll, swipeDown, aiCalls, calls, setAI, setTasks, setTranscript, TODAY, TOMORROW, log } = h;

  // ================================================================ 1. Sekme çubuğu ve açılış
  log("    Asistan: sekme çubuğu, açılış, dinleme, kapanış…");
  const { page, errs } = await newPage();
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
  // Canlı yazı yok (Claude uygulaması gibi, 2026-10-18): söz gönderilince sohbete balon olarak düşer
  await check(G2, "konuşurken", "kutuda canlı yazı yok, “Dinliyorum” ve dalga", async () => {
    await page.waitForTimeout(300);
    const box = (await dome(page).locator(".asheet-input").innerText()).replace(/\n/g, " ");
    return [!/notlarımı oku/.test(box) && /Dinliyorum/.test(box), box.slice(0, 80)];
  });
  const before = h.aiCalls();
  await btn(page, "Gönder").click();
  const G3 = "Yerel hızlı cevap (yapay zekasız)";
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
  const { check, newPage, orb, dome, state, full, ringColor, ringText, convo, last, waitFor, say, btn, typeAsk, talkAsk, closeAll, swipeDown, aiCalls, calls, setAI, setTasks, setTranscript, TODAY, TOMORROW, log } = h;
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

  // Sesli yanıt açık: okur (mavi), bitince mikrofon bir kez açılır
  const GS = "Sesli yanıt";
  await page.evaluate(() => localStorage.setItem("sa_tts_on", "1"));
  await page.reload();
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window.__t.speakMs = 2500));
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
  await say(page, "kapat");
  await check(GS, "dinlerken “kapat”", "asistan hemen kapanır", async () => {
    const ok = await waitFor(async () => !(await full(page).count()), 4000);
    return [!!ok, `tam ekran ${await full(page).count()}`];
  });
  await page.evaluate(() => localStorage.setItem("sa_tts_on", "0"));

  await check("Sayfa hataları", "çalışırken / küçültme / sesli yanıt", "tarayıcıda hata yok", async () => [errs.length === 0, errs.slice(0, 3).join(" | ") || "yok"]);
  await page.context().close();
  await scenarios3(h);
}

async function scenarios3(h) {
  const { check, newPage, orb, state, full, ringText, convo, last, waitFor, btn, talkAsk, typeAsk, closeAll, aiCalls, calls, setAI, setTasks, TOMORROW, log } = h;
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
  await check(GC, "yarın 9'da tekne bakımı planı ekle", "onay sorulmadan kaydedilir: yeşil ✓ kartı, “Kaydet” düğmesi yok", async () => {
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

  // ================================================================ 5. Silme / para / mesaj onay ister
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
  await check(GO, "Ege'ye yaz …", "mesaj gönderilmeden önce “onayını bekliyor” kartı (Gönder / Vazgeç)", async () => {
    const ok = await waitFor(async () => /onayını bekliyor/.test((await convo(page)).toLocaleLowerCase("tr-TR")), 7000);
    const sent = calls.filter((c) => c.path === "/api/notify" || c.path === "/api/chat").length - sendsBefore;
    return [!!ok && sent === 0, `${ok ? "kart var" : `kart yok · ${clean(await convo(page)).slice(-120)}`} · gönderilen ${sent}`];
  });
  {
    const v = page.locator("[data-dome] button", { hasText: /^Vazgeç$/ }).last();
    if (await v.count()) await v.click();
  }
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
  const { check, newPage, orb, state, full, waitFor, btn, last, aiCalls, calls, setTranscript, log } = h;
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

  // ================================================================ 9. iPhone ana ekran uygulaması: kayıt + sunucu (#503)
  const GR = "Ses kaydı yolu (ana ekran uygulaması)";
  {
    const { page, errs } = await newPage({ standalone: true });
    setTranscript("notlarımı oku");
    const tr0 = calls.filter((c) => c.path === "/api/transcribe").length;
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
