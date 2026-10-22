import Capacitor
import LocalAuthentication
import UIKit
import WidgetKit

// Titreşim, Face ID kilidi ve ana ekran widget'ının verisi (web: src/lib/haptic.js, src/features/ios/AppLock.jsx, IosBridge.jsx)
extension VeloraPlugin {
    // kind: light | medium | heavy | select | success | warning | error
    @objc func haptic(_ call: CAPPluginCall) {
        let kind = call.getString("kind", "light")
        DispatchQueue.main.async {
            switch kind {
            case "select": UISelectionFeedbackGenerator().selectionChanged()
            case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
            case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
            case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
            case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
            default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }
            call.resolve()
        }
    }

    // Telefonda Face ID / Touch ID var mı: "faceID" | "touchID" | "" (yoksa ya da kurulu değilse)
    @objc func biometry(_ call: CAPPluginCall) {
        let ctx = LAContext()
        var err: NSError?
        guard ctx.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &err) else { return call.resolve(["type": ""]) }
        call.resolve(["type": ctx.biometryType == .faceID ? "faceID" : ctx.biometryType == .touchID ? "touchID" : ""])
    }

    // Kilidi aç: Face ID, olmazsa telefonun şifresi
    @objc func unlock(_ call: CAPPluginCall) {
        let ctx = LAContext()
        ctx.localizedFallbackTitle = "Şifreyi gir"
        ctx.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: call.getString("reason", "Velora'yı aç")) { ok, _ in
            call.resolve(["ok": ok])
        }
    }

    // json: WidgetVeri (Ortak/WidgetVeri.swift); ortak uygulama grubuna yazılır, widget yenilenir
    @objc func widgetData(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else { return call.resolve(["ok": false]) }
        WidgetVeri.yaz(data)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve(["ok": true])
    }
}
