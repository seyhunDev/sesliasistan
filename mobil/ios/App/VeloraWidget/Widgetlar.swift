import SwiftUI
import WidgetKit

// Velora widget'ları (onaylanan örnek /mnt/project-files/iphone/widget-ornek-3.png):
// - Bugün (büyük): rüzgâr grafiği, sayaç, sıradaki işler, mesaj / hesap / aidat kutuları
// - Rüzgâr (orta, kilit ekranı): ana sayfadaki rüzgâr grafiği
// - Mesaj, Hesap (küçük); Kelime (orta, kilit ekranı); Özet (kilit ekranında saatin üstü: "3 iş · 2 mesaj")
// Hesap tutarı telefon kilitliyken gizlenir (privacySensitive).

private func url(_ yol: String) -> URL { URL(string: "velora://ac\(yol)")! }

// "12 kn · 18"
private func ruzgarYazi(_ r: GunRuzgar?, _ now: Date) -> String {
    guard let r else { return "" }
    let s = r.simdi(now)
    return s.gust > s.wind ? "\(s.wind) kn · \(s.gust)" : "\(s.wind) kn"
}

private struct ZamanSatiri: View {
    let t: WidgetVeri.Zaman
    var body: some View {
        HStack {
            Text(t.title).font(.system(size: 12, weight: .semibold)).lineLimit(1)
            Spacer()
            Group {
                if t.paused == true {
                    Text(String(format: "%d:%02d", (t.left ?? 0) / 60, (t.left ?? 0) % 60))
                } else {
                    Text(t.bitis, style: .timer)
                }
            }
            .font(.system(size: 20, weight: .bold).monospacedDigit())
            .multilineTextAlignment(.trailing)
            .frame(maxWidth: 110, alignment: .trailing)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 4)
        .background(RoundedRectangle(cornerRadius: 11).fill(Color(red: 0.545, green: 0.361, blue: 0.965).opacity(0.3)))
    }
}

private struct Kutu: View {
    let ad: String
    let deger: String
    var alt: String = ""
    var renk: Color = .white
    var gizli = false
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(ad).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.65))
            Text(deger).font(.system(size: 15, weight: .bold)).foregroundStyle(renk).lineLimit(1).minimumScaleFactor(0.7).privacySensitive(gizli)
            Text(alt).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.75)).lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(RoundedRectangle(cornerRadius: 11).fill(Color.white.opacity(0.09)))
    }
}

// MARK: Bugün

struct BugunGorunum: View {
    let e: VeloraGiris
    var body: some View {
        let v = e.v
        let t = v?.sayac(e.date)
        let plans = v?.siradaki(e.date) ?? []
        VStack(alignment: .leading, spacing: 6) {
            Baslik(ad: "Bugün", ek: gunBicim.string(from: e.date), sag: ruzgarYazi(e.r, e.date))
            if let r = e.r {
                Link(destination: url("/weather")) {
                    VStack(spacing: 2) {
                        RuzgarGrafik(g: r, now: e.date).frame(height: 78)
                        RuzgarEtiket(g: r)
                    }
                }
            }
            if let t { Link(destination: URL(string: "velora://sayac")!) { ZamanSatiri(t: t) } }
            Link(destination: url("/plans")) {
                VStack(alignment: .leading, spacing: 5) {
                    if plans.isEmpty { Bos(yazi: "Sırada plan yok") }
                    ForEach(plans.prefix(t == nil ? 3 : 2), id: \.self) { PlanSatiri(p: $0, now: e.date) }
                }
            }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                if let n = v?.unread {
                    Link(destination: url("/messages")) { Kutu(ad: "Mesaj", deger: "\(n)", alt: v?.msgs?.first?.from ?? "") }
                }
                if let m = v?.money {
                    Link(destination: url("/mail")) { Kutu(ad: "Hesap", deger: m.big, alt: m.sub?.isEmpty == false ? m.sub! : m.label, gizli: true) }
                }
                if let d = v?.dues {
                    Link(destination: url("/dues")) {
                        Kutu(ad: "Aidat", deger: "\(d.paid)/\(d.count)", alt: d.paid >= d.count ? "herkes ödedi" : "\(d.count - d.paid) bekliyor",
                             renk: Color(red: 0.56, green: 0.82, blue: 0.65))
                    }
                }
            }
        }
    }
}

struct BugunWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.bugun", provider: VeloraSaglayici(ruzgar: true)) { e in
            BugunGorunum(e: e).modifier(Zemin()).widgetURL(url("/"))
        }
        .configurationDisplayName("Bugün")
        .description("Rüzgâr, sayaç, işler, mesaj, hesap ve aidat")
        .supportedFamilies([.systemLarge])
    }
}

// MARK: Rüzgâr

struct RuzgarGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris
    var body: some View {
        if family == .accessoryRectangular {
            VStack(alignment: .leading, spacing: 1) {
                HStack {
                    Text("Rüzgâr").font(.system(size: 12, weight: .bold))
                    Spacer()
                    Text(ruzgarYazi(e.r, e.date)).font(.system(size: 12, weight: .semibold).monospacedDigit())
                }
                if let r = e.r { RuzgarGrafik(g: r, now: e.date, mono: true) } else { Text("Alınamadı").font(.system(size: 12)) }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
        } else {
            VStack(alignment: .leading, spacing: 3) {
                Baslik(ad: "Rüzgâr", ek: e.v?.place ?? "Dikili", sag: ruzgarYazi(e.r, e.date))
                if let r = e.r {
                    RuzgarGrafik(g: r, now: e.date)
                    RuzgarEtiket(g: r)
                } else {
                    Bos(yazi: "Rüzgâr alınamadı")
                    Spacer(minLength: 0)
                }
            }
        }
    }
}

struct RuzgarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.ruzgar", provider: VeloraSaglayici(ruzgar: true)) { e in
            RuzgarGorunum(e: e).modifier(Zemin()).widgetURL(url("/weather"))
        }
        .configurationDisplayName("Rüzgâr")
        .description("Bugünün rüzgâr grafiği")
        .supportedFamilies([.systemMedium, .accessoryRectangular])
    }
}

// MARK: Mesaj

struct MesajGorunum: View {
    let e: VeloraGiris
    var body: some View {
        let msgs = e.v?.msgs ?? []
        let n = e.v?.unread ?? 0
        VStack(alignment: .leading, spacing: 6) {
            Baslik(ad: "Mesaj", sag: n > 0 ? "\(n)" : "")
            if msgs.isEmpty { Bos(yazi: "Yeni mesaj yok") }
            ForEach(msgs.prefix(2), id: \.self) { m in
                VStack(alignment: .leading, spacing: 0) {
                    Text(m.from).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                    Text(m.text).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.65)).lineLimit(2)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct MesajWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.mesaj", provider: VeloraSaglayici()) { e in
            MesajGorunum(e: e).modifier(Zemin()).widgetURL(url("/messages"))
        }
        .configurationDisplayName("Mesaj")
        .description("Okunmamış mesajlar")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: Hesap

struct HesapGorunum: View {
    let e: VeloraGiris
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Baslik(ad: "Hesap", sag: e.v?.money?.label ?? "")
            if let m = e.v?.money {
                Text(m.big).font(.system(size: 24, weight: .bold).monospacedDigit()).lineLimit(1).minimumScaleFactor(0.6).privacySensitive()
                if let s = m.sub, !s.isEmpty {
                    Text(s).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.65)).lineLimit(2).privacySensitive()
                }
            } else {
                Bos(yazi: "Hesap bilgisi yok")
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct HesapWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.hesap", provider: VeloraSaglayici()) { e in
            HesapGorunum(e: e).modifier(Zemin()).widgetURL(url("/mail"))
        }
        .configurationDisplayName("Hesap")
        .description("Kasa ve banka (kilitliyken gizli)")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: Kelime

struct KelimeGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris
    var body: some View {
        if let w = e.v?.word {
            if family == .accessoryRectangular {
                VStack(alignment: .leading, spacing: 0) {
                    (Text(w.en).font(.system(size: 15, weight: .bold)) + Text(w.type.map { "  \($0)" } ?? "").font(.system(size: 11, weight: .semibold)))
                        .lineLimit(1)
                    Text(w.tr).font(.system(size: 13, weight: .semibold)).lineLimit(1)
                    if let ex = w.ex { Text(ex).font(.system(size: 11, weight: .medium)).opacity(0.75).lineLimit(1) }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 4)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Baslik(ad: "Kelime", sag: w.study == true ? "Çalışıyorum\(w.day.map { " · \($0). gün" } ?? "")" : "")
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        Text(w.en).font(.system(size: 24, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                        if let t = w.type { Text(t).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.65)) }
                    }
                    Text(w.tr).font(.system(size: 14, weight: .semibold)).foregroundStyle(wMor).lineLimit(1)
                    if let ex = w.ex { Text(ex).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.8)).lineLimit(2) }
                    Spacer(minLength: 0)
                }
            }
        } else {
            Bos(yazi: "Kelime yok")
        }
    }
}

struct KelimeWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.kelime", provider: VeloraSaglayici()) { e in
            KelimeGorunum(e: e).modifier(Zemin()).widgetURL(url("/"))
        }
        .configurationDisplayName("Kelime")
        .description("Günün İngilizce kelimesi")
        .supportedFamilies([.systemMedium, .accessoryRectangular])
    }
}

// MARK: Özet (kilit ekranında saatin üstü)

struct OzetGorunum: View {
    let e: VeloraGiris
    var body: some View {
        let n = e.v?.bugunIs(e.date) ?? 0
        let m = e.v?.unread ?? 0
        Text([n > 0 ? "\(n) iş" : "Bugün iş yok", m > 0 ? "\(m) mesaj" : ""].filter { !$0.isEmpty }.joined(separator: " · "))
    }
}

struct OzetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.ozet", provider: VeloraSaglayici()) { e in
            OzetGorunum(e: e).modifier(Zemin()).widgetURL(url("/plans"))
        }
        .configurationDisplayName("Özet")
        .description("Bugünkü iş ve mesaj sayısı")
        .supportedFamilies([.accessoryInline])
    }
}
