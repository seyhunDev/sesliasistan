import SwiftUI
import WidgetKit

// Widget'ların rüzgâr grafiği: ana sayfadaki grafiğin aynısı (src/features/home/CockpitWind.jsx). Dolu mor alan rüzgâr, açık mor alan ve
// kesik çizgi sağanak; üstte 2 saatte bir yön oku (rüzgârın estiği yöne bakar, 17 kn ve üstü turuncu), altında 3 saatte bir saat, sıcaklık,
// "rüzgâr–sağanak" kn. Kırmızı çizgi ve nokta şimdi ("şimdi" yazısıyla). Saatler 06–23; saat 23'ten sonra yarının günü gösterilir.
// Veri open-meteo'dan (uygulamanın hava sayfasıyla aynı kaynak, knot); 25 dakika uygulama grubunda saklanır, her widget yeniden çekmez.

let wLacivert = Color(red: 0.137, green: 0.145, blue: 0.369) // --deep #23255e
let wMor = Color(red: 0.69, green: 0.66, blue: 1.0) // lacivert üstünde okunan açık mor
private let alanMor = Color(red: 0.655, green: 0.545, blue: 0.98) // #a78bfa
private let saganakMor = Color(red: 0.769, green: 0.71, blue: 0.992) // #c4b5fd
private let turuncu = Color(red: 0.957, green: 0.651, blue: 0.29) // #f4a64a
private let kirmizi = Color(red: 1.0, green: 0.42, blue: 0.42) // #ff6b6b

struct RSaat: Codable, Hashable {
    var hh: Int
    var wind: Int
    var gust: Int
    var dir: Double
    var t: Int
}

struct GunRuzgar: Codable, Hashable {
    var date: String // YYYY-MM-DD
    var hours: [RSaat] // 06…21
    var at: Double
    var lat: Double
    var lon: Double

    var bugun: Bool { date == GunRuzgar.gun(Date()) }

    // Şimdiki rüzgâr ve sağanak (saatler arası ara değer); bugün değilse ilk saat
    func simdi(_ now: Date = Date()) -> (wind: Int, gust: Int) {
        guard let k = konum(now) else { return (hours.first?.wind ?? 0, hours.first?.gust ?? 0) }
        let i = min(hours.count - 1, Int(k))
        let j = min(hours.count - 1, i + 1)
        let f = k - Double(i)
        let w = Double(hours[i].wind) + Double(hours[j].wind - hours[i].wind) * f
        let g = Double(hours[i].gust) + Double(hours[j].gust - hours[i].gust) * f
        return (Int(w.rounded()), Int(g.rounded()))
    }

    // Şimdinin grafikteki yeri (0 = ilk saat); gün dışındaysa nil
    func konum(_ now: Date = Date()) -> Double? {
        guard bugun, let ilk = hours.first?.hh else { return nil }
        let c = Calendar.current.dateComponents([.hour, .minute], from: now)
        let k = Double((c.hour ?? 0) - ilk) + Double(c.minute ?? 0) / 60
        return k >= 0 && k <= Double(hours.count - 1) ? k : nil
    }

    static func gun(_ d: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: d)
    }

    // Widget galerisindeki örnek
    static let ornek: GunRuzgar = {
        let w = [5, 6, 7, 9, 11, 12, 13, 15, 17, 18, 17, 15, 12, 10, 8, 7]
        let g = [8, 9, 11, 13, 16, 18, 19, 21, 24, 25, 23, 21, 17, 14, 12, 10]
        let d: [Double] = [20, 25, 30, 30, 300, 290, 280, 280, 275, 270, 270, 280, 300, 320, 340, 10]
        let t = [14, 15, 17, 19, 21, 22, 23, 24, 24, 23, 22, 21, 19, 18, 17, 16]
        let hours = (0..<16).map { i in RSaat(hh: 6 + i, wind: w[i], gust: g[i], dir: d[i], t: t[i]) }
        return GunRuzgar(date: GunRuzgar.gun(Date()), hours: hours, at: 0, lat: 0, lon: 0)
    }()
}

enum RuzgarKaynak {
    private static let anahtar = "ruzgarOnbellek"

    static func al(lat: Double, lon: Double) async -> GunRuzgar? {
        let now = Date()
        let saat = Calendar.current.component(.hour, from: now)
        let gun = GunRuzgar.gun(saat >= 23 ? now.addingTimeInterval(86400) : now)
        let ud = UserDefaults(suiteName: WidgetVeri.grup)
        let eski = ud?.data(forKey: anahtar).flatMap { try? JSONDecoder().decode(GunRuzgar.self, from: $0) }
        if let e = eski, e.date == gun, abs(e.lat - lat) < 0.01, abs(e.lon - lon) < 0.01, now.timeIntervalSince1970 - e.at < 25 * 60 {
            return e
        }
        if let yeni = await cek(lat: lat, lon: lon, gun: gun) {
            if let d = try? JSONEncoder().encode(yeni) { ud?.set(d, forKey: anahtar) }
            return yeni
        }
        return eski?.date == gun ? eski : nil
    }

    private static func cek(lat: Double, lon: Double, gun: String) async -> GunRuzgar? {
        var c = URLComponents(string: "https://api.open-meteo.com/v1/forecast")!
        c.queryItems = [
            URLQueryItem(name: "latitude", value: String(lat)),
            URLQueryItem(name: "longitude", value: String(lon)),
            URLQueryItem(name: "timezone", value: TimeZone.current.identifier),
            URLQueryItem(name: "wind_speed_unit", value: "kn"),
            URLQueryItem(name: "forecast_days", value: "2"),
            URLQueryItem(name: "hourly", value: "temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m"),
        ]
        guard let url = c.url,
              let res = try? await URLSession.shared.data(from: url),
              let j = try? JSONSerialization.jsonObject(with: res.0) as? [String: Any],
              let h = j["hourly"] as? [String: Any],
              let time = h["time"] as? [String],
              let ws = h["wind_speed_10m"] as? [Any],
              let gs = h["wind_gusts_10m"] as? [Any],
              let ds = h["wind_direction_10m"] as? [Any],
              let ts = h["temperature_2m"] as? [Any] else { return nil }
        let sayi = { (a: [Any], i: Int) -> Double in i < a.count ? (a[i] as? NSNumber)?.doubleValue ?? 0 : 0 }
        var hours: [RSaat] = []
        for (i, t) in time.enumerated() where t.hasPrefix(gun) {
            guard let hh = Int(t.dropFirst(11).prefix(2)), (6...23).contains(hh) else { continue }
            let w = Int(sayi(ws, i).rounded())
            hours.append(RSaat(hh: hh, wind: w, gust: max(w, Int(sayi(gs, i).rounded())), dir: sayi(ds, i), t: Int(sayi(ts, i).rounded())))
        }
        guard hours.count > 1 else { return nil }
        return GunRuzgar(date: gun, hours: hours, at: Date().timeIntervalSince1970, lat: lat, lon: lon)
    }
}

// Grafik. mono: kilit ekranı (tek renk, ok ve ölçek yok)
struct RuzgarGrafik: View {
    let g: GunRuzgar
    let now: Date
    var mono = false

    private var ust: Double {
        let m = Double(g.hours.map(\.gust).max() ?? 0)
        return max(15, ((m + 2) / 5).rounded(.up) * 5)
    }

    var body: some View {
        GeometryReader { geo in
            let c = Cizim(n: g.hours.count, ust: ust, w: geo.size.width, h: geo.size.height, top: mono ? 2 : 14, sag: mono ? 2 : 14)
            ZStack(alignment: .topLeading) {
                if !mono {
                    ForEach([10, 20, 30].filter { Double($0) < ust }, id: \.self) { v in
                        Path { p in
                            p.move(to: CGPoint(x: 0, y: c.y(Double(v))))
                            p.addLine(to: CGPoint(x: c.w - c.sag, y: c.y(Double(v))))
                        }
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        Text("\(v)").font(.system(size: 7, weight: .medium)).foregroundStyle(.white.opacity(0.5))
                            .position(x: c.w - 5, y: c.y(Double(v)))
                    }
                    ForEach(Array(g.hours.enumerated()).filter { $0.offset % 2 == 0 }, id: \.offset) { i, s in
                        Image(systemName: "arrow.down")
                            .font(.system(size: 8, weight: .heavy))
                            .rotationEffect(.degrees(s.dir))
                            .foregroundStyle(s.wind >= 17 ? turuncu : Color.white)
                            .position(x: c.x(Double(i)), y: 6)
                    }
                }
                c.alan(g.hours.map { Double($0.gust) }).fill((mono ? Color.white : alanMor).opacity(mono ? 0.3 : 0.26))
                c.alan(g.hours.map { Double($0.wind) }).fill((mono ? Color.white : alanMor).opacity(mono ? 0.85 : 0.92))
                if !mono {
                    c.cizgi(g.hours.map { Double($0.gust) }).stroke(saganakMor, style: StrokeStyle(lineWidth: 1.2, dash: [3, 3]))
                }
                if let k = g.konum(now) {
                    let v = Double(g.simdi(now).wind)
                    Path { p in
                        p.move(to: CGPoint(x: c.x(k), y: c.top - 4))
                        p.addLine(to: CGPoint(x: c.x(k), y: c.y(0)))
                    }
                    .stroke(mono ? Color.white : kirmizi, lineWidth: mono ? 1.2 : 1.6)
                    if !mono {
                        Circle().fill(kirmizi.opacity(0.35)).frame(width: 16, height: 16).position(x: c.x(k), y: c.y(v))
                    }
                    Circle().fill(mono ? Color.white : kirmizi).frame(width: mono ? 7 : 9, height: mono ? 7 : 9)
                        .overlay(Circle().stroke(mono ? Color.black.opacity(0.5) : wLacivert, lineWidth: 1.5))
                        .position(x: c.x(k), y: c.y(v))
                }
            }
        }
    }
}

// 3 saatte bir: saat, sıcaklık, rüzgâr–sağanak (grafikteki saatin tam altında)
struct RuzgarEtiket: View {
    let g: GunRuzgar
    var body: some View {
        GeometryReader { geo in
            let c = Cizim(n: g.hours.count, ust: 1, w: geo.size.width, h: 1, top: 0, sag: 14)
            ForEach(Array(g.hours.enumerated()).filter { $0.element.hh % 3 == 0 }, id: \.offset) { i, s in
                VStack(spacing: 1) {
                    Text(String(format: "%02d", s.hh)).foregroundStyle(.white.opacity(0.55))
                    Text("\(s.t)°")
                    (Text("\(s.wind)").fontWeight(.bold) + Text(s.gust > s.wind ? "–\(s.gust)" : "").foregroundColor(.white.opacity(0.55)))
                }
                .font(.system(size: 9, weight: .semibold).monospacedDigit())
                .fixedSize()
                .position(x: min(max(c.x(Double(i)), 12), c.w - 12), y: 17)
            }
        }
        .frame(height: 34)
    }
}

private struct Cizim {
    let n: Int
    let ust: Double
    let w: CGFloat
    let h: CGFloat
    let top: CGFloat
    let sag: CGFloat

    func x(_ i: Double) -> CGFloat { CGFloat(i) * (w - sag) / CGFloat(max(1, n - 1)) }
    func y(_ v: Double) -> CGFloat { top + CGFloat(1 - v / ust) * (h - top - 1) }

    func cizgi(_ d: [Double]) -> Path {
        Path { p in
            for (i, v) in d.enumerated() {
                let pt = CGPoint(x: x(Double(i)), y: y(v))
                if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
            }
        }
    }

    func alan(_ d: [Double]) -> Path {
        var p = cizgi(d)
        p.addLine(to: CGPoint(x: x(Double(d.count - 1)), y: y(0)))
        p.addLine(to: CGPoint(x: 0, y: y(0)))
        p.closeSubpath()
        return p
    }
}
