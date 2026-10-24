import SwiftUI

// Velora Apple Watch uygulaması (Seyhun 2026-10-24, örnek iphone/saat-ornek.png): logoya dokunup konuşarak asistana iş yaptırmak
// ve telefondaki tek sayacı yönetmek. İşi telefondaki uygulama yapar (Baglanti.swift → VeloraSaatKoprusu.swift → WatchBridge.jsx).
@main
struct VeloraSaatApp: App {
    @StateObject private var baglanti = Baglanti.shared

    init() {
        Baglanti.shared.baslat()
    }

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                AnaEkran()
            }
            .environmentObject(baglanti)
            .tint(acik)
        }
    }
}
