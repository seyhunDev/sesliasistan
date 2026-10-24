import SwiftUI
import WatchKit

// Okyanus renkleri (widget'lardaki gibi), siyah saat zemini
let vurgu = Color(red: 0.055, green: 0.647, blue: 0.769) // #0ea5c4
let acik = Color(red: 0.404, green: 0.91, blue: 0.976) // #67e8f9
let yesil = Color(red: 0.29, green: 0.87, blue: 0.5)
let koyu = Color(white: 0.17)

struct Soru: Hashable, Identifiable {
    let id: String
    let metin: String
}

private func dokun() {
    WKInterfaceDevice.current().play(.click)
}

// 1 · Ana ekran: logoya dokun, saatin dikte ekranında söyle. Altta sayaç (çalışıyorsa adı ve süresi), dokununca Süre.
struct AnaEkran: View {
    @EnvironmentObject var b: Baglanti
    @State private var soru: Soru?

    var body: some View {
        VStack(spacing: 6) {
            TextFieldLink(prompt: Text("Ne yapayım?")) {
                VStack(spacing: 4) {
                    LogoKure().frame(width: 92, height: 92)
                    Text("Konuş").font(.system(size: 17, weight: .semibold)).foregroundStyle(.white)
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
            } onSubmit: { metin in
                let m = metin.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !m.isEmpty else { return }
                soru = Soru(id: b.sor(m), metin: m)
            }
            .buttonStyle(.plain)
            Spacer(minLength: 0)
            NavigationLink {
                SureEkrani()
            } label: {
                SayacSeridi(s: b.sayac)
            }
            .buttonStyle(.plain)
        }
        .navigationTitle("Velora")
        .navigationDestination(item: $soru) { s in
            CevapEkrani(ilk: s)
        }
    }
}

private struct SayacSeridi: View {
    let s: SaatSayac?
    var body: some View {
        HStack {
            if let s, s.state != "idle" {
                Text(s.title).lineLimit(1)
                Spacer(minLength: 4)
                TimelineView(.periodic(from: .now, by: 1)) { c in
                    Text(sureYazi(s, c.date)).font(.system(size: 20, weight: .bold).monospacedDigit())
                }
            } else {
                Text("Süre")
                Spacer(minLength: 4)
                Image(systemName: "chevron.right").font(.system(size: 14, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
            }
        }
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(Capsule().fill(s != nil && s?.state != "idle" ? AnyShapeStyle(LinearGradient(colors: [Color(red: 0.043, green: 0.498, blue: 0.6), vurgu], startPoint: .leading, endPoint: .trailing)) : AnyShapeStyle(koyu)))
    }
}

// 2 · Cevap: söylenen, asistanın cevabı, Kaydedildi. Cevap soruysa (silme, para onayı) "Cevapla" ile devam edilir.
struct CevapEkrani: View {
    @EnvironmentObject var b: Baglanti
    @Environment(\.dismiss) private var kapat
    @State private var soru: Soru

    init(ilk: Soru) {
        _soru = State(initialValue: ilk)
    }

    var body: some View {
        let c = b.cevaplar[soru.id]
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("“\(soru.metin)”").font(.system(size: 15, weight: .medium)).foregroundStyle(.white.opacity(0.6))
                if let c {
                    Text(c.metin ?? "").font(.system(size: 18, weight: .semibold)).foregroundStyle(c.hata == true ? .white.opacity(0.8) : .white)
                    if c.kaydedildi == true {
                        Label("Kaydedildi", systemImage: "checkmark").font(.system(size: 15, weight: .semibold)).foregroundStyle(yesil)
                    }
                    HStack(spacing: 6) {
                        if c.soru == true {
                            TextFieldLink(prompt: Text("Cevabın")) {
                                Text("Cevapla").frame(maxWidth: .infinity)
                            } onSubmit: { metin in
                                yeni(metin)
                            }
                            .buttonStyle(Hap(dolu: true))
                        } else {
                            if c.kaydedildi == true {
                                Button("Geri al") { yeni("son kaydı geri al") }.buttonStyle(Hap(dolu: false))
                            }
                            Button("Tamam") { kapat() }.buttonStyle(Hap(dolu: true))
                        }
                    }
                    .padding(.top, 6)
                } else {
                    HStack(spacing: 8) {
                        ProgressView().frame(width: 22)
                        Text("Telefonda çalışıyor…").font(.system(size: 15, weight: .semibold)).foregroundStyle(.white.opacity(0.7))
                    }
                    .padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Velora")
        .onChange(of: c) { _, yeni in
            if let yeni { WKInterfaceDevice.current().play(yeni.hata == true ? .failure : .success) }
        }
    }

    private func yeni(_ metin: String) {
        let m = metin.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !m.isEmpty else { return }
        dokun()
        soru = Soru(id: b.sor(m), metin: m)
    }
}

// 3 · 4 · Süre: telefondaki tek sayaç. Başlamadan 2/5/10 dk ve Başlat; çalışırken start sırası, −1 / Durdur / +1; durunca Bitir / Devam;
// sıfırdan sonra ileri sayar, Bitir. Yarışa bağlı sayaç yalnız görünür (telefondan yönetilir).
struct SureEkrani: View {
    @EnvironmentObject var b: Baglanti
    @State private var secim = 5

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { c in
            icerik(c.date)
        }
        .navigationTitle("Süre")
        .onAppear {
            if let d = b.sayac?.dur, [2, 5, 10].contains(d / 60) { secim = d / 60 }
        }
    }

    @ViewBuilder
    private func icerik(_ now: Date) -> some View {
        let s = b.sayac
        let durum = s?.state ?? "idle"
        let up = durum == "run" && s.map { $0.bitis <= now } == true
        VStack(spacing: 4) {
            Text(baslik(s, durum, up)).font(.system(size: 14, weight: .semibold)).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
            Text(durum == "idle" ? "\(secim):00" : sureYazi(s!, now))
                .font(.system(size: up ? 46 : 54, weight: .bold).monospacedDigit())
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            if durum == "idle" {
                HStack(spacing: 12) {
                    ForEach([2, 5, 10], id: \.self) { d in
                        Button("\(d) dk") {
                            dokun()
                            secim = d
                        }
                        .buttonStyle(.plain)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(secim == d ? acik : .white.opacity(0.6))
                    }
                }
            } else if let s, !s.steps.isEmpty, !up {
                Adimlar(steps: s.steps, kalan: durum == "pause" ? Double(s.left) : s.bitis.timeIntervalSince(now), akiyor: durum == "run")
            }
            if !b.uyari.isEmpty {
                Text(b.uyari).font(.system(size: 13, weight: .semibold)).foregroundStyle(.white.opacity(0.7)).multilineTextAlignment(.center)
            }
            Spacer(minLength: 2)
            dugmeler(s, durum, up)
        }
    }

    private func baslik(_ s: SaatSayac?, _ durum: String, _ up: Bool) -> String {
        if durum == "idle" { return s?.label.isEmpty == false ? s!.label : "Antrenman" }
        if up { return "Startan beri" }
        if durum == "pause" { return "Durdu" }
        return s?.title ?? ""
    }

    @ViewBuilder
    private func dugmeler(_ s: SaatSayac?, _ durum: String, _ up: Bool) -> some View {
        if s?.lock == true {
            Text("Telefondan yönet").font(.system(size: 14, weight: .semibold)).foregroundStyle(.white.opacity(0.6))
        } else if durum == "idle" {
            Button("Başlat") { is_("start", sn: secim * 60) }.buttonStyle(Hap(dolu: true))
        } else if up {
            Button("Bitir") { is_("finish") }.buttonStyle(Hap(dolu: true))
        } else if durum == "pause" {
            HStack(spacing: 6) {
                Button("Bitir") { is_("finish") }.buttonStyle(Hap(dolu: false))
                Button("Devam") { is_("resume") }.buttonStyle(Hap(dolu: true))
            }
        } else {
            HStack(spacing: 6) {
                Button("−1") { is_("add", sn: -60) }.buttonStyle(Hap(dolu: false)).frame(width: 46)
                Button("Durdur") { is_("pause") }.buttonStyle(Hap(dolu: true))
                Button("+1") { is_("add", sn: 60) }.buttonStyle(Hap(dolu: false)).frame(width: 46)
            }
        }
    }

    private func is_(_ ne: String, sn: Int = 0) {
        dokun()
        b.sayacIs(ne, sn: sn)
    }
}

// Start sırası (5 4 1 0): telefondaki gibi son geçilen işaret vurgulu
private struct Adimlar: View {
    let steps: [Int]
    let kalan: Double
    let akiyor: Bool
    var body: some View {
        let gecen = steps.lastIndex { kalan <= Double($0 * 60) }
        HStack(spacing: 12) {
            ForEach(Array(steps.enumerated()), id: \.offset) { x in
                Text("\(x.element)").font(.system(size: 15, weight: .semibold).monospacedDigit())
                    .foregroundStyle(akiyor && x.offset == gecen ? acik : .white.opacity(0.55))
            }
        }
    }
}

// Kalan süre "4:12"; sıfırdan sonra "+0:08"; durmuşsa kalan
func sureYazi(_ s: SaatSayac, _ now: Date) -> String {
    if s.state == "pause" { return dkSn(s.left) }
    let fark = s.bitis.timeIntervalSince(now)
    return fark > 0 ? dkSn(Int(fark.rounded(.up))) : "+" + dkSn(min(3599, Int(-fark)))
}

private func dkSn(_ sn: Int) -> String {
    String(format: "%d:%02d", sn / 60, sn % 60)
}

// Dolu (vurgu) ya da koyu yuvarlak düğme, basınca içeri
struct Hap: ButtonStyle {
    let dolu: Bool
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 17, weight: .semibold))
            .foregroundStyle(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(Capsule().fill(dolu ? vurgu : koyu))
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}

// Logo "Ses halkası" (widget'taki Logo): 24 çubuk, ortada beyaz nokta; koyu lacivert kürenin içinde
private struct LogoCubuklari: Shape {
    func path(in rect: CGRect) -> Path {
        let boy: [CGFloat] = [60, 100, 140, 90, 120, 70, 150, 85]
        let o = rect.width / 760
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

struct LogoKure: View {
    var body: some View {
        GeometryReader { g in
            let w = min(g.size.width, g.size.height)
            ZStack {
                Circle().fill(RadialGradient(colors: [Color(red: 0.078, green: 0.22, blue: 0.353), Color(red: 0.043, green: 0.11, blue: 0.2)], center: .center, startRadius: 0, endRadius: w / 2))
                Circle().stroke(Color(red: 0.12, green: 0.3, blue: 0.42), lineWidth: 1.5)
                LogoCubuklari()
                    .stroke(LinearGradient(colors: [vurgu, Color(red: 0.647, green: 0.953, blue: 0.988)], startPoint: .topLeading, endPoint: .bottomTrailing),
                            style: StrokeStyle(lineWidth: w * 0.78 * 30 / 760, lineCap: .round))
                    .frame(width: w * 0.78, height: w * 0.78)
                Circle().fill(.white).frame(width: w * 0.78 * 128 / 760, height: w * 0.78 * 128 / 760)
            }
            .frame(width: w, height: w)
        }
    }
}
