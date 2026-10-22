import AppIntents
import SwiftUI
import WidgetKit

// Denetim Merkezi, kilit ekranı ve Eylem tuşuna konabilen düğme: basınca Velora açılır, asistan dinler
@available(iOS 18.0, *)
struct BasKonusDugmesi: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: "com.seyhunyildiz.sesliasistan.baskonus") {
            ControlWidgetButton(action: BasKonusIntent()) {
                Label("Velora'ya söyle", systemImage: "mic.fill")
            }
        }
        .displayName("Velora'ya söyle")
        .description("Velora açılır ve asistan seni dinler.")
    }
}
