import SwiftUI
import WidgetKit

// Uygulama dışı parçalar: kilit ekranındaki sayaç ve (iOS 18+) Denetim Merkezi / kilit ekranı "Velora'ya söyle" düğmesi
@main
struct VeloraWidgetBundle: WidgetBundle {
    var body: some Widget {
        SayacEtkinligi()
        if #available(iOS 18.0, *) {
            BasKonusDugmesi()
        }
    }
}
