import SwiftUI
import WidgetKit

// Ana ekran ve kilit ekranı widget'ı: rüzgâr (şimdi) + sıradaki planlar. Dokununca Velora açılır.
// Planlar uygulamadan gelir (WidgetVeri), rüzgâr open-meteo'dan (uygulamanın hava sayfasıyla aynı kaynak, knot).

private let lacivert = Color(red: 0.137, green: 0.145, blue: 0.369) // --deep #23255e
private let mor = Color(red: 0.69, green: 0.66, blue: 1.0) // lacivert üstünde okunan açık mor

struct Ruzgar: Hashable {
    var kn: Int
    var gust: Int
    var dir: Double
}

struct SiradakiGiris: TimelineEntry {
    let date: Date
    let plans: [WidgetVeri.Plan]
    let place: String
    let wind: Ruzgar?
}

struct SiradakiSaglayici: TimelineProvider {
    func placeholder(in context: Context) -> SiradakiGiris {
        SiradakiGiris(date: Date(), plans: [WidgetVeri.Plan(title: "Antrenman", date: "", time: "10:00", important: false)], place: "Dikili", wind: Ruzgar(kn: 12, gust: 18, dir: 0))
    }

    func getSnapshot(in context: Context, completion: @escaping (SiradakiGiris) -> Void) {
        let v = WidgetVeri.oku()
        completion(SiradakiGiris(date: Date(), plans: v?.siradaki() ?? placeholder(in: context).plans, place: v?.place ?? "Dikili", wind: Ruzgar(kn: 12, gust: 18, dir: 0)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SiradakiGiris>) -> Void) {
        let v = WidgetVeri.oku()
        ruzgarAl(lat: v?.lat ?? 39.0717, lon: v?.lon ?? 26.8886) { wind in
            let now = Date()
            // Şimdi + sıradaki planların başlangıç anları (liste kendiliğinden ilerler); 30 dk sonra rüzgâr yenilenir
            let anlar = [now] + (v?.plans ?? []).compactMap { WidgetVeri.baslangic($0)?.addingTimeInterval(3600) }.filter { $0 > now && $0 < now.addingTimeInterval(1800) }
            let entries = anlar.sorted().map { d in
                SiradakiGiris(date: d, plans: v?.siradaki(d) ?? [], place: v?.place ?? "Dikili", wind: wind)
            }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(1800))))
        }
    }

    private func ruzgarAl(lat: Double, lon: Double, done: @escaping (Ruzgar?) -> Void) {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude", value: String(lat)),
            URLQueryItem(name: "longitude", value: String(lon)),
            URLQueryItem(name: "current", value: "wind_speed_10m,wind_direction_10m,wind_gusts_10m"),
            URLQueryItem(name: "wind_speed_unit", value: "kn"),
        ]
        guard let url = c.url else { return done(nil) }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data,
                  let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let cur = j["current"] as? [String: Any],
                  let kn = cur["wind_speed_10m"] as? Double else { return done(nil) }
            done(Ruzgar(kn: Int(kn.rounded()), gust: Int(((cur["wind_gusts_10m"] as? Double) ?? kn).rounded()), dir: (cur["wind_direction_10m"] as? Double) ?? 0))
        }.resume()
    }
}

// "Bugün 10:00", "Yarın", "Cum 24 Eki 18:00"
private func ne(_ p: WidgetVeri.Plan) -> String {
    guard let d = WidgetVeri.baslangic(p) else { return p.time }
    let cal = Calendar.current
    let gun: String
    if cal.isDateInToday(d) { gun = "Bugün" } else if cal.isDateInTomorrow(d) { gun = "Yarın" } else {
        let f = DateFormatter()
        f.locale = Locale(identifier: "tr_TR")
        f.dateFormat = "EEE d MMM"
        gun = f.string(from: d)
    }
    return p.time.isEmpty ? gun : "\(gun) \(p.time)"
}

private struct RuzgarSatiri: View {
    let wind: Ruzgar?
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "arrow.down")
                .font(.system(size: 13, weight: .bold))
                .rotationEffect(.degrees(wind?.dir ?? 0))
                .foregroundStyle(mor)
            Text(wind.map { "\($0.kn)" } ?? "–").font(.system(size: 22, weight: .semibold).monospacedDigit())
            Text(wind.map { "kn · \($0.gust)" } ?? "kn").font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.65))
        }
    }
}

private struct PlanSatiri: View {
    let p: WidgetVeri.Plan
    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(p.title).font(.system(size: 14, weight: .semibold)).lineLimit(1)
            Text(ne(p)).font(.system(size: 12, weight: .medium)).foregroundStyle(p.important == true ? mor : .white.opacity(0.65)).lineLimit(1)
        }
    }
}

struct SiradakiGorunum: View {
    @Environment(\.widgetFamily) var family
    let e: SiradakiGiris

    var body: some View {
        switch family {
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                if let p = e.plans.first {
                    Text(p.title).font(.headline).lineLimit(1)
                    Text(ne(p)).font(.caption).lineLimit(1)
                } else {
                    Text("Plan yok").font(.headline)
                }
                if let w = e.wind { Text("Rüzgâr \(w.kn) kn · \(w.gust)").font(.caption).lineLimit(1) }
            }
        case .systemMedium:
            HStack(alignment: .top, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(e.place).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                    RuzgarSatiri(wind: e.wind)
                    Spacer(minLength: 0)
                }
                .frame(width: 96, alignment: .leading)
                VStack(alignment: .leading, spacing: 8) {
                    if e.plans.isEmpty { Text("Sırada plan yok").font(.system(size: 14, weight: .medium)).foregroundStyle(.white.opacity(0.65)) }
                    ForEach(e.plans.prefix(3), id: \.self) { PlanSatiri(p: $0) }
                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        default:
            VStack(alignment: .leading, spacing: 8) {
                RuzgarSatiri(wind: e.wind)
                Spacer(minLength: 0)
                if let p = e.plans.first { PlanSatiri(p: p) } else {
                    Text("Sırada plan yok").font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.65))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct Zemin: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { lacivert }
        } else {
            content.padding().background(lacivert)
        }
    }
}

struct SiradakiWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "com.seyhunyildiz.sesliasistan.siradaki", provider: SiradakiSaglayici()) { e in
            SiradakiGorunum(e: e)
                .foregroundStyle(.white)
                .modifier(Zemin())
        }
        .configurationDisplayName("Velora")
        .description("Rüzgâr ve sıradaki planlar")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}
