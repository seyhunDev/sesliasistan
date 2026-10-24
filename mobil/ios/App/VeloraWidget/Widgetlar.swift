import AppIntents
import SwiftUI
import WidgetKit

// Velora widget'ları (Seyhun 2026-10-22 onayı: /mnt/project-files/iphone/widget-ornek-4.png, "daha sade, tek parça"):
// - Velora (büyük, iOS 17+): rüzgâr grafiği, antrenman / sayaç ("Süre" doğrudan antrenmanın sayacı, "Yoklama" o günün yoklaması), banka ve aidat;
//   widget'a basılı tut › Edit Widget ile bölümler seçilir (sıradaki planlar ve kelime de eklenebilir)
// - Rüzgâr (orta, kilit ekranı), Antrenman (küçük, kilit ekranı; sayaç çalışırken koyu camgöbeği ve canlı), Banka ve aidat (küçük, kilit ekranı),
//   Kelime (orta, kilit ekranı), Özet (kilit ekranında saatin üstü: "Antrenman 16:00 · 12 kn")
// Banka tutarı telefon kilitliyken gizlenir (privacySensitive).

private func url(_ yol: String) -> URL { URL(string: "velora://ac\(yol)")! }
private let sayacURL = URL(string: "velora://sayac")!
private let vurguDugme = Color(red: 0.055, green: 0.647, blue: 0.769) // Okyanus vurgusu #0ea5c4
private let sayacZemin = Color(red: 0.043, green: 0.498, blue: 0.6) // sayaç çalışırken koyu camgöbeği #0b7f99
private let yesil = Color(red: 0.56, green: 0.82, blue: 0.65)
private let soluk = Color.white.opacity(0.55)

// "12 kn · 18"
private func ruzgarYazi(_ r: GunRuzgar?, _ now: Date) -> String {
    guard let r else { return "" }
    let s = r.simdi(now)
    return s.gust > s.wind ? "\(s.wind) kn · \(s.gust)" : "\(s.wind) kn"
}

private func antrenmanURL(_ a: WidgetVeri.Antrenman?) -> URL {
    guard let a, !a.id.isEmpty else { return url("/training/day") }
    return url("/training/day?id=\(a.id)")
}

// Yoklama: antrenmanın günü (bugün ya da geçmişse), yoksa bugünün yoklaması
private func yoklamaURL(_ a: WidgetVeri.Antrenman?, _ now: Date) -> URL {
    if let a, !a.date.isEmpty, a.date <= GunRuzgar.gun(now) { return url("/athletes/attendance?gun=\(a.date)") }
    return url("/athletes/attendance")
}

// Başlık "Antrenman" / "Optimist antrenmanı" gibiyse "Antrenman" bir daha yazılmaz: başlık etiket olur
private func antrenmanAdi(_ a: WidgetVeri.Antrenman) -> String {
    a.title.lowercased(with: Locale(identifier: "tr_TR")).contains("antrenman") ? a.title : "Antrenman"
}

private func antrenmanPlan(_ a: WidgetVeri.Antrenman) -> WidgetVeri.Plan {
    WidgetVeri.Plan(title: a.title, date: a.date, time: a.time, important: nil)
}

// "Bugün" / "Yarın" / "Cum 24"
private func gunAdi(_ a: WidgetVeri.Antrenman, _ now: Date) -> String {
    let p = antrenmanPlan(a)
    guard let d = WidgetVeri.baslangic(p) else { return "" }
    if Calendar.current.isDate(d, inSameDayAs: now) { return "Bugün" }
    return planZamani(WidgetVeri.Plan(title: "", date: a.date, time: "", important: nil), now)
}

// "6 sa sonra", "şimdi"
private func kalanYazi(_ a: WidgetVeri.Antrenman, _ now: Date) -> String {
    let k = kalan(antrenmanPlan(a), now)
    return k == "şimdi" || k == "bugün" ? k : "\(k) sonra"
}

// "Ekim aidatı"
private func aidatAdi(_ now: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.dateFormat = "LLLL"
    return f.string(from: now).capitalized(with: Locale(identifier: "tr_TR")) + " aidatı"
}

private struct Etiket: View {
    let yazi: String
    var body: some View {
        Text(yazi).font(.system(size: 11, weight: .semibold)).foregroundStyle(soluk).lineLimit(1)
    }
}

// Büyük sayı + yanında küçük soluk ek ("12 kn · sağanak 18")
private struct Sayi: View {
    let deger: String
    var ek: String = ""
    var boy: CGFloat = 28
    var body: some View {
        (Text(deger).font(.system(size: boy, weight: .bold).monospacedDigit()).kerning(-0.6)
            + Text(ek.isEmpty ? "" : " \(ek)").font(.system(size: 14, weight: .semibold)).foregroundColor(soluk))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
    }
}

private struct Ayrac: View {
    var body: some View {
        Rectangle().fill(Color.white.opacity(0.09)).frame(height: 1).padding(.vertical, 10)
    }
}

private struct Cubuk: View {
    let oran: Double
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.12))
                Capsule().fill(yesil).frame(width: g.size.width * CGFloat(min(1, max(0, oran))))
            }
        }
        .frame(height: 4)
    }
}

// Antrenmanın düğmeleri: Yoklama (o günün yoklaması) ve Süre (antrenmanın sayacı, ana düğme camgöbeği)
private struct Dugme: View {
    let yazi: String
    let hedef: URL
    var ana = false
    var body: some View {
        Link(destination: hedef) {
            Text(yazi)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(Capsule().fill(ana ? vurguDugme : Color.white.opacity(0.16)))
        }
    }
}

private struct AntrenmanDugmeleri: View {
    let sure: URL
    let yoklama: URL
    var body: some View {
        HStack(spacing: 6) {
            Dugme(yazi: "Yoklama", hedef: yoklama)
            Dugme(yazi: "Süre", hedef: sure, ana: true)
        }
    }
}

private struct SayacYazi: View {
    let t: WidgetVeri.Zaman
    var body: some View {
        if t.paused == true {
            Text(String(format: "%d:%02d", (t.left ?? 0) / 60, (t.left ?? 0) % 60))
        } else {
            Text(t.bitis, style: .timer)
        }
    }
}

// MARK: Büyük widget'ın üstü: logo, rüzgâr başlığı

// Velora logosu: ortadaki beyaz ışığın çevresinde 24 ses çubuğu (src/components/ui/AppLogo.jsx RAYS ile aynı; Okyanus degradesi #0ea5c4→#a5f3fc)
private struct LogoCubuklari: Shape {
    func path(in rect: CGRect) -> Path {
        let boy: [CGFloat] = [60, 100, 140, 90, 120, 70, 150, 85]
        let o = rect.width / 760 // logo 760 birimlik kutuda, merkez 380
        let m = CGPoint(x: rect.midX, y: rect.midY)
        var p = Path()
        for i in 0..<24 {
            let a = CGFloat(i) * .pi / 12
            let (sn, cs) = (sin(a), -cos(a))
            p.move(to: CGPoint(x: m.x + sn * 200 * o, y: m.y + cs * 200 * o))
            p.addLine(to: CGPoint(x: m.x + sn * (200 + boy[i % 8]) * o, y: m.y + cs * (200 + boy[i % 8]) * o))
        }
        return p
    }
}

private struct Logo: View {
    var boy: CGFloat = 20
    var body: some View {
        ZStack {
            LogoCubuklari()
                .stroke(LinearGradient(colors: [vurguDugme, Color(red: 0.647, green: 0.953, blue: 0.988)], startPoint: .topLeading, endPoint: .bottomTrailing),
                        style: StrokeStyle(lineWidth: boy * 30 / 760, lineCap: .round))
            Circle().fill(.white).frame(width: boy * 128 / 760, height: boy * 128 / 760)
        }
        .frame(width: boy, height: boy)
    }
}

private struct MarkaSatiri: View {
    let now: Date
    var body: some View {
        HStack(spacing: 7) {
            Logo()
            Text("Velora").font(.system(size: 14, weight: .semibold))
            Spacer(minLength: 4)
            Text(gunBicim.string(from: now)).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
        }
    }
}

// Rüzgârın geldiği yön: K, KD, D, GD, G, GB, B, KB
private func yonAdi(_ d: Double) -> String {
    let adlar = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"]
    let i = Int(((d.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360) + 22.5) / 45) % 8
    return adlar[i]
}

// Büyük rakamla rüzgâr, sağda sağanak kutusu ve yön pusulası (ok grafikteki gibi rüzgârın estiği yöne bakar)
private struct RuzgarKafasi: View {
    let r: GunRuzgar
    let now: Date
    let yer: String
    var body: some View {
        let s = r.simdi(now)
        let d = r.yon(now)
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                (Text("\(s.wind)").font(.system(size: 42, weight: .bold).monospacedDigit()).kerning(-1.4)
                    + Text(" kn").font(.system(size: 15, weight: .semibold)).foregroundColor(wAcik))
                    .lineLimit(1)
                Etiket(yazi: "Rüzgâr · \(yer)\(r.bugun ? "" : " · Yarın")")
            }
            Spacer(minLength: 4)
            if s.gust > s.wind {
                VStack(alignment: .trailing, spacing: 1) {
                    Text("Sağanak").font(.system(size: 10, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
                    (Text("\(s.gust)").font(.system(size: 17, weight: .bold).monospacedDigit())
                        + Text(" kn").font(.system(size: 11, weight: .semibold)).foregroundColor(.white.opacity(0.6)))
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(wAcik.opacity(0.12)))
            }
            VStack(spacing: 2) {
                ZStack {
                    Circle().fill(wAcik.opacity(0.08))
                    Circle().stroke(wAcik.opacity(0.35), lineWidth: 1.5)
                    Image(systemName: "arrow.down")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundStyle(wAcik)
                        .rotationEffect(.degrees(d))
                }
                .frame(width: 40, height: 40)
                Text(yonAdi(d)).font(.system(size: 10, weight: .bold)).foregroundStyle(.white.opacity(0.75))
            }
        }
    }
}

// MARK: Bölümler (büyük widget ve tek başına widget'lar aynı parçaları kullanır)

private struct RuzgarBolumu: View {
    let e: VeloraGiris
    var buyuk = true
    var body: some View {
        if let r = e.r {
            let s = r.simdi(e.date)
            VStack(alignment: .leading, spacing: 4) {
                if buyuk {
                    RuzgarKafasi(r: r, now: e.date, yer: e.v?.place ?? "Dikili").padding(.bottom, 2)
                } else {
                    HStack(alignment: .firstTextBaseline) {
                        Etiket(yazi: "Rüzgâr · \(e.v?.place ?? "Dikili")\(r.bugun ? "" : " · Yarın")")
                        Spacer()
                        Sayi(deger: "\(s.wind)", ek: s.gust > s.wind ? "kn · \(s.gust)" : "kn", boy: 20)
                    }
                }
                RuzgarGrafik(g: r, now: e.date).frame(minHeight: 48, maxHeight: 80)
                RuzgarEtiket(g: r)
            }
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Etiket(yazi: "Rüzgâr")
                Bos(yazi: "Rüzgâr alınamadı")
            }
        }
    }
}

private struct AntrenmanBolumu: View {
    let e: VeloraGiris
    var body: some View {
        if let t = e.v?.sayac(e.date) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Etiket(yazi: t.title)
                    SayacYazi(t: t).font(.system(size: 28, weight: .bold).monospacedDigit())
                }
                Spacer()
                AntrenmanDugmeleri(sure: sayacURL, yoklama: yoklamaURL(e.v?.antrenman(e.date), e.date))
            }
        } else if let a = e.v?.antrenman(e.date) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    let ad = antrenmanAdi(a)
                    Etiket(yazi: gunAdi(a, e.date) == "Bugün" ? ad : "\(ad) · \(gunAdi(a, e.date))")
                    Sayi(deger: a.time.isEmpty ? gunAdi(a, e.date) : a.time, ek: a.place?.isEmpty == false ? a.place! : (ad == a.title ? "" : a.title), boy: 24)
                }
                Spacer()
                AntrenmanDugmeleri(sure: antrenmanURL(a), yoklama: yoklamaURL(a, e.date))
            }
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Etiket(yazi: "Antrenman")
                Bos(yazi: "Yakında antrenman yok")
            }
        }
    }
}

private struct ParaBolumu: View {
    let e: VeloraGiris
    var banka = true
    var aidat = true
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            if banka {
                Link(destination: url("/mail")) {
                    VStack(alignment: .leading, spacing: 4) {
                        Etiket(yazi: e.v?.money?.label ?? "Banka")
                        Sayi(deger: e.v?.money?.big ?? "–", boy: 20).privacySensitive()
                        if let s = e.v?.money?.sub, !s.isEmpty { Etiket(yazi: s).privacySensitive() }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            if aidat {
                Link(destination: url("/dues")) {
                    VStack(alignment: .leading, spacing: 4) {
                        Etiket(yazi: aidatAdi(e.date))
                        if let d = e.v?.dues {
                            Sayi(deger: "\(d.paid)/\(d.count)", boy: 20)
                            Cubuk(oran: Double(d.paid) / Double(max(1, d.count))).padding(.top, 3)
                        } else {
                            Sayi(deger: "–", boy: 20)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }
}

private struct PlanlarBolumu: View {
    let e: VeloraGiris
    var body: some View {
        let plans = e.v?.siradaki(e.date) ?? []
        Link(destination: url("/plans")) {
            VStack(alignment: .leading, spacing: 5) {
                Etiket(yazi: "Sıradaki")
                if plans.isEmpty { Bos(yazi: "Sırada plan yok") }
                ForEach(plans.prefix(2), id: \.self) { PlanSatiri(p: $0, now: e.date) }
            }
        }
    }
}

private struct KelimeBolumu: View {
    let e: VeloraGiris
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Etiket(yazi: e.v?.word?.study == true ? "Kelime · çalışıyorum" : "Kelime")
            if let w = e.v?.word {
                (Text(w.en).font(.system(size: 17, weight: .bold)) + Text("  \(w.tr)").font(.system(size: 13, weight: .semibold)).foregroundColor(wAcik))
                    .lineLimit(1)
            }
        }
    }
}

// MARK: Velora (büyük, bölümler seçilir)

private enum Bolum: Hashable {
    case ruzgar, antrenman, planlar, kelime, para
}

struct VeloraGorunum: View {
    let e: VeloraGiris
    private var liste: [Bolum] {
        let b = e.b
        var l: [Bolum] = []
        if b.ruzgar { l.append(.ruzgar) }
        if b.antrenman { l.append(.antrenman) }
        if b.planlar { l.append(.planlar) }
        if b.kelime { l.append(.kelime) }
        if b.banka || b.aidat { l.append(.para) }
        return l
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            MarkaSatiri(now: e.date).padding(.bottom, 10)
            if liste.isEmpty { Bos(yazi: "Edit Widget ile bölüm seç") }
            ForEach(Array(liste.enumerated()), id: \.element) { i, bolum in
                if i > 0 { Ayrac() }
                parca(bolum)
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func parca(_ b: Bolum) -> some View {
        switch b {
        case .ruzgar: Link(destination: url("/weather")) { RuzgarBolumu(e: e) }
        case .antrenman: AntrenmanBolumu(e: e)
        case .planlar: PlanlarBolumu(e: e)
        case .kelime: KelimeBolumu(e: e)
        case .para: ParaBolumu(e: e, banka: e.b.banka, aidat: e.b.aidat)
        }
    }
}

@available(iOS 17.0, *)
struct VeloraAyar: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Widget'ta ne olsun?"
    static var description = IntentDescription("Velora widget'ında görünen bölümler")

    @Parameter(title: "Rüzgâr grafiği", default: true) var ruzgar: Bool
    @Parameter(title: "Antrenman ve sayaç", default: true) var antrenman: Bool
    @Parameter(title: "Banka", default: true) var banka: Bool
    @Parameter(title: "Aidat", default: true) var aidat: Bool
    @Parameter(title: "Sıradaki planlar", default: false) var planlar: Bool
    @Parameter(title: "İngilizce kelime", default: false) var kelime: Bool

    var bolumler: Bolumler {
        Bolumler(ruzgar: ruzgar, antrenman: antrenman, banka: banka, aidat: aidat, planlar: planlar, kelime: kelime)
    }
}

@available(iOS 17.0, *)
struct VeloraAyarliSaglayici: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> VeloraGiris {
        VeloraGiris(date: Date(), v: .ornek, r: .ornek)
    }

    func snapshot(for c: VeloraAyar, in context: Context) async -> VeloraGiris {
        if context.isPreview { return VeloraGiris(date: Date(), v: .ornek, r: .ornek, b: c.bolumler) }
        var e = await VeloraSaglayici(ruzgar: c.ruzgar).giris(Date())
        e.b = c.bolumler
        return e
    }

    func timeline(for c: VeloraAyar, in context: Context) async -> Timeline<VeloraGiris> {
        var e = await VeloraSaglayici(ruzgar: c.ruzgar).giris(Date())
        e.b = c.bolumler
        return VeloraSaglayici.akis(e, ruzgar: c.ruzgar)
    }
}

@available(iOS 17.0, *)
struct VeloraBuyukWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "com.seyhunyildiz.sesliasistan.bugun", intent: VeloraAyar.self, provider: VeloraAyarliSaglayici()) { e in
            VeloraGorunum(e: e).modifier(Zemin()).widgetURL(url("/"))
        }
        .configurationDisplayName("Velora")
        .description("Rüzgâr, antrenman, banka ve aidat bir arada")
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
                    Text("Rüzgâr").font(.system(size: 12, weight: .semibold)).opacity(0.75)
                    Spacer()
                    Text(ruzgarYazi(e.r, e.date)).font(.system(size: 12, weight: .semibold).monospacedDigit())
                }
                if let r = e.r { RuzgarGrafik(g: r, now: e.date, mono: true) } else { Text("Alınamadı").font(.system(size: 12)) }
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 2)
        } else {
            RuzgarBolumu(e: e, buyuk: false)
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

// MARK: Antrenman (sayaç çalışırken canlı sayaç)

struct AntrenmanGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris
    var body: some View {
        let t = e.v?.sayac(e.date)
        let a = e.v?.antrenman(e.date)
        if family == .accessoryRectangular {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text(t?.title ?? a.map(antrenmanAdi) ?? "Antrenman").font(.system(size: 12, weight: .semibold)).opacity(0.75).lineLimit(1)
                    Spacer()
                    Text(t != nil ? "süre" : a.map { gunAdi($0, e.date).lowercased(with: Locale(identifier: "tr_TR")) } ?? "")
                        .font(.system(size: 12, weight: .semibold)).opacity(0.75)
                }
                if let t {
                    SayacYazi(t: t).font(.system(size: 24, weight: .bold).monospacedDigit())
                } else if let a {
                    Text(a.time.isEmpty ? gunAdi(a, e.date) : a.time).font(.system(size: 24, weight: .bold).monospacedDigit())
                    Text(kalanYazi(a, e.date)).font(.system(size: 12, weight: .semibold)).lineLimit(1)
                } else {
                    Text("Antrenman yok").font(.system(size: 13, weight: .semibold))
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
        } else {
            VStack(alignment: .leading) {
                Text(t?.title ?? a.map(antrenmanAdi) ?? "Antrenman").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                Spacer(minLength: 0)
                if let t {
                    SayacYazi(t: t).font(.system(size: 34, weight: .bold).monospacedDigit()).minimumScaleFactor(0.6)
                    Text(t.paused == true ? "durdu" : "sayaç").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.7))
                } else if let a {
                    Text(a.time.isEmpty ? gunAdi(a, e.date) : a.time).font(.system(size: 34, weight: .bold).monospacedDigit()).minimumScaleFactor(0.6)
                    Text([gunAdi(a, e.date) == "Bugün" ? "" : gunAdi(a, e.date), a.place ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                        .font(.system(size: 11, weight: .semibold)).foregroundStyle(soluk).lineLimit(1)
                } else {
                    Bos(yazi: "Yakında antrenman yok")
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct AntrenmanWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.antrenman", provider: VeloraSaglayici()) { e in
            AntrenmanGorunum(e: e)
                .modifier(Zemin(renk: e.v?.sayac(e.date) == nil ? wZemin : sayacZemin))
                .widgetURL(e.v?.sayac(e.date) != nil ? sayacURL : antrenmanURL(e.v?.antrenman(e.date)))
        }
        .configurationDisplayName("Antrenman")
        .description("Bugünkü antrenman; sayaç çalışırken canlı süre")
        .supportedFamilies([.systemSmall, .accessoryRectangular])
    }
}

// MARK: Banka ve aidat

struct ParaGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris
    var body: some View {
        let d = e.v?.dues
        if family == .accessoryRectangular {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text("Aidat").font(.system(size: 12, weight: .semibold)).opacity(0.75)
                    Spacer()
                    Text(d.map { "\($0.paid)/\($0.count)" } ?? "–").font(.system(size: 13, weight: .bold).monospacedDigit())
                }
                if let d { Cubuk(oran: Double(d.paid) / Double(max(1, d.count))) }
                Text(e.v?.money?.big ?? "").font(.system(size: 15, weight: .bold).monospacedDigit()).privacySensitive()
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Etiket(yazi: e.v?.money?.label ?? "Banka")
                Sayi(deger: e.v?.money?.big ?? "–", boy: 19).privacySensitive()
                Spacer(minLength: 0)
                Etiket(yazi: d.map { "Aidat \($0.paid)/\($0.count)" } ?? "Aidat")
                if let d { Cubuk(oran: Double(d.paid) / Double(max(1, d.count))) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct ParaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.para", provider: VeloraSaglayici()) { e in
            ParaGorunum(e: e).modifier(Zemin()).widgetURL(url("/mail"))
        }
        .configurationDisplayName("Banka ve aidat")
        .description("Banka (kilitliyken gizli) ve bu ayın aidatı")
        .supportedFamilies([.systemSmall, .accessoryRectangular])
    }
}

// MARK: Kelime

struct KelimeGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris
    var body: some View {
        if let w = e.v?.word {
            if family == .accessoryRectangular {
                // Kilit ekranında örnek cümle yok (sığmıyordu): kelime, türü, anlamı
                VStack(alignment: .leading, spacing: 1) {
                    (Text(w.en).font(.system(size: 17, weight: .bold)) + Text(w.type.map { "  \($0)" } ?? "").font(.system(size: 11, weight: .semibold)).foregroundColor(.white.opacity(0.75)))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text(w.tr).font(.system(size: 14, weight: .semibold)).opacity(0.9).lineLimit(2)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 4)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Etiket(yazi: w.study == true ? "Kelime · çalışıyorum" : "Kelime")
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        Text(w.en).font(.system(size: 24, weight: .bold)).lineLimit(1).minimumScaleFactor(0.6)
                        if let t = w.type { Etiket(yazi: t) }
                    }
                    Text(w.tr).font(.system(size: 14, weight: .semibold)).foregroundStyle(wAcik).lineLimit(1)
                    if let ex = w.ex { Text(ex).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.75)).lineLimit(2) }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
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
        let w = e.r.map { "\($0.simdi(e.date).wind) kn" } ?? ""
        if e.v?.sayac(e.date) != nil {
            Text(["Antrenman sürüyor", w].filter { !$0.isEmpty }.joined(separator: " · "))
        } else if let a = e.v?.antrenman(e.date), gunAdi(a, e.date) == "Bugün" {
            Text([a.time.isEmpty ? "Antrenman bugün" : "Antrenman \(a.time)", w].filter { !$0.isEmpty }.joined(separator: " · "))
        } else {
            Text(e.r == nil ? "Velora" : "Rüzgâr \(ruzgarYazi(e.r, e.date))")
        }
    }
}

struct OzetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.ozet", provider: VeloraSaglayici(ruzgar: true)) { e in
            OzetGorunum(e: e).modifier(Zemin()).widgetURL(e.v?.sayac(e.date) != nil ? sayacURL : antrenmanURL(e.v?.antrenman(e.date)))
        }
        .configurationDisplayName("Özet")
        .description("Antrenman saati ve rüzgâr")
        .supportedFamilies([.accessoryInline])
    }
}
