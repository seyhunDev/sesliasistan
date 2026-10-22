import SwiftUI
import WidgetKit

// Velora widget'larının ortak parçaları (veri sağlayıcı, zemin, plan satırı) ve "Sıradaki" widget'ı.
// Diğer widget'lar Widgetlar.swift'te, rüzgâr grafiği Ruzgar.swift'te. Veriyi uygulama yazar (WidgetVeri), dokununca
// velora://ac/<yol> ile uygulamada o sayfa açılır.

struct VeloraGiris: TimelineEntry {
    let date: Date
    let v: WidgetVeri?
    let r: GunRuzgar?
}

// ruzgar: grafiği olan widget'lar rüzgârı da alır (25 dk saklanır)
struct VeloraSaglayici: TimelineProvider {
    var ruzgar = false

    func placeholder(in context: Context) -> VeloraGiris {
        VeloraGiris(date: Date(), v: .ornek, r: ruzgar ? .ornek : nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (VeloraGiris) -> Void) {
        if context.isPreview { return completion(placeholder(in: context)) }
        Task { completion(await giris(Date())) }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VeloraGiris>) -> Void) {
        Task {
            let now = Date()
            let e = await giris(now)
            // 15 dakikada bir (grafikteki "şimdi" ilerler), sayaç bitince ve planlar geçince liste yenilenir
            var anlar: [Date] = (0..<4).map { now.addingTimeInterval(Double($0) * 900) }
            if let t = e.v?.timer, t.paused != true { anlar.append(t.bitis.addingTimeInterval(3601)) }
            anlar += (e.v?.plans ?? []).compactMap { WidgetVeri.baslangic($0)?.addingTimeInterval(3601) }
            let son = now.addingTimeInterval(3600)
            let entries = Set(anlar.filter { $0 >= now && $0 <= son }).sorted().map { VeloraGiris(date: $0, v: e.v, r: e.r) }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(ruzgar ? 1800 : 3600))))
        }
    }

    private func giris(_ now: Date) async -> VeloraGiris {
        let v = WidgetVeri.oku()
        let r = ruzgar ? await RuzgarKaynak.al(lat: v?.lat ?? 39.0717, lon: v?.lon ?? 26.8886) : nil
        return VeloraGiris(date: now, v: v, r: r)
    }
}

extension WidgetVeri {
    // Widget galerisindeki örnek
    static var ornek: WidgetVeri {
        let bugun = GunRuzgar.gun(Date())
        let yarin = GunRuzgar.gun(Date().addingTimeInterval(86400))
        return WidgetVeri(
            plans: [
                Plan(title: "Optimist antrenmanı", date: bugun, time: "", important: false),
                Plan(title: "Yarış kaydı son gün", date: yarin, time: "", important: true),
                Plan(title: "Kulüp toplantısı", date: yarin, time: "18:00", important: false),
            ],
            place: "Dikili", lat: nil, lon: nil, timer: nil, unread: 2,
            msgs: [Mesaj(from: "Ayşe", text: "Yarın gelemem"), Mesaj(from: "Mert", text: "Tamam hocam")],
            money: Para(big: "12.480 ₺", label: "Banka", sub: nil),
            dues: Aidat(paid: 9, count: 14),
            word: Kelime(en: "acknowledge", type: "fiil", tr: "kabul etmek, onaylamak", ex: "He acknowledged that he had made a mistake.", exTr: nil, study: true, day: 3)
        )
    }
}

let gunBicim: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.dateFormat = "EEE d MMM"
    return f
}()

// Planın sol sütunu: bugün saat, yarın "Yarın", sonra "Cum 24"
func planZamani(_ p: WidgetVeri.Plan, _ now: Date) -> String {
    guard let d = WidgetVeri.baslangic(p) else { return p.time }
    let cal = Calendar.current
    if cal.isDate(d, inSameDayAs: now) { return p.time.isEmpty ? "Bugün" : p.time }
    if let y = cal.date(byAdding: .day, value: 1, to: now), cal.isDate(d, inSameDayAs: y) { return "Yarın" }
    let f = DateFormatter()
    f.locale = Locale(identifier: "tr_TR")
    f.dateFormat = "EEE d"
    return f.string(from: d)
}

// İlk plana kalan süre: "40 dk", "3 sa", "2 gün"
func kalan(_ p: WidgetVeri.Plan, _ now: Date) -> String {
    guard let d = WidgetVeri.baslangic(p) else { return "" }
    let dk = Int(d.timeIntervalSince(now) / 60)
    if dk <= 0 { return p.time.isEmpty ? "bugün" : "şimdi" }
    if dk < 60 { return "\(dk) dk" }
    if dk < 24 * 60 { return "\(dk / 60) sa" }
    return "\(dk / 1440) gün"
}

struct PlanSatiri: View {
    let p: WidgetVeri.Plan
    let now: Date
    var body: some View {
        HStack(spacing: 7) {
            Circle().stroke(Color.white.opacity(0.45), lineWidth: 1.6).frame(width: 12, height: 12)
            Text(planZamani(p, now))
                .font(.system(size: 11, weight: .semibold).monospacedDigit())
                .foregroundStyle(.white.opacity(0.65))
                .frame(width: 38, alignment: .leading)
                .lineLimit(1)
            Text(p.title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(p.important == true ? wMor : Color.white)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
    }
}

// Başlık satırı: solda ad (+ soluk ek), sağda soluk değer
struct Baslik: View {
    let ad: String
    var ek: String = ""
    var sag: String = ""
    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            (Text(ad) + Text(ek.isEmpty ? "" : " · \(ek)").foregroundColor(.white.opacity(0.65)))
                .font(.system(size: 13, weight: .semibold))
                .lineLimit(1)
            Spacer(minLength: 4)
            Text(sag).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white.opacity(0.65)).lineLimit(1)
        }
    }
}

// Zemin: ana ekranda lacivert, kilit ekranında sistemin yarı saydam kutusu
struct Zemin: ViewModifier {
    @Environment(\.widgetFamily) var family
    func body(content: Content) -> some View {
        let kilit: Bool = [WidgetFamily.accessoryRectangular, .accessoryCircular, .accessoryInline].contains(family)
        if #available(iOS 17.0, *) {
            if kilit {
                content.containerBackground(for: .widget) { AccessoryWidgetBackground() }
            } else {
                content.foregroundStyle(.white).tint(.white).containerBackground(for: .widget) { wLacivert }
            }
        } else if kilit {
            content
        } else {
            content.foregroundStyle(.white).tint(.white).padding().background(wLacivert)
        }
    }
}

struct SiradakiGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: VeloraGiris

    var body: some View {
        let plans = e.v?.siradaki(e.date) ?? []
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Sıradaki").font(.system(size: 13, weight: .bold))
                    Spacer()
                    if let p = plans.first { Text(kalan(p, e.date)).font(.system(size: 12, weight: .semibold)).opacity(0.75) }
                }
                if plans.isEmpty { Text("Plan yok").font(.system(size: 13, weight: .semibold)) }
                ForEach(plans.prefix(3), id: \.self) { p in
                    (Text(planZamani(p, e.date) + " ").foregroundColor(.white.opacity(0.7)) + Text(p.title))
                        .font(.system(size: 13, weight: .semibold).monospacedDigit())
                        .lineLimit(1)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 4)
        case .systemSmall:
            VStack(alignment: .leading, spacing: 6) {
                Baslik(ad: "Sıradaki", sag: plans.first.map { kalan($0, e.date) } ?? "")
                if plans.isEmpty { Bos(yazi: "Sırada plan yok") }
                ForEach(plans.prefix(2), id: \.self) { p in
                    VStack(alignment: .leading, spacing: 1) {
                        Text(p.title).font(.system(size: 14, weight: .semibold)).foregroundStyle(p.important == true ? wMor : Color.white).lineLimit(2)
                        Text(planZamani(p, e.date)).font(.system(size: 12, weight: .semibold).monospacedDigit()).foregroundStyle(.white.opacity(0.65))
                    }
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: 7) {
                Baslik(ad: "Sıradaki", sag: gunBicim.string(from: e.date))
                if plans.isEmpty { Bos(yazi: "Sırada plan yok") }
                ForEach(plans.prefix(3), id: \.self) { PlanSatiri(p: $0, now: e.date) }
                Spacer(minLength: 0)
            }
        }
    }
}

struct Bos: View {
    let yazi: String
    var body: some View {
        Text(yazi).font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.65))
    }
}

struct SiradakiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.siradaki", provider: VeloraSaglayici()) { e in
            SiradakiGorunum(e: e)
                .modifier(Zemin())
                .widgetURL(URL(string: "velora://ac/plans"))
        }
        .configurationDisplayName("Sıradaki")
        .description("Sıradaki planların")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
