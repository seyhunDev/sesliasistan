import ActivityKit
import Foundation

// Kilit ekranı ve Dynamic Island'daki sayaç (Canlı Etkinlik). Uygulama başlatır ve günceller (VeloraPlugin.timerShow),
// görünüşü VeloraWidget/SayacEtkinligi.swift çizer. end: sayacın 0 anı; ondan sonra süre ileri akar ("Startan beri").
@available(iOS 16.1, *)
struct SayacAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var end: Date
        var paused: Bool
        var left: Int
        var title: String
    }
}
