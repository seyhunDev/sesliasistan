import ActivityKit
import Capacitor
import CryptoKit
import Foundation
import SwiftUI
import UserNotifications
#if canImport(AlarmKit)
import AlarmKit
#endif

// iPhone'a özel işler (web: src/lib/nativeIos.js):
// - open olayı / takeOpen: bas-konuş ("talk") ya da kilit ekranındaki sayaca dokunuş ("timer")
// - timerShow / timerEnd: kilit ekranı ve Dynamic Island'da sayaç (iOS 16.2+)
// - alarmSync: planların alarmları; iOS 26'da saat alarmı (AlarmKit, sessiz modda da çalar), eski iOS'ta bildirim
// - haptic, biometry / unlock (Face ID kilidi), widgetData (ana ekran widget'ı): VeloraDokunus.swift
@objc(VeloraPlugin)
public class VeloraPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VeloraPlugin"
    public let jsName = "Velora"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takeOpen", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "timerShow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "timerEnd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "haptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "biometry", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "widgetData", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(bekleyen), name: Bekleyen.olay, object: nil)
    }

    // Sayfa dinliyorsa istek hemen iletilir; dinlemiyorsa (yükleniyor) takeOpen ile alınana kadar bekler
    @objc func bekleyen() {
        guard hasListeners("open") else { return }
        if let ne = Bekleyen.al() { notifyListeners("open", data: ["what": ne]) }
    }

    @objc func info(_ call: CAPPluginCall) {
        var alarm = false
        if #available(iOS 26.0, *) { alarm = SaatAlarmi.hazir }
        var live = false
        if #available(iOS 16.2, *) { live = ActivityAuthorizationInfo().areActivitiesEnabled }
        call.resolve(["alarm": alarm, "live": live, "ios": UIDevice.current.systemVersion])
    }

    @objc func takeOpen(_ call: CAPPluginCall) {
        call.resolve(["what": Bekleyen.al() ?? ""])
    }

    @objc func timerShow(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve(["ok": false]) }
        let state = SayacAttributes.ContentState(
            end: Date(timeIntervalSince1970: call.getDouble("end", 0) / 1000),
            paused: call.getBool("paused", false),
            left: max(0, call.getInt("left", 0)),
            title: call.getString("title", "Sayaç")
        )
        Task {
            let ok = await Sayac.goster(state)
            call.resolve(["ok": ok])
        }
    }

    @objc func timerEnd(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { return call.resolve() }
        Task {
            await Sayac.bitir()
            call.resolve()
        }
    }

    // items: [{ key, at (ms), title }]. Listede olmayan eski alarmlar silinir, yeniler kurulur.
    @objc func alarmSync(_ call: CAPPluginCall) {
        let now = Date()
        let items: [AlarmIstek] = (call.getArray("items") ?? []).compactMap { v in
            guard let o = v as? JSObject, let key = o["key"] as? String, let at = (o["at"] as? NSNumber)?.doubleValue else { return nil }
            let date = Date(timeIntervalSince1970: at / 1000)
            return date > now ? AlarmIstek(id: AlarmIstek.uuid(key), at: date, title: (o["title"] as? String) ?? "Velora") : nil
        }
        Task {
            var kind = "notification"
            var n = -1
            if #available(iOS 26.0, *), SaatAlarmi.hazir {
                kind = "alarm"
                n = await SaatAlarmi.esitle(items)
            } else {
                n = await BildirimAlarmi.esitle(items)
            }
            call.resolve(["kind": kind, "count": n])
        }
    }
}

struct AlarmIstek: Sendable {
    let id: UUID
    let at: Date
    let title: String

    // Aynı plan ve saat her eşitlemede aynı kimliği alır (kurulu alarm yeniden kurulmaz)
    static func uuid(_ key: String) -> UUID {
        var b = Array(SHA256.hash(data: Data(key.utf8)).prefix(16))
        b[6] = (b[6] & 0x0F) | 0x50
        b[8] = (b[8] & 0x3F) | 0x80
        return UUID(uuid: (b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15]))
    }
}

@available(iOS 16.2, *)
enum Sayac {
    static func goster(_ state: SayacAttributes.ContentState) async -> Bool {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
        let content = ActivityContent(state: state, staleDate: state.paused ? nil : state.end.addingTimeInterval(3600))
        let list = Activity<SayacAttributes>.activities
        if let first = list.first {
            for extra in list.dropFirst() { await extra.end(nil, dismissalPolicy: .immediate) }
            await first.update(content)
            return true
        }
        do {
            _ = try Activity.request(attributes: SayacAttributes(), content: content, pushType: nil)
            return true
        } catch {
            return false
        }
    }

    static func bitir() async {
        for a in Activity<SayacAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
    }
}

// iOS 26 öncesi: alarm saatinde sesli bildirim
enum BildirimAlarmi {
    static let onEk = "velora-alarm-"

    static func esitle(_ items: [AlarmIstek]) async -> Int {
        let c = UNUserNotificationCenter.current()
        let ok = (try? await c.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        guard ok else { return -1 }
        var want: [String: AlarmIstek] = [:]
        for it in items { want[onEk + it.id.uuidString] = it }
        let have = await c.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(onEk) }
        c.removePendingNotificationRequests(withIdentifiers: have.filter { want[$0] == nil })
        for (id, it) in want where !have.contains(id) {
            let ct = UNMutableNotificationContent()
            ct.title = it.title
            ct.body = "Alarm"
            ct.sound = .default
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: it.at)
            let req = UNNotificationRequest(identifier: id, content: ct, trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: false))
            try? await c.add(req)
        }
        return want.count
    }
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct VeloraAlarmBilgi: AlarmMetadata {}

@available(iOS 26.0, *)
enum SaatAlarmi {
    static var hazir: Bool { AlarmManager.shared.authorizationState != .denied }

    static func izin() async -> Bool {
        let m = AlarmManager.shared
        switch m.authorizationState {
        case .authorized: return true
        case .denied: return false
        default: return (try? await m.requestAuthorization()) == .authorized
        }
    }

    static func esitle(_ items: [AlarmIstek]) async -> Int {
        guard await izin() else { return -1 }
        let m = AlarmManager.shared
        var want: [UUID: AlarmIstek] = [:]
        for it in items { want[it.id] = it }
        let have = Set(((try? m.alarms) ?? []).map(\.id))
        for id in have where want[id] == nil { try? m.cancel(id: id) }
        for (id, it) in want where !have.contains(id) {
            let alert = AlarmPresentation.Alert(
                title: LocalizedStringResource(stringLiteral: it.title),
                stopButton: AlarmButton(text: "Kapat", textColor: .white, systemImageName: "stop.circle")
            )
            let attrs = AlarmAttributes<VeloraAlarmBilgi>(
                presentation: AlarmPresentation(alert: alert),
                metadata: nil,
                tintColor: Color(red: 0.357, green: 0.31, blue: 0.839)
            )
            _ = try? await m.schedule(id: id, configuration: .alarm(schedule: .fixed(it.at), attributes: attrs))
        }
        return want.count
    }
}
#else
@available(iOS 26.0, *)
enum SaatAlarmi {
    static var hazir: Bool { false }
    static func esitle(_ items: [AlarmIstek]) async -> Int { -1 }
}
#endif
