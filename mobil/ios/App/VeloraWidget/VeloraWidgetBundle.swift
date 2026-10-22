import SwiftUI
import WidgetKit

// Uygulama dışı parçalar: widget'lar (Widgetlar.swift, SiradakiWidget.swift), kilit ekranındaki sayaç ve (iOS 18+) Denetim Merkezi / kilit ekranı "Velora'ya söyle" düğmesi
@main
struct VeloraWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 17.0, *) {
            VeloraBuyukWidget()
        }
        RuzgarWidget()
        AntrenmanWidget()
        ParaWidget()
        SiradakiWidget()
        KelimeWidget()
        OzetWidget()
        SayacEtkinligi()
        if #available(iOS 18.0, *) {
            BasKonusDugmesi()
        }
    }
}
